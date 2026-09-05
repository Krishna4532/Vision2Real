from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.reality_sprint import RealitySprint, RealitySprintActivity
from app.repositories.admin.admin_reality_sprints_repository import AdminRealitySprintRepository
from app.schemas.admin_reality_sprints import (
    AdminRealitySprintListItem,
    AdminRealitySprintDetailResponse,
    AdminFounderInfo,
    PaginatedRealitySprintsResponse,
    RealitySprintActivityItem,
    RealitySprintMilestoneItem,
    RealitySprintAttachmentResponse,
)
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCategory, NotificationPriority, NotificationType

logger = logging.getLogger(__name__)

DEFAULT_MILESTONES = [
    {
        "id": "m1",
        "title": "Market & Competitor Alignment",
        "description": "Deep-dive analysis into TAM, target customer personas, and competing offerings.",
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "m2",
        "title": "Value Proposition Architecture",
        "description": "Defining unique differentiation, core features, and MVP scope.",
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "m3",
        "title": "Go-to-Market Strategy",
        "description": "Customer acquisition channels, pricing structure, and distribution plan.",
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "m4",
        "title": "Technical Blueprint & Roadmap",
        "description": "High-level architecture, tech stack selection, and build timeline estimation.",
        "completed": False,
        "completed_at": None,
    },
    {
        "id": "m5",
        "title": "Final Sprint Delivery Report",
        "description": "Comprehensive report synthesis with actionable next steps for product build.",
        "completed": False,
        "completed_at": None,
    },
]


