from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.schemas.reality_sprint import (
    RealitySprintAnalytics,
    RealitySprintCreate,
    RealitySprintListResponse,
    RealitySprintMutationResponse,
    RealitySprintPagination,
    RealitySprintResponse,
    RealitySprintUpdate,
)
from app.services.reality_sprint_service import RealitySprintService

router = APIRouter(prefix="/reality-sprints", tags=["reality-sprints"])


def get_reality_sprint_service(db: AsyncSession = Depends(get_db)) -> RealitySprintService:
    return RealitySprintService(db)


@router.post("", response_model=RealitySprintMutationResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: RealitySprintCreate,
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintMutationResponse:
    return RealitySprintMutationResponse(
        message="Reality Sprint request created successfully.",
        data=await service.create_sprint(founder, data),
    )


@router.get("", response_model=RealitySprintListResponse)
async def list_sprints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    request_status: str | None = Query(None, alias="status", max_length=50),
    priority: str | None = Query(None, max_length=50),
    target_market: str | None = Query(None, max_length=255),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|title|priority|status)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    include_archived: bool = Query(False),
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintListResponse:
    items, total = await service.list_sprints(
        founder,
        page=page,
        page_size=page_size,
        search=search,
        status=request_status,
        priority=priority,
        target_market=target_market,
        sort_by=sort_by,
        sort_order=sort_order,
        include_archived=include_archived,
    )
    return RealitySprintListResponse(
        data=items,
        pagination=RealitySprintPagination(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size if page_size > 0 else 1,
        ),
    )


@router.get("/analytics", response_model=RealitySprintAnalytics)
async def get_analytics(
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintAnalytics:
    return RealitySprintAnalytics(analytics=await service.compute_analytics(founder))


@router.get("/{request_id}", response_model=RealitySprintResponse)
async def get_sprint(
    request_id: str,
    include_archived: bool = Query(False),
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintResponse:
    return await service.get_sprint(founder, request_id, include_archived=include_archived)


@router.patch("/{request_id}", response_model=RealitySprintMutationResponse)
async def update_sprint(
    request_id: str,
    data: RealitySprintUpdate,
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintMutationResponse:
    return RealitySprintMutationResponse(
        message="Reality Sprint request updated successfully.",
        data=await service.update_sprint(founder, request_id, data),
    )


@router.post("/{request_id}/attachments", response_model=RealitySprintMutationResponse)
async def upload_attachments(
    request_id: str,
    files: Annotated[list[UploadFile], File()],
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
) -> RealitySprintMutationResponse:
    return RealitySprintMutationResponse(
        message="Reality Sprint attachments uploaded successfully.",
        data=await service.upload_attachments(founder, request_id, files),
    )


@router.get("/{request_id}/attachments/{attachment_id}")
async def download_attachment(
    request_id: str,
    attachment_id: str,
    founder: UserORM = Depends(require_authenticated_user),
    service: RealitySprintService = Depends(get_reality_sprint_service),
):
    request = await service.repository.get_request(request_id, founder.id, include_archived=True)
    if not request:
        raise HTTPException(status_code=404, detail="Reality Sprint request not found.")
    attachment = next((item for item in request.attachments if item.id == attachment_id), None)
    if not attachment or not Path(attachment.storage_path).is_file():
        raise HTTPException(status_code=404, detail="Attachment not found.")
    filename = getattr(attachment, "original_filename", attachment.filename)
    return FileResponse(attachment.storage_path, media_type=attachment.mime_type, filename=filename)

