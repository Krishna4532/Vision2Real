from __future__ import annotations

from typing import Any, Dict, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.validation import (
    Validation,
    ValidationAttachment,
    ValidationEvent,
    ValidationInput,
    ValidationReport,
)
from app.schemas.validation import ValidationEventType


class ValidationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Validation CRUD ────────────────────────────────────────────────────────

    async def save(self, validation: Validation) -> Validation:
        self.db.add(validation)
        await self.db.commit()
        await self.db.refresh(validation)
        return validation

    async def get_by_id(
        self,
        validation_id: str,
        founder_id: str | None = None,
        guest_session_id: str | None = None,
    ) -> Validation | None:
        stmt = (
            select(Validation)
            .where(Validation.id == validation_id)
            .options(
                selectinload(Validation.inputs),
                selectinload(Validation.attachments),
                selectinload(Validation.events),
                selectinload(Validation.report),
            )
        )
        if founder_id:
            stmt = stmt.where(Validation.founder_id == founder_id)
        elif guest_session_id:
            stmt = stmt.where(Validation.guest_session_id == guest_session_id)

        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_founder(
        self,
        founder_id: str,
        page: int,
        page_size: int,
        search: str | None = None,
        recommendation: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Validation], int]:
        filters = [Validation.founder_id == founder_id]
        if recommendation:
            filters.append(Validation.recommendation == recommendation)
        if search:
            pattern = f"%{search}%"
            filters.append(
                select(ValidationInput.validation_id)
                .where(
                    (ValidationInput.idea_description.ilike(pattern))
                    | (ValidationInput.target_market.ilike(pattern))
                )
                .exists()
            )

        count_result = await self.db.execute(
            select(func.count()).select_from(Validation).where(*filters)
        )
        total = count_result.scalar_one()
        sort_column = Validation.overall_score if sort_by == "overall_score" else Validation.created_at
        order_expression = sort_column.asc() if sort_order == "asc" else sort_column.desc()
        result = await self.db.execute(
            select(Validation)
            .where(*filters)
            .options(selectinload(Validation.inputs), selectinload(Validation.report))
            .order_by(order_expression, Validation.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(result.scalars().all()), total

    # ── Related entities ────────────────────────────────────────────────────────

    async def add_input(self, validation_input: ValidationInput) -> ValidationInput:
        self.db.add(validation_input)
        await self.db.commit()
        await self.db.refresh(validation_input)
        return validation_input

    async def add_attachment(self, attachment: ValidationAttachment) -> ValidationAttachment:
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def save_event(
        self,
        validation_id: str,
        event_type: ValidationEventType,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ValidationEvent:
        event = ValidationEvent(
            validation_id=validation_id,
            event_type=event_type.value,
            metadata_json=metadata,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def save_report(self, validation_id: str, report_json: Dict[str, Any]) -> ValidationReport:
        report = ValidationReport(validation_id=validation_id, report_json=report_json)
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report
