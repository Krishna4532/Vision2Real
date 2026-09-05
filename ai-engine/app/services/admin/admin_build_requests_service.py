from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.build_request import BuildRequest, BuildRequestTimelineEvent
from app.repositories.admin.admin_build_requests_repository import AdminBuildRequestRepository
from app.schemas.admin_build_requests import (
    AdminBuildRequestListItem,
    AdminBuildRequestDetailResponse,
    AdminFounderInfo,
    PaginatedBuildRequestsResponse,
    BuildRequestMilestoneItem,
    BuildRequestOperationalNote,
    BuildRequestTimelineEventResponse,
    BuildRequestAttachmentResponse,
)
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCategory, NotificationPriority, NotificationType

logger = logging.getLogger(__name__)

DEFAULT_BUILD_MILESTONES = [
    {
        "id": "bm1",
        "title": "Architecture & Database Design",
        "description": "System architecture design, database schema definition, and API contract specification.",
        "order": 1,
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "bm2",
        "title": "Backend Core Implementation",
        "description": "Implementation of core business logic, database migrations, and authentication flows.",
        "order": 2,
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "bm3",
        "title": "Frontend UI & Component Assembly",
        "description": "Building interactive user interfaces, connecting design tokens, and state management.",
        "order": 3,
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "bm4",
        "title": "End-to-End Integration & Testing",
        "description": "Integration testing, security audit, edge case handling, and automated test suite.",
        "order": 4,
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "bm5",
        "title": "Staging Deployment & Review",
        "description": "Deploying build to staging environment for final operational review and release.",
        "order": 5,
        "completed": False,
        "completed_at": None,
    },
]


