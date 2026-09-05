"""
Vision2Real – Settings Service (Stage 6.5)
Encapsulates business logic for Profile updates, Workspace Preferences, Password changes, Session revocation, Data Export, and Soft Account Deletion.
"""

from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.user_settings import UserSettings
from app.repositories.settings_repository import SettingsRepository
from app.auth.hashing import hash_password, verify_password


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SettingsRepository(db)

    async def get_profile(self, user: UserORM) -> Dict[str, Any]:
        u, s = await self.repo.get_profile(user)
        return {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "auth_provider": u.auth_provider,
            "company": s.company,
            "designation": s.designation,
            "bio": s.bio,
            "website": s.website,
            "linkedin": s.linkedin,
            "github": s.github,
            "avatar_url": s.avatar_url,
            "updated_at": s.updated_at,
        }

    async def update_profile(self, user: UserORM, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        u, s = await self.repo.update_profile(user, profile_data)
        return {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "auth_provider": u.auth_provider,
            "company": s.company,
            "designation": s.designation,
            "bio": s.bio,
            "website": s.website,
            "linkedin": s.linkedin,
            "github": s.github,
            "avatar_url": s.avatar_url,
            "updated_at": s.updated_at,
        }

    async def get_preferences(self, user_id: str) -> UserSettings:
        return await self.repo.get_or_create_settings(user_id)

    async def update_preferences(self, user_id: str, pref_data: Dict[str, Any]) -> UserSettings:
        return await self.repo.update_preferences(user_id, pref_data)

    async def change_password(self, user: UserORM, current_pass: str, new_pass: str) -> bool:
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Accounts authenticated via Google/third-party OAuth cannot change password here.",
            )

        if not verify_password(current_pass, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password entered is incorrect.",
            )

        user.password_hash = hash_password(new_pass)
        await self.db.commit()
        return True

    async def list_active_sessions(self, user_id: str, current_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.repo.list_active_sessions(user_id, current_token)

    async def revoke_session(self, user_id: str, session_id: str) -> bool:
        success = await self.repo.revoke_session(user_id, session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or already revoked.",
            )
        return True

    async def revoke_other_sessions(self, user_id: str, current_token: Optional[str] = None) -> int:
        return await self.repo.revoke_other_sessions(user_id, current_token)

    async def export_account_data(self, user: UserORM) -> Dict[str, Any]:
        return await self.repo.export_account_data(user)

    async def soft_delete_account(self, user: UserORM, password: str) -> bool:
        if user.password_hash and not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password entered is incorrect. Account deletion cancelled.",
            )

        return await self.repo.soft_delete_account(user)
