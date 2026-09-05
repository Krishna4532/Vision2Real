"""
Vision2Real – Settings Repository (Stage 6.5)
CRUD operations for UserSettings, Profile, Preferences, Session Revocation, Data Export, and Soft Account Deletion.
"""

from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM, RefreshTokenORM
from app.models.user_settings import UserSettings
from app.models.validation import Validation
from app.models.reality_sprint import RealitySprint
from app.models.build_request import BuildRequest
from app.models.notification import Notification, NotificationPreference


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_settings(self, user_id: str) -> UserSettings:
        stmt = select(UserSettings).where(UserSettings.user_id == user_id)
        res = await self.db.execute(stmt)
        settings = res.scalar_one_or_none()

        if not settings:
            settings = UserSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)

        return settings

    async def get_profile(self, user: UserORM) -> Tuple[UserORM, UserSettings]:
        settings = await self.get_or_create_settings(user.id)
        return user, settings

    async def update_profile(self, user: UserORM, profile_data: Dict[str, Any]) -> Tuple[UserORM, UserSettings]:
        # Handle full_name directly on UserORM
        if "full_name" in profile_data and profile_data["full_name"]:
            user.full_name = profile_data["full_name"]
            user.updated_at = datetime.now(timezone.utc)

        settings = await self.get_or_create_settings(user.id)
        for key in ["company", "designation", "bio", "website", "linkedin", "github", "avatar_url"]:
            if key in profile_data:
                setattr(settings, key, profile_data[key])

        settings.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        await self.db.refresh(settings)
        return user, settings

    async def update_preferences(self, user_id: str, pref_data: Dict[str, Any]) -> UserSettings:
        settings = await self.get_or_create_settings(user_id)
        for key in ["theme", "timezone", "language", "date_format", "time_format", "profile_visibility"]:
            if key in pref_data and pref_data[key] is not None:
                setattr(settings, key, pref_data[key])

        settings.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def list_active_sessions(self, user_id: str, current_token_str: Optional[str] = None) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(RefreshTokenORM)
            .where(
                RefreshTokenORM.user_id == user_id,
                RefreshTokenORM.revoked.is_(False),
                RefreshTokenORM.expires_at > now,
            )
            .order_by(RefreshTokenORM.created_at.desc())
        )
        res = await self.db.execute(stmt)
        tokens = res.scalars().all()

        sessions = []
        for t in tokens:
            is_curr = current_token_str is not None and t.token == current_token_str
            sessions.append({
                "id": t.id,
                "created_at": t.created_at,
                "expires_at": t.expires_at,
                "is_current": is_curr,
                "device_summary": "Active Session" if not is_curr else "Current Browser Session",
            })
        return sessions

    async def revoke_session(self, user_id: str, session_id: str) -> bool:
        stmt = (
            update(RefreshTokenORM)
            .where(
                RefreshTokenORM.id == session_id,
                RefreshTokenORM.user_id == user_id,
                RefreshTokenORM.revoked.is_(False),
            )
            .values(revoked=True)
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return (res.rowcount or 0) > 0

    async def revoke_other_sessions(self, user_id: str, current_token_str: Optional[str] = None) -> int:
        now = datetime.now(timezone.utc)
        query = update(RefreshTokenORM).where(
            RefreshTokenORM.user_id == user_id,
            RefreshTokenORM.revoked.is_(False),
            RefreshTokenORM.expires_at > now,
        )

        if current_token_str:
            query = query.where(RefreshTokenORM.token != current_token_str)

        query = query.values(revoked=True)
        res = await self.db.execute(query)
        await self.db.commit()
        return res.rowcount or 0

    async def export_account_data(self, user: UserORM) -> Dict[str, Any]:
        settings = await self.get_or_create_settings(user.id)

        # Get notification preferences
        pref_stmt = select(NotificationPreference).where(NotificationPreference.founder_id == user.id)
        pref_res = await self.db.execute(pref_stmt)
        notif_pref = pref_res.scalar_one_or_none()

        # Count Validation reports
        val_res = await self.db.execute(select(Validation).where(Validation.founder_id == user.id))
        val_count = len(val_res.scalars().all())

        # Count Reality Sprint requests
        sprint_res = await self.db.execute(select(RealitySprint).where(RealitySprint.founder_id == user.id))
        sprint_count = len(sprint_res.scalars().all())

        # Count Build Requests
        build_res = await self.db.execute(select(BuildRequest).where(BuildRequest.founder_id == user.id))
        build_count = len(build_res.scalars().all())

        # Count Notifications
        notif_res = await self.db.execute(select(Notification).where(Notification.founder_id == user.id))
        notif_count = len(notif_res.scalars().all())

        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "profile": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "auth_provider": user.auth_provider,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "company": settings.company,
                "designation": settings.designation,
                "bio": settings.bio,
                "website": settings.website,
                "linkedin": settings.linkedin,
                "github": settings.github,
            },
            "preferences": {
                "theme": settings.theme,
                "timezone": settings.timezone,
                "language": settings.language,
                "date_format": settings.date_format,
                "time_format": settings.time_format,
                "profile_visibility": settings.profile_visibility,
            },
            "notification_preferences": {
                "browser_push_enabled": notif_pref.browser_push_enabled if notif_pref else True,
                "email_enabled": notif_pref.email_enabled if notif_pref else True,
                "quiet_hours_enabled": notif_pref.quiet_hours_enabled if notif_pref else False,
                "notification_frequency": notif_pref.notification_frequency if notif_pref else "INSTANT",
            },
            "summary_counts": {
                "validations": val_count,
                "reality_sprints": sprint_count,
                "build_requests": build_count,
                "notifications": notif_count,
            },
        }

    async def soft_delete_account(self, user: UserORM) -> bool:
        """Soft-deletes user account by setting is_active=False and revoking all refresh tokens."""
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)

        # Revoke all refresh tokens
        await self.db.execute(
            update(RefreshTokenORM)
            .where(RefreshTokenORM.user_id == user.id)
            .values(revoked=True)
        )
        await self.db.commit()
        return True
