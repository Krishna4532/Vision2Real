from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.reality_sprint import RealitySprint, RealitySprintAttachment
from app.repositories.reality_sprint_repository import RealitySprintRepository
from app.schemas.reality_sprint import RealitySprintCreate, RealitySprintResponse, RealitySprintStatus, RealitySprintUpdate
from app.services.storage.base_storage import StorageProvider
from app.services.storage.local_storage import LocalStorageProvider
from app.utils.upload_validation import validate_uploads

from enum import Enum

logger = logging.getLogger(__name__)

# Valid state transition graph
VALID_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"SUBMITTED", "CANCELLED"},
    "SUBMITTED": {"UNDER_REVIEW", "CANCELLED"},
    "UNDER_REVIEW": {"ACCEPTED", "CANCELLED"},
    "ACCEPTED": {"SCHEDULED", "CANCELLED"},
    "SCHEDULED": {"IN_PROGRESS", "CANCELLED"},
    "IN_PROGRESS": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}

# Administrative status states restricted from normal founder self-promotion
ADMIN_ONLY_STATUSES: set[str] = {"ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"}


class RealitySprintService:
    def __init__(self, db: AsyncSession, storage_provider: StorageProvider | None = None) -> None:
        self.repository = RealitySprintRepository(db)
        self.storage_provider = storage_provider or LocalStorageProvider(root_dir="./uploads/reality_sprints")

    async def create_sprint(self, founder: UserORM, data: RealitySprintCreate) -> RealitySprintResponse:
        now = datetime.now(timezone.utc)
        request = RealitySprint(
            id=str(uuid.uuid4()),
            founder_id=founder.id,
            title=data.title,
            startup_name=data.startup_name,
            description=data.description,
            target_customer=data.target_customer,
            target_market=data.target_market,
            founder_stage=data.founder_stage,
            status="SUBMITTED",
            priority=data.priority,
            request_source=data.request_source,
            estimated_duration_days=data.estimated_duration_days,
            execution_mode=data.execution_mode,
            version=data.version,
            is_archived=False,
            extra_metadata=data.extra_metadata,
            project_id=data.project_id,
            workspace_id=data.workspace_id,
            roadmap_id=data.roadmap_id,
            created_at=now,
            updated_at=now,
            submitted_at=now,
        )
        created = await self.repository.create_request(request)
        try:
            from app.services.notification_service import NotificationService
            await NotificationService(self.repository.db).notify_reality_sprint_submitted(founder.id, created.id, created.title)
        except Exception as ex:
            logger.warning(f"Failed to create reality sprint notification: {ex}")
        return self._to_response(created)

    async def update_sprint(
        self, founder: UserORM, request_id: str, data: RealitySprintUpdate, is_admin: bool = False
    ) -> RealitySprintResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=True)
        old_status = request.status
        dump = data.model_dump(exclude_unset=True)

        if "status" in dump and dump["status"] is not None:
            new_status = dump["status"].value if isinstance(dump["status"], Enum) else str(dump["status"])
            self._validate_and_apply_status_transition(request, new_status, is_admin=is_admin)

        for field, value in dump.items():
            if field == "status":
                continue
            val = value.value if isinstance(value, Enum) else value
            setattr(request, field, val)

        updated = await self.repository.update_request(request)
        if "status" in dump and updated.status != old_status:
            try:
                from app.services.notification_service import NotificationService
                ns = NotificationService(self.repository.db)
                if updated.status == "ACCEPTED":
                    await ns.notify_reality_sprint_accepted(founder.id, updated.id, updated.title)
                elif updated.status == "COMPLETED":
                    await ns.notify_reality_sprint_completed(founder.id, updated.id, updated.title)
            except Exception as ex:
                logger.warning(f"Failed to send reality sprint status notification: {ex}")

        return self._to_response(updated)

    async def get_sprint(self, founder: UserORM, request_id: str, include_archived: bool = False) -> RealitySprintResponse:
        return self._to_response(await self._owned_request(founder.id, request_id, include_archived=include_archived))

    async def list_sprints(self, founder: UserORM, **filters: Any) -> tuple[list[RealitySprintResponse], int]:
        requests, total = await self.repository.list_founder_requests(founder.id, **filters)
        return [self._to_response(request) for request in requests], total

    async def upload_attachments(
        self, founder: UserORM, request_id: str, files: list[UploadFile]
    ) -> RealitySprintResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=True)
        if len(request.attachments) + len(files) > 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attachment limit exceeded. Maximum 10 attachments allowed per request.")
        await validate_uploads(files)
        for file in files:
            extension = os.path.splitext(file.filename or "")[1]
            storage_name = f"{uuid.uuid4()}{extension}"
            content = await file.read()
            storage_path = await self.storage_provider.store(
                content=content,
                filename=storage_name,
                mime_type=file.content_type or "application/octet-stream",
            )
            attachment_id = str(uuid.uuid4())
            attachment = RealitySprintAttachment(
                id=attachment_id,
                reality_sprint_id=request.id,
                filename=storage_name,
                original_filename=file.filename or "unknown",
                mime_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                storage_path=storage_path,
                download_url=f"/api/v1/reality-sprints/{request.id}/attachments/{attachment_id}",
                created_at=datetime.now(timezone.utc),
            )
            await self.repository.add_attachment(attachment)
        return self._to_response(await self._owned_request(founder.id, request_id, include_archived=True))

    async def compute_analytics(self, founder: UserORM) -> dict[str, Any]:
        return await self.repository.analytics(founder.id)

    async def start_ai_execution(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'start_ai_execution' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def generate_prd(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'generate_prd' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def generate_architecture(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'generate_architecture' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def generate_ui(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'generate_ui' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def generate_backend(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'generate_backend' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def launch_multi_agent_pipeline(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Reality Sprint V2 multi-agent capability 'launch_multi_agent_pipeline' requested but unfulfilled in V1.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Feature is reserved for Reality Sprint Version 2."
        )

    async def _owned_request(self, founder_id: str, request_id: str, include_archived: bool = False) -> RealitySprint:
        request = await self.repository.get_request(request_id, founder_id, include_archived=include_archived)
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reality Sprint request not found.")
        return request

    def _validate_and_apply_status_transition(
        self, request: RealitySprint, new_status: str, is_admin: bool = False
    ) -> None:
        old_status = request.status
        if old_status == new_status:
            return

        valid_next = VALID_TRANSITIONS.get(old_status, set())
        if new_status not in valid_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status} to {new_status}.",
            )

        if not is_admin and new_status in ADMIN_ONLY_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Founders cannot self-promote Sprint to this administrative state.",
            )

        now = datetime.now(timezone.utc)
        request.status = new_status

        if new_status == "SUBMITTED" and not request.submitted_at:
            request.submitted_at = now
        elif new_status == "UNDER_REVIEW" and not request.review_started_at:
            request.review_started_at = now
        elif new_status == "ACCEPTED" and not request.accepted_at:
            request.accepted_at = now
        elif new_status == "SCHEDULED" and not request.scheduled_at:
            request.scheduled_at = now
        elif new_status == "IN_PROGRESS" and not request.started_at:
            request.started_at = now
        elif new_status == "COMPLETED" and not request.completed_at:
            request.completed_at = now
        elif new_status == "CANCELLED" and not request.cancelled_at:
            request.cancelled_at = now

    @staticmethod
    def _to_response(request: RealitySprint) -> RealitySprintResponse:
        return RealitySprintResponse.model_validate(request)