class AdminBuildRequestService:
    """Service layer managing state machine transitions and business rules for Build Requests."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AdminBuildRequestRepository(session)
        self.notification_service = NotificationService(session)

    async def list_build_requests(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        founder_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedBuildRequestsResponse:
        rows, total = await self.repo.list_build_requests(
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            priority=priority,
            founder_id=founder_id,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        items: list[AdminBuildRequestListItem] = []
        for req, founder in rows:
            extra = req.extra_metadata or {}
            phone = (
                getattr(founder, "phone_number", None)
                or getattr(founder, "phone", None)
                or getattr(founder, "mobile_number", None)
                or getattr(founder, "contact_number", None)
                or extra.get("contact_phone")
                or extra.get("phone")
                or extra.get("phone_number")
            )
            founder_info = (
                AdminFounderInfo(
                    id=founder.id,
                    full_name=founder.full_name,
                    email=founder.email,
                    phone_number=phone,
                )
                if founder
                else None
            )

            desc = req.description or ""
            snippet = desc[:120] + "…" if len(desc) > 120 else desc

            items.append(
                AdminBuildRequestListItem(
                    id=req.id,
                    founder_id=req.founder_id,
                    project_title=req.title,
                    startup_name=req.startup_name,
                    description_snippet=snippet,
                    product_category=req.product_category,
                    priority=req.priority,
                    status=req.status,
                    progress_percentage=req.progress_percentage,
                    current_phase=req.current_phase,
                    current_milestone=req.current_milestone,
                    created_at=req.created_at,
                    updated_at=req.updated_at,
                    founder=founder_info,
                )
            )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return PaginatedBuildRequestsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_build_request_detail(self, request_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        extra = req.extra_metadata or {}
        phone = (
            getattr(req.founder, "phone_number", None)
            or getattr(req.founder, "phone", None)
            or getattr(req.founder, "mobile_number", None)
            or getattr(req.founder, "contact_number", None)
            or extra.get("contact_phone")
            or extra.get("phone")
            or extra.get("phone_number")
        )

        founder_info = (
            AdminFounderInfo(
                id=req.founder.id,
                full_name=req.founder.full_name,
                email=req.founder.email,
                phone_number=phone,
                founder_stage=req.founder_stage,
                role=getattr(req.founder, "role", "FOUNDER"),
            )
            if req.founder
            else (
                AdminFounderInfo(
                    id=req.founder_id or "unassigned",
                    full_name=extra.get("contact_name", "Unassigned Founder"),
                    email=extra.get("contact_email", "N/A"),
                    phone_number=phone,
                    founder_stage=req.founder_stage,
                    role="FOUNDER",
                )
                if extra.get("contact_email") or extra.get("contact_name")
                else None
            )
        )

        extra = req.extra_metadata or {}
        raw_milestones = extra.get("milestones", [])
        milestones = [
            BuildRequestMilestoneItem(
                id=m.get("id", f"bm_{idx}"),
                title=m.get("title", ""),
                description=m.get("description"),
                order=m.get("order", idx + 1),
                completed=m.get("completed", False),
                completed_at=m.get("completed_at"),
            )
            for idx, m in enumerate(raw_milestones)
        ]

        raw_notes = extra.get("operational_notes", [])
        operational_notes = [
            BuildRequestOperationalNote(
                id=n.get("id", str(uuid.uuid4())),
                author_id=n.get("author_id"),
                author_name=n.get("author_name", "Super Admin"),
                content=n.get("content", ""),
                created_at=datetime.fromisoformat(n["created_at"]) if isinstance(n.get("created_at"), str) else datetime.now(timezone.utc),
            )
            for n in raw_notes
        ]

        attachments = [
            BuildRequestAttachmentResponse(
                id=att.id,
                filename=att.filename,
                original_filename=att.original_filename,
                mime_type=att.mime_type,
                file_size=att.file_size,
                download_url=f"/api/v1/admin/build-requests/{req.id}/attachments/{att.id}",
                created_at=att.created_at,
            )
            for att in (req.attachments or [])
        ]

        timeline_events = [
            BuildRequestTimelineEventResponse(
                id=evt.id,
                event_type=evt.event_type,
                title=evt.title,
                description=evt.description,
                created_at=evt.created_at,
            )
            for evt in (req.timeline_events or [])
        ]
        timeline_events.sort(key=lambda e: e.created_at, reverse=True)

        return AdminBuildRequestDetailResponse(
            id=req.id,
            founder_id=req.founder_id,
            title=req.title,
            startup_name=req.startup_name,
            description=req.description,
            product_category=req.product_category,
            target_customer=req.target_customer,
            target_market=req.target_market,
            founder_stage=req.founder_stage,
            priority=req.priority,
            status=req.status,
            estimated_duration_days=req.estimated_duration_days,
            current_phase=req.current_phase,
            current_work=req.current_work,
            current_milestone=req.current_milestone,
            progress_percentage=req.progress_percentage,
            execution_mode=req.execution_mode,
            version=req.version,
            created_at=req.created_at,
            updated_at=req.updated_at,
            submitted_at=req.submitted_at,
            accepted_at=req.accepted_at,
            started_at=req.started_at,
            completed_at=req.completed_at,
            cancelled_at=req.cancelled_at,
            expected_completion_at=req.expected_completion_at,
            founder=founder_info,
            attachments=attachments,
            timeline_events=timeline_events,
            milestones=milestones,
            operational_notes=operational_notes,
            extra_metadata=extra,
        )

    # ── State Machine Workflow Transitions ────────────────────────────────────

    async def approve_build_request(self, request_id: str, admin_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        valid_initial_statuses = ("SUBMITTED", "PENDING", "UNDER_REVIEW", "DRAFT")
        if req.status not in valid_initial_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve build request in '{req.status}' status.",
            )

        now = datetime.now(timezone.utc)
        req.status = "APPROVED"
        req.accepted_at = now
        req.updated_at = now

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_APPROVED",
            title="Build Request Approved",
            description="Build request approved by Admin HQ. Ready to commence development.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Build Request Approved",
            body=f"Your product development request '{req.title}' has been approved by Admin HQ.",
        )

        return await self.get_build_request_detail(request_id)

    async def reject_build_request(
        self, request_id: str, admin_id: str, reason: Optional[str] = None
    ) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        valid_initial_statuses = ("SUBMITTED", "PENDING", "UNDER_REVIEW", "DRAFT")
        if req.status not in valid_initial_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject build request in '{req.status}' status.",
            )

        now = datetime.now(timezone.utc)
        req.status = "REJECTED"
        req.cancelled_at = now
        req.updated_at = now

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_REJECTED",
            title="Build Request Rejected",
            description=reason or "Build request was not approved.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Build Request Rejected",
            body=f"Your product development request '{req.title}' was not approved.",
        )

        return await self.get_build_request_detail(request_id)

    async def start_development(self, request_id: str, admin_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        if req.status not in ("APPROVED", "ACCEPTED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start development for build in '{req.status}' status. Request must be approved first.",
            )

        now = datetime.now(timezone.utc)
        req.status = "IN_PROGRESS"
        if not req.started_at:
            req.started_at = now
        req.current_phase = "Phase 1: Architecture & Core Implementation"
        req.updated_at = now

        extra = dict(req.extra_metadata or {})
        if "milestones" not in extra or not extra["milestones"]:
            extra["milestones"] = DEFAULT_BUILD_MILESTONES
        req.extra_metadata = extra

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_STARTED",
            title="Development Started",
            description="Active software development has officially commenced.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Development Started",
            body=f"Active development has started for '{req.title}'.",
        )

        return await self.get_build_request_detail(request_id)

    async def pause_development(self, request_id: str, admin_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        if req.status != "IN_PROGRESS":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot pause development in '{req.status}' status. Only IN_PROGRESS builds can be paused.",
            )

        now = datetime.now(timezone.utc)
        req.status = "PAUSED"
        req.updated_at = now

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_PAUSED",
            title="Development Paused",
            description="Development temporarily paused by Admin HQ.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Development Paused",
            body=f"Development on '{req.title}' has been temporarily paused.",
        )

        return await self.get_build_request_detail(request_id)

    async def resume_development(self, request_id: str, admin_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        if req.status != "PAUSED":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot resume development in '{req.status}' status. Only PAUSED builds can be resumed.",
            )

        now = datetime.now(timezone.utc)
        req.status = "IN_PROGRESS"
        req.updated_at = now

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_RESUMED",
            title="Development Resumed",
            description="Development execution has resumed.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Development Resumed",
            body=f"Development on '{req.title}' has resumed.",
        )

        return await self.get_build_request_detail(request_id)

    async def update_progress(
        self,
        request_id: str,
        admin_id: str,
        progress_percentage: int,
        current_phase: Optional[str] = None,
        current_milestone: Optional[str] = None,
        milestones: Optional[list[BuildRequestMilestoneItem]] = None,
    ) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        if req.status not in ("IN_PROGRESS", "PAUSED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot update progress for build in '{req.status}' status.",
            )

        now = datetime.now(timezone.utc)
        req.progress_percentage = progress_percentage
        if current_phase is not None:
            req.current_phase = current_phase
        if current_milestone is not None:
            req.current_milestone = current_milestone

        extra = dict(req.extra_metadata or {})
        if milestones is not None:
            extra["milestones"] = [m.model_dump() for m in milestones]
        req.extra_metadata = extra
        req.updated_at = now

        # Auto-complete if progress reaches 100%
        if progress_percentage == 100 and req.status != "COMPLETED":
            req.status = "COMPLETED"
            req.completed_at = now

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_COMPLETED" if progress_percentage == 100 else "BUILD_PROGRESS_UPDATED",
            title=f"Progress Updated ({progress_percentage}%)",
            description=f"Development progress updated to {progress_percentage}%. Current Phase: {req.current_phase or 'In Progress'}.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title=f"Build Progress: {progress_percentage}%",
            body=f"Progress for '{req.title}' updated to {progress_percentage}%.",
        )

        return await self.get_build_request_detail(request_id)

    async def complete_development(self, request_id: str, admin_id: str) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        if req.status not in ("IN_PROGRESS", "PAUSED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete development in '{req.status}' status.",
            )

        now = datetime.now(timezone.utc)
        req.status = "COMPLETED"
        req.progress_percentage = 100
        req.completed_at = now
        req.current_phase = "Phase 5: Release & Staging Completed"
        req.updated_at = now

        extra = dict(req.extra_metadata or {})
        raw_milestones = extra.get("milestones", DEFAULT_BUILD_MILESTONES)
        updated_ms = []
        for m in raw_milestones:
            m_copy = dict(m)
            m_copy["completed"] = True
            if not m_copy.get("completed_at"):
                m_copy["completed_at"] = now.isoformat()
            updated_ms.append(m_copy)
        extra["milestones"] = updated_ms
        req.extra_metadata = extra

        event = BuildRequestTimelineEvent(
            build_request_id=req.id,
            event_type="BUILD_COMPLETED",
            title="Development Completed",
            description="Software product build successfully completed and ready for release.",
        )
        await self.repo.add_timeline_event(event)
        await self.repo.save_build_request(req)

        await self._emit_notification_hook(
            req=req,
            title="Build Completed 🎉",
            body=f"Congratulations! Development for '{req.title}' has been successfully completed.",
        )

        return await self.get_build_request_detail(request_id)

    async def add_operational_note(
        self, request_id: str, admin_id: str, content: str
    ) -> AdminBuildRequestDetailResponse:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")

        now = datetime.now(timezone.utc)
        extra = dict(req.extra_metadata or {})
        notes = extra.get("operational_notes", [])

        note_item = {
            "id": str(uuid.uuid4()),
            "author_id": admin_id,
            "author_name": "Super Admin",
            "content": content,
            "created_at": now.isoformat(),
        }
        notes.insert(0, note_item)
        extra["operational_notes"] = notes
        req.extra_metadata = extra
        req.updated_at = now

        await self.repo.save_build_request(req)
        return await self.get_build_request_detail(request_id)

    async def get_attachment_path(self, request_id: str, attachment_id: str) -> tuple[str, str, str]:
        req = await self.repo.get_build_request_by_id(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Build Request not found")
        attachment = next((att for att in (req.attachments or []) if att.id == attachment_id), None)
        if not attachment or not os.path.isfile(attachment.storage_path):
            raise HTTPException(status_code=404, detail="Attachment file not found")
        return attachment.storage_path, attachment.mime_type, attachment.original_filename

    # ── Notification Hook Helper ─────────────────────────────────────────────

    async def _emit_notification_hook(
        self,
        req: BuildRequest,
        title: str,
        body: str,
    ) -> None:
        try:
            if req.founder_id:
                await self.notification_service.publish(
                    founder_id=req.founder_id,
                    notification_type=NotificationType.SYSTEM,
                    category=NotificationCategory.BUILD_REQUEST,
                    priority=NotificationPriority.HIGH,
                    title=title,
                    body=body,
                    deep_link=f"/founder/build-requests/{req.id}",
                )
        except Exception as err:
            logger.warning(f"Failed to emit notification for build request {req.id}: {err}")
