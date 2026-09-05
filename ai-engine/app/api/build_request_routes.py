from __future__ import annotations

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.schemas.build_request import (
    BuildRequestAnalytics,
    BuildRequestCreate,
    BuildRequestListResponse,
    BuildRequestMutationResponse,
    BuildRequestPagination,
    BuildRequestResponse,
    BuildRequestUpdate,
    MessageCreate,
    MessageResponse,
    TimelineEventResponse,
)
from app.services.build_request_service import BuildRequestService

router = APIRouter(prefix="/build-requests", tags=["build-requests"])


def get_build_request_service(db: AsyncSession = Depends(get_db)) -> BuildRequestService:
    return BuildRequestService(db)


@router.post("", response_model=BuildRequestMutationResponse, status_code=status.HTTP_201_CREATED)
async def create_build_request(
    data: BuildRequestCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestMutationResponse:
    # Merge header-level idempotency key into the request body (header takes precedence)
    if idempotency_key and not data.idempotency_key:
        data = data.model_copy(update={"idempotency_key": idempotency_key})
    res = await service.create_request(founder, data)
    return BuildRequestMutationResponse(
        message="Build request created successfully.",
        data=res,
    )


@router.get("", response_model=BuildRequestListResponse)
async def list_build_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    request_status: str | None = Query(None, alias="status", max_length=50),
    priority: str | None = Query(None, max_length=50),
    product_category: str | None = Query(None, max_length=100),
    target_market: str | None = Query(None, max_length=255),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|title|priority|status|progress_percentage)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    include_archived: bool = Query(False),
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestListResponse:
    items, total = await service.list_requests(
        founder,
        page=page,
        page_size=page_size,
        search=search,
        status=request_status,
        priority=priority,
        product_category=product_category,
        target_market=target_market,
        sort_by=sort_by,
        sort_order=sort_order,
        include_archived=include_archived,
    )
    return BuildRequestListResponse(
        data=items,  # Pydantic v2 automatically coerces ORM/response objects to BuildRequestListItem
        pagination=BuildRequestPagination(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size if page_size > 0 else 1,
        ),
    )


@router.get("/analytics", response_model=BuildRequestAnalytics)
async def get_analytics(
    include_archived: bool = Query(False),
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestAnalytics:
    data = await service.compute_analytics(founder, include_archived=include_archived)
    return BuildRequestAnalytics.model_validate(data)


@router.get("/{id}", response_model=BuildRequestResponse)
async def get_build_request(
    id: str,
    include_archived: bool = Query(False),
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestResponse:
    return await service.get_request(founder, id, include_archived=include_archived)


@router.patch("/{id}", response_model=BuildRequestMutationResponse)
async def update_build_request(
    id: str,
    data: BuildRequestUpdate,
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestMutationResponse:
    # Fix 1 — Founders are not permitted to modify project management data.
    # Status, phase, progress, and milestone updates are reserved for Stage 7 Admin APIs.
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Founders are not permitted to modify project management data. "
            "Status and progress updates are reserved for the Admin Panel (Stage 7)."
        ),
    )


@router.post("/{id}/attachments", response_model=BuildRequestMutationResponse)
async def upload_attachments(
    id: str,
    files: Annotated[list[UploadFile], File()],
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> BuildRequestMutationResponse:
    res = await service.upload_attachments(founder, id, files)
    return BuildRequestMutationResponse(
        message="Attachments uploaded successfully.",
        data=res,
    )


@router.get("/{id}/attachments/{attachment_id}")
async def download_attachment(
    id: str,
    attachment_id: str,
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
):
    storage_path, mime_type, filename = await service.get_attachment_path(founder, id, attachment_id)
    return FileResponse(storage_path, media_type=mime_type, filename=filename)


@router.get("/{id}/timeline", response_model=List[TimelineEventResponse])
async def get_timeline(
    id: str,
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> List[TimelineEventResponse]:
    return await service.get_timeline(founder, id)


@router.get("/{id}/messages", response_model=List[MessageResponse])
async def get_messages(
    id: str,
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> List[MessageResponse]:
    return await service.get_messages(founder, id)


@router.post("/{id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def post_message(
    id: str,
    data: MessageCreate,
    founder: UserORM = Depends(require_authenticated_user),
    service: BuildRequestService = Depends(get_build_request_service),
) -> MessageResponse:
    return await service.post_message(founder, id, data, sender_type="FOUNDER")
