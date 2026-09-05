from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.admin_founders import FounderDetailResponse, PaginatedFoundersResponse
from app.services.admin.admin_founders_service import AdminFoundersService

router = APIRouter()


@router.get("/founders", response_model=PaginatedFoundersResponse)
async def list_founders(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    search: str | None = Query(default=None, description="Search by founder name or email"),
    status_filter: str | None = Query(default=None, alias="status", description="Filter: active | inactive"),
    sort_by: str = Query(default="created_at", description="Sort field: created_at | full_name | last_login_at"),
    sort_order: str = Query(default="desc", description="Sort direction: asc | desc"),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> PaginatedFoundersResponse:
    """
    List all Founders with pagination, search, and filtering.

    - Search matches Founder Name and Founder Email.
    - Status filter: active | inactive | (omit for all).
    - Backend-driven pagination — page and page_size control the result window.
    """
    service = AdminFoundersService(db)
    return await service.list_founders(
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/founders/{founder_id}", response_model=FounderDetailResponse)
async def get_founder_detail(
    founder_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> FounderDetailResponse:
    """
    Retrieve the full operational detail view for a single Founder.

    Returns:
    - Founder profile (name, email, auth provider, account status)
    - Workspace summary (submission counts)
    - Submissions (Reality Sprints + Build Requests, most recent first)
    - Activity feed (derived from Build Request timeline events)
    """
    service = AdminFoundersService(db)
    return await service.get_founder_detail(founder_id)
