from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin.admin_founders_repository import AdminFoundersRepository
from app.schemas.admin_founders import FounderDetailResponse, PaginatedFoundersResponse


class AdminFoundersService:
    """
    Business logic layer for Admin HQ – Founder Management.

    Translates operational intent ("list all founders with search") into
    repository calls, enforcing business rules and raising structured errors.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.repo = AdminFoundersRepository(db)

    async def list_founders(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedFoundersResponse:
        """
        Return a paginated, searchable, filterable list of Founders.

        Business rules:
        - page must be >= 1.
        - page_size is capped at 100 to protect database performance.
        - sort_by must be one of the allowed fields; unknown values fall back to created_at.
        - sort_order must be "asc" or "desc"; anything else defaults to "desc".
        - status_filter accepts "active", "inactive", or None (all founders).
        - search matches Founder Name and Founder Email only.
        """
        # Guard: page bounds
        if page < 1:
            page = 1

        # Guard: page_size cap
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100

        # Guard: allowed sort columns
        allowed_sort = {"created_at", "full_name", "last_login_at"}
        if sort_by not in allowed_sort:
            sort_by = "created_at"

        # Guard: sort direction
        if sort_order not in ("asc", "desc"):
            sort_order = "desc"

        # Guard: status filter values
        if status_filter not in (None, "active", "inactive"):
            status_filter = None

        return await self.repo.list_founders(
            page=page,
            page_size=page_size,
            search=search,
            status_filter=status_filter,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def get_founder_detail(self, founder_id: str) -> FounderDetailResponse:
        """
        Return the full operational detail view for a single Founder.

        Raises 404 if the founder does not exist.
        """
        detail = await self.repo.get_founder_detail(founder_id)
        if detail is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Founder '{founder_id}' not found.",
            )
        return detail
