from __future__ import annotations

import logging
import json
from datetime import datetime, time, timezone
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotificationPreference, PushSubscription
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationType, NotificationCategory, NotificationPriority

logger = logging.getLogger(__name__)

# Fallback VAPID keys for local dev / testing if environment settings don't supply real keys
DEFAULT_VAPID_PUBLIC_KEY = (
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-S"
)
DEFAULT_VAPID_PRIVATE_KEY = "v2r_development_vapid_private_key_secret_placeholder"
DEFAULT_VAPID_CLAIMS = {"sub": "mailto:support@vision2real.ai"}


def is_quiet_hours(start_str: str, end_str: str, now_dt: Optional[datetime] = None) -> bool:
    """Check if current time falls within founder's quiet hours (HH:MM format)."""
    try:
        if not now_dt:
            now_dt = datetime.now(timezone.utc)
        current_time = now_dt.time()

        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))

        start_time = time(sh, sm)
        end_time = time(eh, em)

        if start_time <= end_time:
            return start_time <= current_time <= end_time
        else:  # Overnight range (e.g. 22:00 -> 08:00)
            return current_time >= start_time or current_time <= end_time
    except Exception as err:
        logger.warning(f"Error parsing quiet hours ({start_str}-{end_str}): {err}")
        return False


def is_category_enabled(pref: NotificationPreference, category: str) -> bool:
    cat = category.upper()
    if cat == NotificationCategory.VALIDATION.value:
        return pref.validation_notifications
    elif cat == NotificationCategory.REALITY_SPRINT.value:
        return pref.sprint_notifications
    elif cat == NotificationCategory.BUILD_REQUEST.value:
        return pref.build_notifications
    elif cat == NotificationCategory.MARKETING.value:
        return pref.marketing_notifications
    elif cat == NotificationCategory.SYSTEM.value:
        return pref.system_notifications
    return True


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = NotificationRepository(db)

    async def publish(
        self,
        founder_id: str,
        notification_type: str | NotificationType,
        category: str | NotificationCategory,
        title: str,
        body: str,
        deep_link: str = "/founder/notifications",
        action_label: str = "View Details",
        priority: str | NotificationPriority = NotificationPriority.NORMAL,
        source_module: str | None = None,
        source_record_id: str | None = None,
        extra_metadata: Dict[str, Any] | None = None,
        expires_at: datetime | None = None,
    ) -> Notification | None:
        """Centralized notification publish pipeline.

        1. Evaluates founder preferences & quiet hours
        2. Persists DB record
        3. Dispatches Web Push to active subscriptions if enabled
        """
        try:
            type_str = notification_type.value if isinstance(notification_type, NotificationType) else str(notification_type)
            cat_str = category.value if isinstance(category, NotificationCategory) else str(category)
            prio_str = priority.value if isinstance(priority, NotificationPriority) else str(priority)

            pref = await self.repo.get_or_create_preferences(founder_id)

            # Check category preference
            if not is_category_enabled(pref, cat_str):
                logger.info(f"Notification suppressed for founder {founder_id}: category {cat_str} disabled in preferences")
                return None

            # Create notification DB record
            notification = Notification(
                founder_id=founder_id,
                notification_type=type_str,
                category=cat_str,
                title=title,
                body=body,
                deep_link=deep_link,
                action_label=action_label,
                priority=prio_str,
                source_module=source_module,
                source_record_id=source_record_id,
                extra_metadata=extra_metadata or {},
                expires_at=expires_at,
            )
            saved = await self.repo.create_notification(notification)

            # Check browser push permission & quiet hours for push dispatch
            if pref.browser_push_enabled:
                in_quiet = pref.quiet_hours_enabled and is_quiet_hours(pref.quiet_hours_start, pref.quiet_hours_end)
                if not in_quiet:
                    await self._dispatch_web_push(founder_id, saved)
                else:
                    logger.info(f"Web Push suppressed for founder {founder_id} during quiet hours ({pref.quiet_hours_start}-{pref.quiet_hours_end})")

            return saved
        except Exception as err:
            logger.error(f"Error publishing notification for founder {founder_id}: {err}", exc_info=True)
            return None

    async def _dispatch_web_push(self, founder_id: str, notification: Notification) -> None:
        """Attempt to send Web Push payload to all active browser subscriptions for founder."""
        try:
            subs = await self.repo.get_founder_push_subscriptions(founder_id)
            if not subs:
                return

            payload = json.dumps({
                "id": notification.id,
                "type": notification.notification_type,
                "category": notification.category,
                "title": notification.title,
                "body": notification.body,
                "deep_link": notification.deep_link,
                "action_label": notification.action_label,
                "priority": notification.priority,
                "created_at": notification.created_at.isoformat(),
            })

            try:
                from pywebpush import webpush, WebPushException
            except ImportError:
                logger.warning("pywebpush package not installed; skipping browser Web Push delivery.")
                return

            for sub in subs:
                try:
                    subscription_info = {
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh_key,
                            "auth": sub.auth_key,
                        },
                    }
                    webpush(
                        subscription_info=subscription_info,
                        data=payload,
                        vapid_private_key=DEFAULT_VAPID_PRIVATE_KEY,
                        vapid_claims=DEFAULT_VAPID_CLAIMS,
                    )
                except WebPushException as ex:
                    # Clean up expired/invalid endpoints (404 Not Found or 410 Gone)
                    if ex.response is not None and ex.response.status_code in (404, 410):
                        logger.info(f"Removing invalid push subscription endpoint: {sub.endpoint}")
                        await self.repo.delete_subscription_by_endpoint(sub.endpoint)
                    else:
                        logger.warning(f"Web Push error for endpoint {sub.endpoint}: {ex}")
                except Exception as ex:
                    logger.warning(f"Failed to send Web Push to {sub.endpoint}: {ex}")

        except Exception as err:
            logger.error(f"Error in _dispatch_web_push: {err}")

    # ── Automatic Helper Triggers ─────────────────────────────────────────────

    async def notify_validation_started(self, founder_id: str, validation_id: str, idea_description: str) -> Notification | None:
        desc_short = idea_description[:60] + "…" if len(idea_description) > 60 else idea_description
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.VALIDATION_STARTED,
            category=NotificationCategory.VALIDATION,
            title="Validation Analysis Started 🔬",
            body=f"AI agents have initiated market research for: \"{desc_short}\"",
            deep_link=f"/founder/validations/{validation_id}",
            action_label="View Progress",
            source_module="validation",
            source_record_id=validation_id,
        )

    async def notify_validation_completed(self, founder_id: str, validation_id: str, score: float | int | None, recommendation: str | None) -> Notification | None:
        score_str = f"{score}/100" if score is not None else "Ready"
        rec_str = f" ({recommendation})" if recommendation else ""
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.VALIDATION_COMPLETED,
            category=NotificationCategory.VALIDATION,
            title="Validation Report Complete 🎉",
            body=f"Your market analysis report is ready! Overall Score: {score_str}{rec_str}.",
            deep_link=f"/founder/validations/{validation_id}",
            action_label="Open Report",
            priority=NotificationPriority.HIGH,
            source_module="validation",
            source_record_id=validation_id,
            extra_metadata={"score": score, "recommendation": recommendation},
        )

    async def notify_reality_sprint_submitted(self, founder_id: str, sprint_id: str, title: str) -> Notification | None:
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.REALITY_SPRINT_SUBMITTED,
            category=NotificationCategory.REALITY_SPRINT,
            title="Reality Sprint Submitted ⚡",
            body=f"Your request for \"{title}\" was received and queued for review.",
            deep_link=f"/founder/sprint/{sprint_id}",
            action_label="View Sprint",
            source_module="reality_sprint",
            source_record_id=sprint_id,
        )

    async def notify_reality_sprint_accepted(self, founder_id: str, sprint_id: str, title: str) -> Notification | None:
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.REALITY_SPRINT_ACCEPTED,
            category=NotificationCategory.REALITY_SPRINT,
            title="Reality Sprint Accepted! ✅",
            body=f"Your sprint for \"{title}\" has been accepted into development.",
            deep_link=f"/founder/sprint/{sprint_id}",
            action_label="View Roadmap",
            priority=NotificationPriority.HIGH,
            source_module="reality_sprint",
            source_record_id=sprint_id,
        )

    async def notify_reality_sprint_completed(self, founder_id: str, sprint_id: str, title: str) -> Notification | None:
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.REALITY_SPRINT_COMPLETED,
            category=NotificationCategory.REALITY_SPRINT,
            title="Reality Sprint Delivered! 🏁",
            body=f"Deliverables for \"{title}\" are ready in your Founder Workspace.",
            deep_link=f"/founder/sprint/{sprint_id}",
            action_label="Open Deliverables",
            priority=NotificationPriority.HIGH,
            source_module="reality_sprint",
            source_record_id=sprint_id,
        )

    async def notify_build_request_created(self, founder_id: str, request_id: str, title: str) -> Notification | None:
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.BUILD_REQUEST_CREATED,
            category=NotificationCategory.BUILD_REQUEST,
            title="Build Request Received 🚀",
            body=f"Your software build project \"{title}\" was successfully submitted.",
            deep_link=f"/founder/build-requests/{request_id}",
            action_label="View Project",
            source_module="build_request",
            source_record_id=request_id,
        )

    async def notify_build_phase_updated(self, founder_id: str, request_id: str, title: str, new_phase: str) -> Notification | None:
        phase_label = new_phase.replace("_", " ").title()
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.BUILD_PHASE_UPDATED,
            category=NotificationCategory.BUILD_REQUEST,
            title=f"Build Phase: {phase_label} ⚙️",
            body=f"Project \"{title}\" entered the {phase_label} development phase.",
            deep_link=f"/founder/build-requests/{request_id}",
            action_label="Track Progress",
            source_module="build_request",
            source_record_id=request_id,
            extra_metadata={"phase": new_phase},
        )

    async def notify_build_progress_updated(
        self, founder_id: str, request_id: str, title: str, progress_pct: int, milestone: str | None = None
    ) -> Notification | None:
        ms_str = f" — Milestone: {milestone}" if milestone else ""
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.BUILD_PROGRESS_UPDATED,
            category=NotificationCategory.BUILD_REQUEST,
            title=f"Build Progress: {progress_pct}% 📈",
            body=f"Project \"{title}\" is now {progress_pct}% complete{ms_str}.",
            deep_link=f"/founder/build-requests/{request_id}",
            action_label="View Timeline",
            source_module="build_request",
            source_record_id=request_id,
            extra_metadata={"progress_percentage": progress_pct, "milestone": milestone},
        )

    async def notify_build_message_received(self, founder_id: str, request_id: str, title: str, message_preview: str) -> Notification | None:
        preview = message_preview[:70] + "…" if len(message_preview) > 70 else message_preview
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.BUILD_MESSAGE_RECEIVED,
            category=NotificationCategory.BUILD_REQUEST,
            title="New Message from Vision2Real Team 💬",
            body=f"On \"{title}\": \"{preview}\"",
            deep_link=f"/founder/build-requests/{request_id}",
            action_label="Read Message",
            priority=NotificationPriority.HIGH,
            source_module="build_request",
            source_record_id=request_id,
        )

    async def notify_build_completed(self, founder_id: str, request_id: str, title: str) -> Notification | None:
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.BUILD_COMPLETED,
            category=NotificationCategory.BUILD_REQUEST,
            title="Build Project Delivered! 🎉",
            body=f"Full-stack development for \"{title}\" is complete. Your product is live!",
            deep_link=f"/founder/build-requests/{request_id}",
            action_label="Open Workspace",
            priority=NotificationPriority.HIGH,
            source_module="build_request",
            source_record_id=request_id,
        )

    async def notify_welcome(self, founder_id: str, full_name: str) -> Notification | None:
        firstName = full_name.split(" ")[0] if full_name else "Founder"
        return await self.publish(
            founder_id=founder_id,
            notification_type=NotificationType.WELCOME,
            category=NotificationCategory.SYSTEM,
            title=f"Welcome to Vision2Real, {firstName}! 👋",
            body="Your founder workspace is active. Start by validating an idea or exploring Reality Sprints.",
            deep_link="/founder",
            action_label="Explore Workspace",
            priority=NotificationPriority.HIGH,
            source_module="auth",
            source_record_id=founder_id,
        )
