from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Sequence

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.build_request import (
    BuildRequest,
    BuildRequestAttachment,
    BuildRequestMessage,
    BuildRequestTimelineEvent,
)
from app.repositories.build_request_repository import BuildRequestRepository
from app.schemas.build_request import (
    BuildRequestCreate,
    BuildRequestListItem,
    BuildRequestResponse,
    BuildRequestStatus,
    BuildRequestTimelineEventType,
    BuildRequestUpdate,
    MessageCreate,
    MessageResponse,
    TimelineEventResponse,
)

from app.services.storage.base_storage import StorageProvider
from app.services.storage.local_storage import LocalStorageProvider
from app.utils.upload_validation import validate_uploads

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    "SUBMITTED": {"ACCEPTED", "CANCELLED"},
    "ACCEPTED": {"PLANNING", "CANCELLED"},
    "PLANNING": {"UI_DESIGN", "CANCELLED"},
    "UI_DESIGN": {"BACKEND", "CANCELLED"},
    "BACKEND": {"FRONTEND", "CANCELLED"},
    "FRONTEND": {"TESTING", "CANCELLED"},
    "TESTING": {"DEPLOYMENT", "CANCELLED"},
    "DEPLOYMENT": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}

STATUS_TIMELINE_MAPPING: dict[str, tuple[BuildRequestTimelineEventType, str]] = {
    "ACCEPTED": (BuildRequestTimelineEventType.REQUEST_ACCEPTED, "Build Request Accepted"),
    "PLANNING": (BuildRequestTimelineEventType.PLANNING_STARTED, "Planning Phase Started"),
    "UI_DESIGN": (BuildRequestTimelineEventType.UI_DESIGN_STARTED, "UI Design Phase Started"),
    "BACKEND": (BuildRequestTimelineEventType.BACKEND_STARTED, "Backend Development Started"),
    "FRONTEND": (BuildRequestTimelineEventType.FRONTEND_STARTED, "Frontend Development Started"),
    "TESTING": (BuildRequestTimelineEventType.TESTING_STARTED, "Testing & QA Started"),
    "DEPLOYMENT": (BuildRequestTimelineEventType.DEPLOYMENT_STARTED, "Deployment Phase Started"),
    "COMPLETED": (BuildRequestTimelineEventType.PROJECT_COMPLETED, "Build Request Completed"),
    "CANCELLED": (BuildRequestTimelineEventType.PROJECT_CANCELLED, "Build Request Cancelled"),
}

ADMIN_ONLY_STATUSES: set[str] = {
    "ACCEPTED",
    "PLANNING",
    "UI_DESIGN",
    "BACKEND",
    "FRONTEND",
    "TESTING",
    "DEPLOYMENT",
    "COMPLETED",
}


