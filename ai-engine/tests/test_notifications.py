import uuid
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from app.models import Base
from app.core.database import AsyncSessionLocal, engine, init_db
from app.models.auth import UserORM
from app.models.notification import Notification, NotificationPreference, PushSubscription
from app.repositories.notification_repository import NotificationRepository
from app.services.notification_service import NotificationService, is_quiet_hours
from app.schemas.notification import NotificationType, NotificationCategory, NotificationPriority


@pytest_asyncio.fixture
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_notification_repository_crud(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Test Founder Notifications",
        email=f"founder_notif_{uid}@example.com",
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    repo = NotificationRepository(db_session)

    # 1. Create notification
    notif = Notification(
        founder_id=founder.id,
        notification_type=NotificationType.VALIDATION_COMPLETED.value,
        category=NotificationCategory.VALIDATION.value,
        title="Validation Report Ready",
        body="Your market analysis is 88/100.",
        deep_link="/founder/validations/123",
        action_label="Open Report",
        priority=NotificationPriority.HIGH.value,
        source_module="validation",
        source_record_id="123",
        extra_metadata={"score": 88},
    )
    saved = await repo.create_notification(notif)
    assert saved.id is not None
    assert saved.founder_id == founder.id
    assert saved.is_read is False
    assert saved.is_dismissed is False

    # 2. Get unread count
    unread = await repo.get_unread_count(founder.id)
    assert unread == 1

    # 3. List notifications
    items, unread_count, total = await repo.list_notifications(founder.id)
    assert len(items) == 1
    assert total == 1
    assert unread_count == 1
    assert items[0].title == "Validation Report Ready"

    # 4. Mark as read
    read_item = await repo.mark_as_read(saved.id, founder.id)
    assert read_item is not None
    assert read_item.is_read is True
    assert read_item.read_at is not None

    unread_after = await repo.get_unread_count(founder.id)
    assert unread_after == 0

    # 4b. Test delete_read_notifications
    deleted_count = await repo.delete_read_notifications(founder.id)
    assert deleted_count == 1

    # Confirm soft dismissed items are excluded from active list
    items_after_dismiss, _, total_after_dismiss = await repo.list_notifications(founder.id)
    assert len(items_after_dismiss) == 0
    assert total_after_dismiss == 0


@pytest.mark.asyncio
async def test_notification_preferences(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Test Founder Preferences",
        email=f"founder_pref_{uid}@example.com",
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    repo = NotificationRepository(db_session)

    # 1. Get default preferences
    pref = await repo.get_or_create_preferences(founder.id)
    assert pref.founder_id == founder.id
    assert pref.browser_push_enabled is True
    assert pref.quiet_hours_enabled is False
    assert pref.notification_frequency == "INSTANT"

    # 2. Update preferences
    updated = await repo.update_preferences(
        founder.id,
        {
            "quiet_hours_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00",
            "validation_notifications": False,
            "notification_frequency": "DAILY_DIGEST",
        },
    )
    assert updated.quiet_hours_enabled is True
    assert updated.quiet_hours_start == "23:00"
    assert updated.validation_notifications is False
    assert updated.notification_frequency == "DAILY_DIGEST"


@pytest.mark.asyncio
async def test_push_subscriptions(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Test Founder Push",
        email=f"founder_push_{uid}@example.com",
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    repo = NotificationRepository(db_session)

    sub = PushSubscription(
        founder_id=founder.id,
        endpoint=f"https://push.example.com/sub/{uid}",
        p256dh_key="fake_p256dh",
        auth_key="fake_auth",
        user_agent="Mozilla/5.0 Test",
    )
    saved_sub = await repo.save_push_subscription(sub)
    assert saved_sub.id is not None
    assert saved_sub.endpoint == f"https://push.example.com/sub/{uid}"

    subs = await repo.get_founder_push_subscriptions(founder.id)
    assert len(subs) == 1

    # Delete subscription
    deleted = await repo.delete_push_subscription(founder.id, f"https://push.example.com/sub/{uid}")
    assert deleted is True

    subs_after = await repo.get_founder_push_subscriptions(founder.id)
    assert len(subs_after) == 0


@pytest.mark.asyncio
async def test_notification_service_publish_and_triggers(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Test Founder Service",
        email=f"founder_service_{uid}@example.com",
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    service = NotificationService(db_session)

    # 1. Publish welcome notification
    n_welcome = await service.notify_welcome(founder.id, founder.full_name)
    assert n_welcome is not None
    assert n_welcome.notification_type == NotificationType.WELCOME.value
    assert n_welcome.category == NotificationCategory.SYSTEM.value

    # 2. Publish validation completed notification
    n_val = await service.notify_validation_completed(founder.id, "val-123", 92, "PROCEED")
    assert n_val is not None
    assert n_val.notification_type == NotificationType.VALIDATION_COMPLETED.value
    assert n_val.extra_metadata["score"] == 92

    # 3. Suppressed notification test when category disabled
    await service.repo.update_preferences(founder.id, {"sprint_notifications": False})
    n_sprint = await service.notify_reality_sprint_submitted(founder.id, "sprint-123", "AI Dashboard")
    assert n_sprint is None  # Suppressed due to preferences


def test_quiet_hours_calculation():
    # 22:00 to 08:00 overnight range
    now_midnight = datetime(2026, 9, 4, 1, 30, tzinfo=timezone.utc)
    assert is_quiet_hours("22:00", "08:00", now_midnight) is True

    now_noon = datetime(2026, 9, 4, 12, 30, tzinfo=timezone.utc)
    assert is_quiet_hours("22:00", "08:00", now_noon) is False
