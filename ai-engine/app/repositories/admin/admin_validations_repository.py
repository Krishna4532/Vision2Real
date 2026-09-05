from __future__ import annotations

from datetime import date
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import UserORM
from app.models.validation import Validation, ValidationInput, ValidationReport
from app.schemas.admin_validations import (
    AdminValidationDetailResponse,
    AdminValidationListItem,
    PaginatedValidationsResponse,
    ValidationEventItem,
    ValidationFounderInfo,
    ValidationInputData,
    ValidationOperationalMeta,
)


class AdminValidationsRepository:
    """
    Repository for Admin HQ – Validation Management.

    Responsibilities:
    - Platform-wide paginated, searchable, filterable validation list.
    - Complete validation detail with founder identity, submission inputs,
      AI report, operational metadata, and lifecycle events.

    Design constraints:
    - No N+1 queries — uses selectinload for related entities.
    - Founder join is a LEFT OUTER JOIN so guest validations (no founder) still appear.
    - Read-only — no mutations.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Validation List
    # ------------------------------------------------------------------

    async def list_validations(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None,
        status_filter: str | None,
        founder_id: str | None,
        date_from: date | None,
        date_to: date | None,
        sort_by: str,
        sort_order: str,
    ) -> PaginatedValidationsResponse:
        """
        Return a paginated list of all validations across the platform.

        search        — matches the idea description from ValidationInput.
        status_filter — exact match on Validation.status (QUEUED / PROCESSING / COMPLETED / FAILED).
        founder_id    — filter to a single founder's validations.
        date_from     — include only validations created on or after this date.
        date_to       — include only validations created on or before this date.
        sort_by       — "created_at" | "overall_score" | "status".
        sort_order    — "asc" | "desc".
        """
        # Base: all validations
        base_stmt = select(Validation)

        # Join with ValidationInput only if we need search (subquery exists)
        filters = []

        if search and search.strip():
            term = f"%{search.strip()}%"
            filters.append(
                select(ValidationInput.validation_id)
                .where(ValidationInput.idea_description.ilike(term))
                .correlate(Validation)
                .exists()
            )

        if status_filter:
            filters.append(Validation.status == status_filter)

        if founder_id:
            filters.append(Validation.founder_id == founder_id)

        if date_from:
            filters.append(func.date(Validation.created_at) >= date_from)

        if date_to:
            filters.append(func.date(Validation.created_at) <= date_to)

        if filters:
            base_stmt = base_stmt.where(*filters)

        # Total count before pagination
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one() or 0

        # Sorting
        sort_col = {
            "overall_score": Validation.overall_score,
            "status": Validation.status,
        }.get(sort_by, Validation.created_at)

        if sort_order == "asc":
            base_stmt = base_stmt.order_by(sort_col.asc().nulls_last(), Validation.id.desc())
        else:
            base_stmt = base_stmt.order_by(sort_col.desc().nulls_last(), Validation.id.desc())

        # Eager-load inputs (for idea snippet) — no N+1
        base_stmt = base_stmt.options(
            selectinload(Validation.inputs),
        )

        # Pagination
        offset = (page - 1) * page_size
        base_stmt = base_stmt.offset(offset).limit(page_size)

        rows = (await self.db.execute(base_stmt)).scalars().all()

        # Resolve founders in a single batch query (no per-row lookup)
        founder_ids = list({v.founder_id for v in rows if v.founder_id})
        founders_by_id: dict[str, UserORM] = {}
        if founder_ids:
            founder_rows = (
                await self.db.execute(
                    select(UserORM).where(UserORM.id.in_(founder_ids))
                )
            ).scalars().all()
            founders_by_id = {f.id: f for f in founder_rows}

        items: list[AdminValidationListItem] = []
        for v in rows:
            founder_orm = founders_by_id.get(v.founder_id) if v.founder_id else None
            founder_info = (
                ValidationFounderInfo(
                    id=founder_orm.id,
                    full_name=founder_orm.full_name,
                    email=founder_orm.email,
                )
                if founder_orm
                else None
            )
            idea_snippet: str | None = None
            if v.inputs and v.inputs.idea_description:
                raw = v.inputs.idea_description
                idea_snippet = raw[:120] + "…" if len(raw) > 120 else raw

            items.append(
                AdminValidationListItem(
                    id=v.id,
                    status=v.status,
                    source=v.source,
                    overall_score=v.overall_score,
                    recommendation=v.recommendation,
                    llm_model=v.llm_model,
                    llm_provider=v.llm_provider,
                    processing_time_ms=v.processing_time_ms,
                    created_at=v.created_at,
                    founder=founder_info,
                    idea_snippet=idea_snippet,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)

        return PaginatedValidationsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    # ------------------------------------------------------------------
    # Validation Detail
    # ------------------------------------------------------------------

    async def get_validation_by_id(self, validation_id: str) -> AdminValidationDetailResponse | None:
        """
        Fetch the full operational detail for a single validation.

        Eagerly loads: inputs, events, report.
        Resolves the founder identity via a secondary query (no N+1 — single lookup).
        """
        stmt = (
            select(Validation)
            .where(Validation.id == validation_id)
            .options(
                selectinload(Validation.inputs),
                selectinload(Validation.events),
                selectinload(Validation.report),
            )
        )
        v: Validation | None = (await self.db.execute(stmt)).scalar_one_or_none()
        if v is None:
            return None

        # Resolve founder
        founder_info: ValidationFounderInfo | None = None
        if v.founder_id:
            founder_orm = (
                await self.db.execute(
                    select(UserORM).where(UserORM.id == v.founder_id)
                )
            ).scalar_one_or_none()
            if founder_orm:
                founder_info = ValidationFounderInfo(
                    id=founder_orm.id,
                    full_name=founder_orm.full_name,
                    email=founder_orm.email,
                )

        # Inputs
        inputs_data: ValidationInputData | None = None
        if v.inputs:
            inputs_data = ValidationInputData(
                idea_description=v.inputs.idea_description,
                target_customer=v.inputs.target_customer,
                target_market=v.inputs.target_market,
                founder_stage=v.inputs.founder_stage,
            )

        # Report JSON
        report_json = v.report.report_json if v.report else None

        # Events sorted by created_at asc (lifecycle timeline order)
        events = sorted(v.events or [], key=lambda e: e.created_at)
        event_items = [
            ValidationEventItem(
                id=e.id,
                event_type=e.event_type,
                metadata_json=e.metadata_json,
                created_at=e.created_at,
            )
            for e in events
        ]

        # Operational metadata — only fields that exist
        operational = ValidationOperationalMeta(
            llm_provider=v.llm_provider,
            llm_model=v.llm_model,
            prompt_version=v.prompt_version,
            report_schema_version=v.report_schema_version,
            processing_time_ms=v.processing_time_ms,
            provider_latency_ms=v.provider_latency_ms,
            total_tokens=v.total_tokens,
            prompt_tokens=v.prompt_tokens,
            completion_tokens=v.completion_tokens,
            estimated_cost=v.estimated_cost,
            review_status=v.review_status,
        )

        return AdminValidationDetailResponse(
            id=v.id,
            status=v.status,
            source=v.source,
            overall_score=v.overall_score,
            recommendation=v.recommendation,
            created_at=v.created_at,
            updated_at=v.updated_at,
            founder=founder_info,
            inputs=inputs_data,
            report_json=report_json,
            operational=operational,
            events=event_items,
        )
