import asyncio
import json
import logging
import os
from pathlib import Path
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_db
from app.auth.dependencies import get_current_user_optional, require_authenticated_user
from app.core.database import AsyncSessionLocal
from app.models.auth import UserORM
from app.models.validation import Validation
from app.schemas.validation import (
    ValidationCreateRequest,
    ValidationHealthResponse,
    ValidationResponse,
    ValidationListItem,
    ValidationListResponse,
    ValidationStatusResponse,
)
from app.services.llm_provider import get_llm_provider
from app.services.validation.orchestrator import ValidationProgressBroadcaster
from app.services.validation_service import ValidationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validations", tags=["validations"])


def get_validation_service(db: AsyncSession = Depends(get_db)) -> ValidationService:
    provider = get_llm_provider()
    return ValidationService(db, provider)


def _validation_response(validation: Validation) -> dict:
    response = {column.name: getattr(validation, column.name) for column in Validation.__table__.columns}
    response["inputs"] = validation.inputs
    response["attachments"] = validation.attachments
    response["report_data"] = validation.report.report_json if validation.report else None
    return response


@router.get("", response_model=ValidationListResponse)
async def list_validations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    recommendation: Optional[str] = Query(None, max_length=50),
    sort_by: str = Query("created_at", pattern="^(created_at|overall_score)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: UserORM = Depends(require_authenticated_user),
    validation_service: ValidationService = Depends(get_validation_service),
):
    validations, total = await validation_service.list_founder_validations(
        current_user.id, page, page_size, search, recommendation, sort_by, sort_order
    )
    items = [
        ValidationListItem(
            id=validation.id,
            source=validation.source,
            status=validation.status,
            overall_score=validation.overall_score,
            recommendation=validation.recommendation,
            created_at=validation.created_at,
            updated_at=validation.updated_at,
            idea_description=validation.inputs.idea_description if validation.inputs else None,
            target_customer=validation.inputs.target_customer if validation.inputs else None,
            target_market=validation.inputs.target_market if validation.inputs else None,
            founder_stage=validation.inputs.founder_stage if validation.inputs else None,
            report_available=validation.report is not None and validation.status == "COMPLETED",
            pdf_available=validation.status == "COMPLETED" and bool(
                list(Path("./uploads/pdf_reports").glob(f"Vision2Real_Validation_{validation.id[:8]}*.pdf"))
            ),
        )
        for validation in validations
    ]
    return ValidationListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size,
    )


async def _background_validation_worker(validation_id: str):
    """Background task runner with dedicated DB session lifecycle."""
    async with AsyncSessionLocal() as db:
        provider = get_llm_provider()
        service = ValidationService(db, provider)
        await service.execute_validation_pipeline(validation_id)


# ── Health ─────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=ValidationHealthResponse)
async def check_validation_health(
    db: AsyncSession = Depends(get_db),
    validation_service: ValidationService = Depends(get_validation_service),
):
    """Health status check for LLM provider, database, and storage subsystems."""
    llm_ok = await validation_service.llm_provider.health_check()
    provider_status = "HEALTHY" if llm_ok else "UNAVAILABLE"

    try:
        await db.execute(text("SELECT 1"))
        db_status = "HEALTHY"
    except Exception:
        db_status = "UNHEALTHY"

    storage_ok = await validation_service.storage_provider.health_check()
    storage_status = "HEALTHY" if storage_ok else "UNHEALTHY"

    return ValidationHealthResponse(
        provider_status=provider_status,
        database_status=db_status,
        storage_status=storage_status,
    )


# ── Submit Validation ──────────────────────────────────────────────────────────

@router.post("", response_model=ValidationResponse)
async def create_validation(
    background_tasks: BackgroundTasks,
    request_data: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: UserORM | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
    validation_service: ValidationService = Depends(get_validation_service),
):
    try:
        data_dict = json.loads(request_data)
        request = ValidationCreateRequest(**data_dict)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid JSON in request_data")

    founder_id = current_user.id if current_user else None

    if not founder_id and not request.guest_session_id:
        raise HTTPException(status_code=400, detail="Must provide authentication or guest_session_id")

    # Enqueue validation record synchronously (QUEUED status)
    validation = await validation_service.enqueue_validation(
        request=request,
        files=files,
        founder_id=founder_id,
    )

    # Schedule orchestrator as background task
    background_tasks.add_task(_background_validation_worker, validation.id)

    return validation


