from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.admin_reality_sprints import (
    AdminRealitySprintDetailResponse,
    PaginatedRealitySprintsResponse,
    RealitySprintProgressRequest,
    RealitySprintRejectRequest,
)
from app.services.admin.admin_reality_sprints_service import AdminRealitySprintService

router = APIRouter()


@router.get("/reality-sprints", response_model=PaginatedRealitySprintsResponse)
async def list_reality_sprints(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    search: str | None = Query(default=None, description="Search by title, startup, description, founder"),
    status: str | None = Query(default=None, description="Filter by status: SUBMITTED | ACCEPTED | IN_PROGRESS | PAUSED | COMPLETED | CANCELLED"),
    founder_id: str | None = Query(default=None, description="Filter to a specific founder's sprints"),
    sort_by: str = Query(default="created_at", description="Sort field: created_at | title | status | updated_at"),
    sort_order: str = Query(default="desc", description="Sort direction: asc | desc"),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> PaginatedRealitySprintsResponse:
    """
    List all platform Reality Sprints with pagination, search, and filtering.
    Requires Super Admin authentication.
    """
    service = AdminRealitySprintService(db)
    return await service.list_reality_sprints(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        founder_id=founder_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/reality-sprints/{sprint_id}", response_model=AdminRealitySprintDetailResponse)
async def get_reality_sprint_detail(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Retrieve complete detail & operational history of a Reality Sprint.
    Requires Super Admin authentication.
    """
    service = AdminRealitySprintService(db)
    return await service.get_reality_sprint_detail(sprint_id)


@router.patch("/reality-sprints/{sprint_id}/approve", response_model=AdminRealitySprintDetailResponse)
async def approve_reality_sprint(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Approve a pending Reality Sprint request.
    Transitions status to ACCEPTED.
    """
    service = AdminRealitySprintService(db)
    return await service.approve_sprint(sprint_id, admin_id=admin.id)


@router.patch("/reality-sprints/{sprint_id}/reject", response_model=AdminRealitySprintDetailResponse)
async def reject_reality_sprint(
    sprint_id: str,
    payload: RealitySprintRejectRequest | None = None,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Reject a pending Reality Sprint request.
    Transitions status to CANCELLED.
    """
    service = AdminRealitySprintService(db)
    reason = payload.reason if payload else None
    return await service.reject_sprint(sprint_id, admin_id=admin.id, reason=reason)


@router.patch("/reality-sprints/{sprint_id}/start", response_model=AdminRealitySprintDetailResponse)
async def start_reality_sprint(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Start execution of an approved Reality Sprint.
    Transitions status to IN_PROGRESS.
    """
    service = AdminRealitySprintService(db)
    return await service.start_sprint(sprint_id, admin_id=admin.id)


@router.patch("/reality-sprints/{sprint_id}/pause", response_model=AdminRealitySprintDetailResponse)
async def pause_reality_sprint(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Pause an in-progress Reality Sprint.
    Transitions status to PAUSED.
    """
    service = AdminRealitySprintService(db)
    return await service.pause_sprint(sprint_id, admin_id=admin.id)


@router.patch("/reality-sprints/{sprint_id}/resume", response_model=AdminRealitySprintDetailResponse)
async def resume_reality_sprint(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Resume a paused Reality Sprint.
    Transitions status to IN_PROGRESS.
    """
    service = AdminRealitySprintService(db)
    return await service.resume_sprint(sprint_id, admin_id=admin.id)


@router.patch("/reality-sprints/{sprint_id}/progress", response_model=AdminRealitySprintDetailResponse)
async def update_reality_sprint_progress(
    sprint_id: str,
    payload: RealitySprintProgressRequest,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Update progress percentage (0-100) and milestone completion states for a Reality Sprint.
    Auto-completes sprint if progress reaches 100%.
    """
    service = AdminRealitySprintService(db)
    return await service.update_progress(
        sprint_id,
        admin_id=admin.id,
        progress=payload.progress,
        milestones=payload.milestones,
    )


@router.patch("/reality-sprints/{sprint_id}/complete", response_model=AdminRealitySprintDetailResponse)
async def complete_reality_sprint(
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> AdminRealitySprintDetailResponse:
    """
    Mark a Reality Sprint as 100% completed.
    Transitions status to COMPLETED and completes all milestones.
    """
    service = AdminRealitySprintService(db)
    return await service.complete_sprint(sprint_id, admin_id=admin.id)


@router.get("/reality-sprints/{sprint_id}/attachments/{attachment_id}")
async def get_admin_reality_sprint_attachment(
    sprint_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
):
    """
    Secure attachment retrieval for Super Admin.
    Returns the raw file response with proper mime type and content disposition.
    """
    service = AdminRealitySprintService(db)
    storage_path, mime_type, filename = await service.get_attachment_path(sprint_id, attachment_id)
    return FileResponse(storage_path, media_type=mime_type, filename=filename)
