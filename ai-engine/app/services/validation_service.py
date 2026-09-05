import os
import uuid
import time
import logging
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.validation import Validation, ValidationInput, ValidationAttachment
from app.repositories.validation_repository import ValidationRepository
from app.schemas.validation import ValidationCreateRequest, ValidationEventType, ValidationStatus
from app.services.prompt_builder import PromptBuilder
from app.services.llm.base_provider import LLMProvider
from app.services.storage.base_storage import StorageProvider
from app.services.storage.local_storage import LocalStorageProvider
from app.services.validation.orchestrator import ValidationOrchestrator
from app.utils.upload_validation import validate_uploads

logger = logging.getLogger(__name__)


class ValidationService:
    def __init__(
        self,
        db: AsyncSession,
        llm_provider: LLMProvider,
        storage_provider: Optional[StorageProvider] = None,
    ):
        self.db = db
        self.repo = ValidationRepository(db)
        self.llm_provider = llm_provider
        self.storage_provider = storage_provider or LocalStorageProvider()
        self.prompt_builder = PromptBuilder()

    async def enqueue_validation(
        self,
        request: ValidationCreateRequest,
        files: List[UploadFile],
        founder_id: Optional[str] = None,
    ) -> Validation:
        """Phase 1: Persist initial inputs and attachments in QUEUED state, return immediately."""
        await validate_uploads(files)
        validation = Validation(
            founder_id=founder_id,
            guest_session_id=request.guest_session_id,
            source=request.source,
            status=ValidationStatus.QUEUED.value,
            llm_provider=self.llm_provider.provider_name(),
            prompt_version="1.0.0",
            report_schema_version="1.0.0",
        )
        validation = await self.repo.save(validation)

        # Save inputs
        val_input = ValidationInput(
            validation_id=validation.id,
            idea_description=request.idea_description,
            target_customer=request.target_customer,
            target_market=request.target_market,
            founder_stage=request.founder_stage,
        )
        await self.repo.add_input(val_input)

        # Process attachments with StorageProvider abstraction
        for file in files:
            file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
            storage_name = f"{uuid.uuid4()}{file_ext}"
            content = await file.read()
            storage_path = await self.storage_provider.store(
                content=content,
                filename=storage_name,
                mime_type=file.content_type or "application/octet-stream",
            )

            attachment = ValidationAttachment(
                validation_id=validation.id,
                filename=storage_name,
                original_filename=file.filename or "unknown",
                mime_type=file.content_type or "application/octet-stream",
                storage_path=storage_path,
                file_size=len(content),
            )
            await self.repo.add_attachment(attachment)

        # Audit Event
        await self.repo.save_event(
            validation_id=validation.id,
            event_type=ValidationEventType.VALIDATION_SUBMITTED,
            metadata={"source": request.source, "file_count": len(files)},
        )

        return await self.repo.get_by_id(validation.id)

    async def execute_validation_pipeline(self, validation_id: str) -> Validation:
        """Phase 2: Delegate to ValidationOrchestrator to run 12-stage multi-agent pipeline."""
        orchestrator = ValidationOrchestrator(
            self.db,
            llm_provider=self.llm_provider,
            prompt_builder=self.prompt_builder,
        )
        return await orchestrator.run_pipeline(validation_id)

    # Legacy synchronous wrapper for backward compatibility
    async def create_validation(
        self,
        request: ValidationCreateRequest,
        files: List[UploadFile],
        founder_id: Optional[str] = None,
    ) -> Validation:
        validation = await self.enqueue_validation(request, files, founder_id)
        return await self.execute_validation_pipeline(validation.id)

    async def get_validation(
        self,
        validation_id: str,
        founder_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
    ) -> Optional[Validation]:
        return await self.repo.get_by_id(validation_id, founder_id, guest_session_id)

    async def list_founder_validations(
        self,
        founder_id: str,
        page: int,
        page_size: int,
        search: str | None = None,
        recommendation: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ):
        return await self.repo.list_by_founder(
            founder_id, page, page_size, search, recommendation, sort_by, sort_order
        )