# ── SSE Live Progress Stream ───────────────────────────────────────────────────

@router.get("/stream/{validation_id}")
async def stream_validation_progress(
    validation_id: str,
    current_user: UserORM | None = Depends(get_current_user_optional),
):
    """Server-Sent Events stream for real-time validation progress updates."""

    async def event_generator() -> AsyncGenerator:
        queue = ValidationProgressBroadcaster.subscribe(validation_id)
        try:
            # Send heartbeat to open the connection
            yield {
                "event": "connected",
                "data": json.dumps({"validation_id": validation_id, "message": "Progress stream connected"}),
            }

            # Stream progress events until DONE sentinel or timeout
            timeout_seconds = 300  # 5 minute max stream
            elapsed = 0.0
            while elapsed < timeout_seconds:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield {
                        "event": "progress",
                        "data": event.model_dump_json(),
                    }
                    # If 100% completed or failed globally, end the stream
                    if event.progress_percentage >= 100 or (
                        event.stage == "Save Results" and event.status == "completed"
                    ):
                        yield {
                            "event": "done",
                            "data": json.dumps({"validation_id": validation_id, "message": "Validation complete"}),
                        }
                        break
                except asyncio.TimeoutError:
                    elapsed += 1.0
                    # Send heartbeat ping to keep connection alive
                    yield {"event": "ping", "data": ""}
        except asyncio.CancelledError:
            pass
        finally:
            ValidationProgressBroadcaster.unsubscribe(validation_id, queue)

    return EventSourceResponse(event_generator())


# ── Get Status ────────────────────────────────────────────────────────────────

@router.get("/status/{validation_id}", response_model=ValidationStatusResponse)
async def get_validation_status(
    validation_id: str,
    guest_session_id: Optional[str] = None,
    current_user: UserORM | None = Depends(get_current_user_optional),
    validation_service: ValidationService = Depends(get_validation_service),
):
    founder_id = current_user.id if current_user else None
    if not founder_id and not guest_session_id:
        raise HTTPException(status_code=401, detail="Authentication or guest session required")
    validation = await validation_service.get_validation(validation_id, founder_id, guest_session_id)
    if not validation:
        raise HTTPException(status_code=404, detail="Validation not found or access denied")
    return validation


# ── PDF Download ───────────────────────────────────────────────────────────────

@router.get("/{validation_id}/pdf")
async def download_validation_pdf(
    validation_id: str,
    guest_session_id: Optional[str] = None,
    current_user: UserORM | None = Depends(get_current_user_optional),
    validation_service: ValidationService = Depends(get_validation_service),
):
    """Download the branded PDF report for a completed validation."""
    founder_id = current_user.id if current_user else None
    if not founder_id and not guest_session_id:
        raise HTTPException(status_code=401, detail="Authentication or guest session required")
    validation = await validation_service.get_validation(validation_id, founder_id, guest_session_id)
    if not validation:
        raise HTTPException(status_code=404, detail="Validation not found or access denied")

    # Locate PDF file on disk
    pdf_dir = Path("./uploads/pdf_reports")
    pdf_files = list(pdf_dir.glob(f"Vision2Real_Validation_{validation_id[:8]}*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=404, detail="PDF report not yet generated. Complete validation first.")

    return FileResponse(
        path=str(pdf_files[0]),
        media_type="application/pdf",
        filename=f"Vision2Real_Report_{validation_id[:8]}.pdf",
    )


# ── Get Full Validation ────────────────────────────────────────────────────────

@router.get("/{validation_id}", response_model=ValidationResponse)
async def get_validation(
    validation_id: str,
    guest_session_id: Optional[str] = None,
    current_user: UserORM | None = Depends(get_current_user_optional),
    validation_service: ValidationService = Depends(get_validation_service),
):
    founder_id = current_user.id if current_user else None
    if not founder_id and not guest_session_id:
        raise HTTPException(status_code=401, detail="Authentication or guest session required")
    validation = await validation_service.get_validation(validation_id, founder_id, guest_session_id)
    if not validation:
        raise HTTPException(status_code=404, detail="Validation not found or access denied")
    return _validation_response(validation)
