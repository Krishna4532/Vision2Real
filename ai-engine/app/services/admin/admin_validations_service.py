from __future__ import annotations

from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin.admin_validations_repository import AdminValidationsRepository
from app.schemas.admin_validations import (
    AdminValidationDetailResponse,
    PaginatedValidationsResponse,
)

# Valid statuses per the Validation model
_VALID_STATUSES = {"QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"}

# Allowed sort fields
_ALLOWED_SORT = {"created_at", "overall_score", "status"}


class AdminValidationsService:
    """
    Business logic layer for Admin HQ – Validation Management.

    Translates operational queries into repository calls, enforces business
    rules, normalises inputs, and raises structured HTTP errors.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.repo = AdminValidationsRepository(db)

    async def list_validations(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
        founder_id: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedValidationsResponse:
        """
        Return a paginated, filterable list of all platform validations.

        Business rules:
        - page >= 1; page_size capped at 100.
        - status_filter must be a known status value or None.
        - sort_by must be a known field; unknown values fall back to created_at.
        - sort_order must be "asc" or "desc".
        - date_from must not be after date_to when both are provided.
        """
        # Bounds
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100

        # Sort normalisation
        if sort_by not in _ALLOWED_SORT:
            sort_by = "created_at"
        if sort_order not in ("asc", "desc"):
            sort_order = "desc"

        # Status normalisation
        if status_filter:
            status_filter = status_filter.upper()
            if status_filter not in _VALID_STATUSES:
                status_filter = None

        # Date range sanity
        if date_from and date_to and date_from > date_to:
            date_from, date_to = date_to, date_from

        return await self.repo.list_validations(
            page=page,
            page_size=page_size,
            search=search,
            status_filter=status_filter,
            founder_id=founder_id,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def get_validation_detail(self, validation_id: str) -> AdminValidationDetailResponse:
        """
        Return the complete operational detail view for a single validation.

        Raises 404 if the validation does not exist.
        """
        detail = await self.repo.get_validation_by_id(validation_id)
        if detail is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Validation '{validation_id}' not found.",
            )
        return detail
