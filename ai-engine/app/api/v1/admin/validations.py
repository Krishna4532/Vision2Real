from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.admin_validations import (
    AdminValidationDetailResponse,
    PaginatedValidationsResponse,
)
from app.services.admin.admin_validations_service import AdminValidationsService

router = APIRouter()


@router.get("/validations", response_model=PaginatedValidationsResponse)
async def list_validations(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    search: str | None = Query(default=None, description="Search in idea description"),
    status: str | None = Query(default=None, description="Filter by status: QUEUED | PROCESSING | COMPLETED | FAILED"),
    founder_id: str | None = Query(default=None, description="Filter to a specific founder's validations"),
    date_from: date | None = Query(default=None, description="Created on or after (YYYY-MM-DD)"),
    date_to: date | None = Query(default=None, description="Created on or before (YYYY-MM-DD)"),
    sort_by: str = Query(default="created_at", description="Sort field: created_at | overall_score | status"),
    sort_order: str = Query(default="desc", description="Sort direction: asc | desc"),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> PaginatedValidationsResponse:
    """
    List all platform validations with pagination, search, and filtering.

    - Search matches the idea description submitted by the founder.
    - Status filter accepts: QUEUED, PROCESSING, COMPLETED, FAILED.
    - founder_id narrows results to a single founder.
    - date_from / date_to define a created_at date range.
    - Backend-driven pagination — page and page_size control the result window.

    Only accessible by Super Admin.
    """
    service = AdminValidationsService(db)
    return await service.list_validations(
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status,
        founder_id=founder_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/validations/{validation_id}", response_model=AdminValidationDetailResponse)
async def get_validation_detail(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> AdminValidationDetailResponse:
    """
    Retrieve the complete operational detail view for a single validation.

    Returns:
    - Validation identity (status, source, score, recommendation)
    - Founder identity (if the validation was submitted by a registered founder)
    - Original founder submission inputs (idea description, target market, etc.)
    - AI validation report (complete persisted JSON output)
    - Operational metadata (model, tokens, latency, cost — only present if available)
    - Lifecycle events (ordered chronologically)

    Only accessible by Super Admin.
    """
    service = AdminValidationsService(db)
    return await service.get_validation_detail(validation_id)
