from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.admin_build_requests import (
    AdminBuildRequestDetailResponse,
    BuildRequestNoteRequest,
    BuildRequestProgressRequest,
    BuildRequestRejectRequest,
    PaginatedBuildRequestsResponse,
)
from app.services.admin.admin_build_requests_service import AdminBuildRequestService

router = APIRouter()


@router.get("/build-requests", response_model=PaginatedBuildRequestsResponse)
async def list_build_requests(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    search: str | None = Query(default=None, description="Search by title, startup, description, founder"),
    status: str | None = Query(default=None, description="Filter by status: SUBMITTED | APPROVED | IN_PROGRESS | PAUSED | COMPLETED | REJECTED"),
    priority: str | None = Query(default=None, description="Filter by priority: NORMAL | HIGH | URGENT"),
    founder_id: str | None = Query(default=None, description="Filter to a specific founder"),
    sort_by: str = Query(default="created_at", description="Sort field: created_at | title | status | priority | progress_percentage | updated_at"),
    sort_order: str = Query(default="desc", description="Sort direction: asc | desc"),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> PaginatedBuildRequestsResponse:
    """
    List all platform Build Requests with pagination, search, and filtering.
    Requires Super Admin authentication.
    """
    service = AdminBuildRequestService(db)
    return await service.list_build_requests(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        priority=priority,
        founder_id=founder_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/build-requests/{request_id}", response_model=AdminBuildRequestDetailResponse)
async def get_build_request_detail(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Retrieve complete 100% submission dossier & operational control state of a Build Request.
    Requires Super Admin authentication.
    """
    service = AdminBuildRequestService(db)
    return await service.get_build_request_detail(request_id)


@router.patch("/build-requests/{request_id}/approve", response_model=AdminBuildRequestDetailResponse)
async def approve_build_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Approve a submitted build request.
    Transitions status to APPROVED.
    """
    service = AdminBuildRequestService(db)
    return await service.approve_build_request(request_id, admin_id=admin.id)


@router.patch("/build-requests/{request_id}/reject", response_model=AdminBuildRequestDetailResponse)
async def reject_build_request(
    request_id: str,
    payload: BuildRequestRejectRequest | None = None,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Reject a submitted build request.
    Transitions status to REJECTED.
    """
    service = AdminBuildRequestService(db)
    reason = payload.reason if payload else None
    return await service.reject_build_request(request_id, admin_id=admin.id, reason=reason)


@router.patch("/build-requests/{request_id}/start", response_model=AdminBuildRequestDetailResponse)
async def start_build_development(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Start development execution of an approved build request.
    Transitions status to IN_PROGRESS.
    """
    service = AdminBuildRequestService(db)
    return await service.start_development(request_id, admin_id=admin.id)


@router.patch("/build-requests/{request_id}/pause", response_model=AdminBuildRequestDetailResponse)
async def pause_build_development(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Pause an in-progress build development execution.
    Transitions status to PAUSED.
    """
    service = AdminBuildRequestService(db)
    return await service.pause_development(request_id, admin_id=admin.id)


@router.patch("/build-requests/{request_id}/resume", response_model=AdminBuildRequestDetailResponse)
async def resume_build_development(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Resume a paused build development execution.
    Transitions status to IN_PROGRESS.
    """
    service = AdminBuildRequestService(db)
    return await service.resume_development(request_id, admin_id=admin.id)


@router.patch("/build-requests/{request_id}/progress", response_model=AdminBuildRequestDetailResponse)
async def update_build_request_progress(
    request_id: str,
    payload: BuildRequestProgressRequest,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Update progress percentage (0-100), current phase, current milestone, and milestone completion checklist.
    Auto-completes build request if progress reaches 100%.
    """
    service = AdminBuildRequestService(db)
    return await service.update_progress(
        request_id,
        admin_id=admin.id,
        progress_percentage=payload.progress_percentage,
        current_phase=payload.current_phase,
        current_milestone=payload.current_milestone,
        milestones=payload.milestones,
    )


@router.patch("/build-requests/{request_id}/complete", response_model=AdminBuildRequestDetailResponse)
async def complete_build_development(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Mark build request development as 100% completed.
    Transitions status to COMPLETED and completes all milestones.
    """
    service = AdminBuildRequestService(db)
    return await service.complete_development(request_id, admin_id=admin.id)


@router.patch("/build-requests/{request_id}/note", response_model=AdminBuildRequestDetailResponse)
async def add_build_request_note(
    request_id: str,
    payload: BuildRequestNoteRequest,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminBuildRequestDetailResponse:
    """
    Add a private operational note to a build request.
    Notes are internal-only and hidden from Founder Workspace.
    """
    service = AdminBuildRequestService(db)
    return await service.add_operational_note(
        request_id,
        admin_id=admin.id,
        content=payload.content,
    )


@router.get("/build-requests/{request_id}/attachments/{attachment_id}")
async def get_admin_build_request_attachment(
    request_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
):
    """
    Secure attachment retrieval for Super Admin.
    Returns the raw file response with proper mime type and content disposition.
    """
    service = AdminBuildRequestService(db)
    storage_path, mime_type, filename = await service.get_attachment_path(request_id, attachment_id)
    return FileResponse(storage_path, media_type=mime_type, filename=filename)