class AdminRealitySprintService:
    """Service layer managing business logic and state machine transitions for Reality Sprints."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AdminRealitySprintRepository(session)
        self.notification_service = NotificationService(session)

    async def list_reality_sprints(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        founder_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedRealitySprintsResponse:
        rows, total = await self.repo.list_reality_sprints(
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            founder_id=founder_id,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        items: list[AdminRealitySprintListItem] = []
        for sprint, founder in rows:
            extra = sprint.extra_metadata or {}
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
                    founder_stage=sprint.founder_stage,
                    role=getattr(founder, "role", "FOUNDER"),
                )
                if founder
                else None
            )

            desc = sprint.description or ""
            snippet = desc[:120] + "…" if len(desc) > 120 else desc
            progress = extra.get("progress", 0)

            items.append(
                AdminRealitySprintListItem(
                    id=sprint.id,
                    title=sprint.title,
                    startup_name=sprint.startup_name,
                    description_snippet=snippet,
                    status=sprint.status,
                    priority=sprint.priority,
                    progress=progress,
                    created_at=sprint.created_at,
                    updated_at=sprint.updated_at,
                    founder=founder_info,
                )
            )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return PaginatedRealitySprintsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_reality_sprint_detail(self, sprint_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        extra = sprint.extra_metadata or {}
        phone = (
            getattr(sprint.founder, "phone_number", None)
            or getattr(sprint.founder, "phone", None)
            or getattr(sprint.founder, "mobile_number", None)
            or getattr(sprint.founder, "contact_number", None)
            or extra.get("contact_phone")
            or extra.get("phone")
            or extra.get("phone_number")
        )

        founder_info = (
            AdminFounderInfo(
                id=sprint.founder.id,
                full_name=sprint.founder.full_name,
                email=sprint.founder.email,
                phone_number=phone,
                founder_stage=sprint.founder_stage,
                role=getattr(sprint.founder, "role", "FOUNDER"),
            )
            if sprint.founder
            else (
                AdminFounderInfo(
                    id=sprint.founder_id or "unassigned",
                    full_name=extra.get("contact_name", "Unassigned Founder"),
                    email=extra.get("contact_email", "N/A"),
                    phone_number=phone,
                    founder_stage=sprint.founder_stage,
                    role="FOUNDER",
                )
                if extra.get("contact_email") or extra.get("contact_name")
                else None
            )
        )

        progress = extra.get("progress", 0)
        raw_milestones = extra.get("milestones", [])
        milestones = [
            RealitySprintMilestoneItem(
                id=m.get("id", f"m_{idx}"),
                title=m.get("title", ""),
                description=m.get("description"),
                completed=m.get("completed", False),
                completed_at=m.get("completed_at"),
            )
            for idx, m in enumerate(raw_milestones)
        ]

        activities = [
            RealitySprintActivityItem(
                id=act.id,
                actor_id=act.actor_id,
                actor_role=act.actor_role,
                event_type=act.event_type,
                metadata_json=act.metadata_json,
                created_at=act.created_at,
            )
            for act in (sprint.activities or [])
        ]
        activities.sort(key=lambda a: a.created_at, reverse=True)

        attachments = [
            RealitySprintAttachmentResponse(
                id=att.id,
                reality_sprint_id=sprint.id,
                filename=att.filename,
                original_filename=att.original_filename,
                mime_type=att.mime_type,
                file_size=att.file_size,
                storage_path=att.storage_path,
                download_url=f"/api/v1/admin/reality-sprints/{sprint.id}/attachments/{att.id}",
                created_at=att.created_at,
            )
            for att in (sprint.attachments or [])
        ]

        return AdminRealitySprintDetailResponse(
            id=sprint.id,
            title=sprint.title,
            startup_name=sprint.startup_name,
            description=sprint.description,
            target_customer=sprint.target_customer,
            target_market=sprint.target_market,
            founder_stage=sprint.founder_stage,
            status=sprint.status,
            priority=sprint.priority,
            progress=progress,
            created_at=sprint.created_at,
            updated_at=sprint.updated_at,
            submitted_at=sprint.submitted_at,
            review_started_at=sprint.review_started_at,
            accepted_at=sprint.accepted_at,
            started_at=sprint.started_at,
            completed_at=sprint.completed_at,
            cancelled_at=sprint.cancelled_at,
            founder=founder_info,
            milestones=milestones,
            activities=activities,
            attachments=attachments,
            extra_metadata=extra,
        )

    async def get_attachment_path(self, sprint_id: str, attachment_id: str) -> tuple[str, str, str]:
        """Fetch attachment storage path, mime type, and filename for secure download."""
        att = await self.repo.get_attachment_by_id(sprint_id, attachment_id)
        if not att or not os.path.exists(att.storage_path):
            raise HTTPException(status_code=404, detail="Attachment file not found.")
        return att.storage_path, att.mime_type, att.original_filename

    # ── State Machine Workflow Transitions ────────────────────────────────────

    async def approve_sprint(self, sprint_id: str, admin_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        valid_initial_statuses = ("SUBMITTED", "PENDING", "UNDER_REVIEW", "DRAFT")
        if sprint.status not in valid_initial_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve sprint in '{sprint.status}' status. Must be pending approval.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "ACCEPTED"
        sprint.accepted_at = now
        sprint.updated_at = now

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_APPROVED",
            metadata_json={"title": sprint.title, "approved_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint Approved",
            body=f"Your Reality Sprint '{sprint.title}' has been approved by Admin HQ.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def reject_sprint(
        self, sprint_id: str, admin_id: str, reason: Optional[str] = None
    ) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        valid_initial_statuses = ("SUBMITTED", "PENDING", "UNDER_REVIEW", "DRAFT")
        if sprint.status not in valid_initial_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject sprint in '{sprint.status}' status.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "CANCELLED"
        sprint.cancelled_at = now
        sprint.updated_at = now

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_REJECTED",
            metadata_json={"reason": reason or "Request rejected by Super Admin", "rejected_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint Request Rejected",
            body=f"Your Reality Sprint '{sprint.title}' request was not approved.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def start_sprint(self, sprint_id: str, admin_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        if sprint.status not in ("ACCEPTED", "APPROVED", "SCHEDULED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start sprint in '{sprint.status}' status. Sprint must be approved first.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "IN_PROGRESS"
        if not sprint.started_at:
            sprint.started_at = now
        sprint.updated_at = now

        extra = dict(sprint.extra_metadata or {})
        if "milestones" not in extra or not extra["milestones"]:
            extra["milestones"] = DEFAULT_MILESTONES
        if "progress" not in extra:
            extra["progress"] = 10
        sprint.extra_metadata = extra

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_STARTED",
            metadata_json={"started_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint In Progress",
            body=f"Execution has officially started for Reality Sprint '{sprint.title}'.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def pause_sprint(self, sprint_id: str, admin_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        if sprint.status != "IN_PROGRESS":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot pause sprint in '{sprint.status}' status. Only IN_PROGRESS sprints can be paused.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "PAUSED"
        sprint.updated_at = now

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_PAUSED",
            metadata_json={"paused_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint Paused",
            body=f"Reality Sprint '{sprint.title}' has been temporarily paused by Admin HQ.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def resume_sprint(self, sprint_id: str, admin_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        if sprint.status != "PAUSED":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot resume sprint in '{sprint.status}' status. Only PAUSED sprints can be resumed.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "IN_PROGRESS"
        sprint.updated_at = now

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_RESUMED",
            metadata_json={"resumed_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint Resumed",
            body=f"Execution has resumed for Reality Sprint '{sprint.title}'.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def update_progress(
        self,
        sprint_id: str,
        admin_id: str,
        progress: int,
        milestones: Optional[list[RealitySprintMilestoneItem]] = None,
    ) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        if sprint.status not in ("IN_PROGRESS", "PAUSED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot update progress for sprint in '{sprint.status}' status.",
            )

        now = datetime.now(timezone.utc)
        extra = dict(sprint.extra_metadata or {})
        extra["progress"] = progress

        if milestones is not None:
            extra["milestones"] = [m.model_dump() for m in milestones]

        sprint.extra_metadata = extra
        sprint.updated_at = now

        # Auto-complete if progress reaches 100
        if progress == 100 and sprint.status != "COMPLETED":
            sprint.status = "COMPLETED"
            sprint.completed_at = now

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_COMPLETED" if progress == 100 else "REALITY_SPRINT_PROGRESS_UPDATED",
            metadata_json={"progress": progress, "updated_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title=f"Reality Sprint Progress: {progress}%",
            body=f"Progress for Reality Sprint '{sprint.title}' updated to {progress}%.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    async def complete_sprint(self, sprint_id: str, admin_id: str) -> AdminRealitySprintDetailResponse:
        sprint = await self.repo.get_reality_sprint_by_id(sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Reality Sprint not found")

        if sprint.status not in ("IN_PROGRESS", "PAUSED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete sprint in '{sprint.status}' status.",
            )

        now = datetime.now(timezone.utc)
        sprint.status = "COMPLETED"
        sprint.completed_at = now
        sprint.updated_at = now

        extra = dict(sprint.extra_metadata or {})
        extra["progress"] = 100

        raw_milestones = extra.get("milestones", DEFAULT_MILESTONES)
        updated_ms = []
        for m in raw_milestones:
            m_copy = dict(m)
            m_copy["completed"] = True
            if not m_copy.get("completed_at"):
                m_copy["completed_at"] = now.isoformat()
            updated_ms.append(m_copy)

        extra["milestones"] = updated_ms
        sprint.extra_metadata = extra

        activity = RealitySprintActivity(
            reality_sprint_id=sprint.id,
            actor_id=admin_id,
            actor_role="SUPER_ADMIN",
            event_type="REALITY_SPRINT_COMPLETED",
            metadata_json={"completed_at": now.isoformat()},
        )
        await self.repo.add_activity(activity)
        await self.repo.save_sprint(sprint)

        await self._emit_notification_hook(
            sprint=sprint,
            title="Reality Sprint Completed 🎉",
            body=f"Congratulations! Reality Sprint '{sprint.title}' has been successfully completed.",
            notification_type=NotificationType.SYSTEM,
        )

        return await self.get_reality_sprint_detail(sprint_id)

    # ── Notification Hook Helper ─────────────────────────────────────────────

    async def _emit_notification_hook(
        self,
        sprint: RealitySprint,
        title: str,
        body: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
    ) -> None:
        try:
            if sprint.founder_id:
                await self.notification_service.publish(
                    founder_id=sprint.founder_id,
                    notification_type=notification_type,
                    category=NotificationCategory.REALITY_SPRINT,
                    priority=NotificationPriority.HIGH,
                    title=title,
                    body=body,
                    deep_link=f"/founder/reality-sprints/{sprint.id}",
                )
        except Exception as err:
            logger.warning(f"Failed to emit notification for sprint {sprint.id}: {err}")
