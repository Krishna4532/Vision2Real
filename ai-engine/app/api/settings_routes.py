"""
Vision2Real – Settings Routes (Stage 6.5)
REST API endpoints for Founder Profile, Account Preferences, Password Changes, Active Sessions, JSON Export, and Account Deletion.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.schemas.settings import (
    UserProfileResponse,
    UserProfileUpdate,
    UserPreferencesResponse,
    UserPreferencesUpdate,
    ChangePasswordRequest,
    ActiveSessionResponse,
    AccountExportResponse,
    DeleteAccountRequest,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    return await service.get_profile(current_user)


@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    body: UserProfileUpdate,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    profile_data = body.model_dump(exclude_unset=True)
    return await service.update_profile(current_user, profile_data)


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    return await service.get_preferences(current_user.id)


@router.patch("/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    body: UserPreferencesUpdate,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    pref_data = body.model_dump(exclude_unset=True)
    return await service.update_preferences(current_user.id, pref_data)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    await service.change_password(current_user, body.current_password, body.new_password)
    return {"status": "ok", "message": "Password changed successfully."}


@router.get("/sessions", response_model=List[ActiveSessionResponse])
async def list_active_sessions(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    return await service.list_active_sessions(current_user.id)


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    await service.revoke_session(current_user.id, session_id)
    return {"status": "ok", "message": "Session revoked."}


@router.delete("/sessions")
async def revoke_other_sessions(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    count = await service.revoke_other_sessions(current_user.id)
    return {"status": "ok", "revoked_count": count}


@router.get("/export", response_model=AccountExportResponse)
async def export_account_data(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    return await service.export_account_data(current_user)


@router.delete("/account")
async def delete_account(
    body: DeleteAccountRequest,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = SettingsService(db)
    await service.soft_delete_account(current_user, body.password)
    return {"status": "ok", "message": "Account soft-deleted. Session terminated."}