class BuildRequestService:
    def __init__(self, db: AsyncSession, storage_provider: StorageProvider | None = None) -> None:
        self.repository = BuildRequestRepository(db)
        self.storage_provider = storage_provider or LocalStorageProvider(root_dir="./uploads/build_requests")

    async def create_request(
        self, founder: UserORM, data: BuildRequestCreate, idempotency_key: str | None = None
    ) -> BuildRequestResponse:
        key = idempotency_key or data.idempotency_key
        if key:
            existing = await self.repository.get_by_idempotency_key(founder.id, key)
            if existing:
                logger.info(f"Returning idempotent build request for founder {founder.id} with key {key}")
                return self._to_response(existing)

        now = datetime.now(timezone.utc)
        request_id = str(uuid.uuid4())

        request = BuildRequest(
            id=request_id,
            founder_id=founder.id,
            title=data.title,
            startup_name=data.startup_name,
            description=data.description,
            product_category=data.product_category,
            target_customer=data.target_customer,
            target_market=data.target_market,
            founder_stage=data.founder_stage,
            priority=data.priority.value if isinstance(data.priority, Enum) else str(data.priority),
            status="SUBMITTED",
            estimated_duration_days=data.estimated_duration_days,
            current_phase=data.current_phase,
            current_work=data.current_work,
            current_milestone=data.current_milestone,
            progress_percentage=0,
            execution_mode=data.execution_mode,
            version=data.version,
            is_archived=False,
            extra_metadata=data.extra_metadata,
            idempotency_key=key,
            founder_unread_count=0,
            admin_unread_count=0,
            project_slug=data.project_slug,
            project_id=data.project_id,
            workspace_id=data.workspace_id,
            created_at=now,
            updated_at=now,
            submitted_at=now,
        )

        # Automatic timeline event insertion on creation
        initial_event = BuildRequestTimelineEvent(
            id=str(uuid.uuid4()),
            build_request_id=request_id,
            event_type=BuildRequestTimelineEventType.REQUEST_CREATED.value,
            title="Build Request Submitted",
            description=f"Build Request '{data.title}' was created and submitted.",
            created_at=now,
        )
        request.timeline_events.append(initial_event)

        saved_request = await self.repository.create_request(request)
        try:
            from app.services.notification_service import NotificationService
            await NotificationService(self.repository.db).notify_build_request_created(founder.id, saved_request.id, saved_request.title)
        except Exception as ex:
            logger.warning(f"Failed to send build request creation notification: {ex}")
        return self._to_response(saved_request)



    async def update_request(
        self, founder: UserORM, request_id: str, data: BuildRequestUpdate, is_admin: bool = False
    ) -> BuildRequestResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=True)
        dump = data.model_dump(exclude_unset=True)

        old_progress = request.progress_percentage
        old_status = request.status

        if "status" in dump and dump["status"] is not None:
            new_status = dump["status"].value if isinstance(dump["status"], Enum) else str(dump["status"])
            self._validate_and_apply_status_transition(request, new_status, is_admin=is_admin)

        for field, value in dump.items():
            if field == "status":
                continue
            val = value.value if isinstance(value, Enum) else value
            setattr(request, field, val)

        # Automatic progress timeline event generation
        if "progress_percentage" in dump and dump["progress_percentage"] != old_progress:
            new_progress = dump["progress_percentage"]
            progress_event = BuildRequestTimelineEvent(
                id=str(uuid.uuid4()),
                build_request_id=request.id,
                event_type=BuildRequestTimelineEventType.STATUS_UPDATED.value,
                title="Progress Updated",
                description=f"Progress updated to {new_progress}%.",
                created_at=datetime.now(timezone.utc),
            )
            request.timeline_events.append(progress_event)
            await self.repository.add_timeline_event(progress_event)

        updated_req = await self.repository.update_request(request)
        return self._to_response(updated_req)

    async def get_request(self, founder: UserORM, request_id: str, include_archived: bool = False) -> BuildRequestResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=include_archived)
        return self._to_response(request)

    async def list_requests(self, founder: UserORM, **filters: Any) -> tuple[list[BuildRequestListItem], int]:
        requests, total = await self.repository.list_founder_requests(founder.id, **filters)
        return [BuildRequestListItem.model_validate(req) for req in requests], total


    async def upload_attachments(
        self, founder: UserORM, request_id: str, files: list[UploadFile]
    ) -> BuildRequestResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=True)

        if len(request.attachments) + len(files) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attachment limit exceeded. Maximum 10 attachments allowed per request.",
            )

            await validate_uploads(files)

        for file in files:
            extension = os.path.splitext(file.filename or "")[1].lower()

            content = await file.read()
            storage_name = f"{uuid.uuid4()}{extension}"
            storage_path = await self.storage_provider.store(
                content=content,
                filename=storage_name,
                mime_type=file.content_type or "application/octet-stream",
            )
            attachment_id = str(uuid.uuid4())
            attachment = BuildRequestAttachment(
                id=attachment_id,
                build_request_id=request.id,
                filename=storage_name,
                original_filename=file.filename or "unknown",
                mime_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                storage_path=storage_path,
                download_url=f"/api/v1/build-requests/{request.id}/attachments/{attachment_id}",
                created_at=datetime.now(timezone.utc),
            )
            request.attachments.append(attachment)
            await self.repository.add_attachment(attachment)
        return self._to_response(request)


    async def get_attachment_path(self, founder: UserORM, request_id: str, attachment_id: str) -> tuple[str, str, str]:
        """Secure download verification: confirms attachment belongs to build request AND build request belongs to founder."""
        request = await self._owned_request(founder.id, request_id, include_archived=True)
        attachment = next((att for att in request.attachments if att.id == attachment_id), None)
        if not attachment or not os.path.isfile(attachment.storage_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
        return attachment.storage_path, attachment.mime_type, attachment.original_filename

    async def get_timeline(self, founder: UserORM, request_id: str) -> list[TimelineEventResponse]:
        await self._owned_request(founder.id, request_id, include_archived=True)
        events = await self.repository.get_timeline(request_id)
        return [TimelineEventResponse.model_validate(ev) for ev in events]

    async def post_message(
        self, founder: UserORM, request_id: str, data: MessageCreate, sender_type: str = "FOUNDER"
    ) -> MessageResponse:
        request = await self._owned_request(founder.id, request_id, include_archived=True)
        now = datetime.now(timezone.utc)

        msg = BuildRequestMessage(
            id=str(uuid.uuid4()),
            build_request_id=request.id,
            sender_type=sender_type,
            sender_id=founder.id if sender_type == "FOUNDER" else "ADMIN",
            message=data.message,
            is_read=False,
            read_at=None,
            created_at=now,
        )
        saved_msg = await self.repository.add_message(msg)
        request.messages.append(saved_msg)

        # Update unread count
        if sender_type == "FOUNDER":
            request.admin_unread_count += 1
        else:
            request.founder_unread_count += 1
        await self.repository.update_request(request)

        # Automatic timeline event generation for message posted
        msg_event = BuildRequestTimelineEvent(
            id=str(uuid.uuid4()),
            build_request_id=request.id,
            event_type=BuildRequestTimelineEventType.MESSAGE_POSTED.value,
            title="Message Posted",
            description=f"New message posted by {sender_type}.",
            created_at=now,
        )
        request.timeline_events.append(msg_event)
        await self.repository.add_timeline_event(msg_event)

        if sender_type != "FOUNDER":
            try:
                from app.services.notification_service import NotificationService
                await NotificationService(self.repository.db).notify_build_message_received(
                    founder.id, request.id, request.title, data.message
                )
            except Exception as ex:
                logger.warning(f"Failed to send build message notification: {ex}")

        return MessageResponse.model_validate(saved_msg)

    async def get_messages(self, founder: UserORM, request_id: str) -> list[MessageResponse]:
        request = await self._owned_request(founder.id, request_id, include_archived=True)

        # Reset founder unread count upon viewing messages
        if request.founder_unread_count > 0:
            request.founder_unread_count = 0
            await self.repository.update_request(request)

        messages = await self.repository.get_messages(request_id)
        return [MessageResponse.model_validate(m) for m in messages]

    async def compute_analytics(self, founder: UserORM, include_archived: bool = False) -> dict[str, Any]:
        return await self.repository.analytics(founder.id, include_archived=include_archived)

    async def _owned_request(self, founder_id: str, request_id: str, include_archived: bool = False) -> BuildRequest:
        request = await self.repository.get_request(request_id, founder_id, include_archived=include_archived)
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Build request not found.")
        return request

    def _validate_and_apply_status_transition(
        self, request: BuildRequest, new_status: str, is_admin: bool = False
    ) -> None:
        old_status = request.status
        if old_status == new_status:
            return

        valid_next = VALID_TRANSITIONS.get(old_status, set())
        if new_status not in valid_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status} to {new_status}.",
            )

        if not is_admin and new_status in ADMIN_ONLY_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Founders cannot self-promote request to this administrative status.",
            )

        now = datetime.now(timezone.utc)
        request.status = new_status

        if new_status == "ACCEPTED" and not request.accepted_at:
            request.accepted_at = now
        elif new_status in ("PLANNING", "UI_DESIGN", "BACKEND", "FRONTEND") and not request.started_at:
            request.started_at = now
        elif new_status == "COMPLETED":
            request.completed_at = now
            request.progress_percentage = 100
        elif new_status == "CANCELLED" and not request.cancelled_at:
            request.cancelled_at = now

        # Automatic timeline event insertion on status transition
        if new_status in STATUS_TIMELINE_MAPPING:
            ev_type, ev_title = STATUS_TIMELINE_MAPPING[new_status]
            status_event = BuildRequestTimelineEvent(
                id=str(uuid.uuid4()),
                build_request_id=request.id,
                event_type=ev_type.value,
                title=ev_title,
                description=f"Build request status transitioned from {old_status} to {new_status}.",
                created_at=now,
            )
            request.timeline_events.append(status_event)
            self.repository.db.add(status_event)


    @staticmethod
    def _to_response(request: BuildRequest) -> BuildRequestResponse:
        return BuildRequestResponse.model_validate(request)
