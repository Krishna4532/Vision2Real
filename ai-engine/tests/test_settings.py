import uuid
import pytest
import pytest_asyncio
from app.models import Base
from app.core.database import AsyncSessionLocal, engine
from app.models.auth import UserORM, RefreshTokenORM
from app.services.settings_service import SettingsService
from app.auth.hashing import hash_password
from datetime import datetime, timezone, timedelta


@pytest_asyncio.fixture
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_profile_crud_and_preferences(db_session):
    uid = str(uuid.uuid4())[:8]
    user = UserORM(
        full_name="Original Name",
        email=f"settings_founder_{uid}@example.com",
        password_hash=hash_password("SecretPassword123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    service = SettingsService(db_session)

    # 1. Fetch default profile
    profile = await service.get_profile(user)
    assert profile["full_name"] == "Original Name"
    assert profile["company"] is None

    # 2. Update profile
    updated = await service.update_profile(
        user,
        {
            "full_name": "Updated Founder Name",
            "company": "Vision2Real AI Inc",
            "designation": "CEO & Founder",
            "bio": "Building the future of software development.",
            "website": "https://vision2real.ai",
            "linkedin": "https://linkedin.com/in/founder",
            "github": "https://github.com/founder",
        },
    )
    assert updated["full_name"] == "Updated Founder Name"
    assert updated["company"] == "Vision2Real AI Inc"
    assert updated["website"] == "https://vision2real.ai"

    # 3. Preferences CRUD
    pref = await service.get_preferences(user.id)
    assert pref.theme == "dark"
    assert pref.language == "en"

    updated_pref = await service.update_preferences(user.id, {"theme": "light", "timezone": "America/New_York"})
    assert updated_pref.theme == "light"
    assert updated_pref.timezone == "America/New_York"


@pytest.mark.asyncio
async def test_password_change_and_sessions(db_session):
    uid = str(uuid.uuid4())[:8]
    user = UserORM(
        full_name="Security Founder",
        email=f"sec_founder_{uid}@example.com",
        password_hash=hash_password("OldPassword123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Add 2 refresh tokens
    token1 = RefreshTokenORM(
        token=f"token1_{uid}",
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    token2 = RefreshTokenORM(
        token=f"token2_{uid}",
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add_all([token1, token2])
    await db_session.commit()

    service = SettingsService(db_session)

    # List active sessions
    sessions = await service.list_active_sessions(user.id, current_token=f"token1_{uid}")
    assert len(sessions) == 2

    # Revoke single session
    revoked = await service.revoke_session(user.id, token2.id)
    assert revoked is True

    sessions_after = await service.list_active_sessions(user.id, current_token=f"token1_{uid}")
    assert len(sessions_after) == 1

    # Change password
    ok = await service.change_password(user, "OldPassword123!", "NewStrongPassword456!")
    assert ok is True


@pytest.mark.asyncio
async def test_account_export_and_soft_delete(db_session):
    uid = str(uuid.uuid4())[:8]
    user = UserORM(
        full_name="Export Founder",
        email=f"export_founder_{uid}@example.com",
        password_hash=hash_password("ExportPass123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    service = SettingsService(db_session)

    # Test export
    export_data = await service.export_account_data(user)
    assert export_data["profile"]["email"] == f"export_founder_{uid}@example.com"
    assert "summary_counts" in export_data

    # Test soft delete
    deleted = await service.soft_delete_account(user, "ExportPass123!")
    assert deleted is True
    assert user.is_active is False
