from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.auth import UserProfileResponse

router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
async def get_admin_me(
    current_admin: UserORM = Depends(require_admin),
) -> UserProfileResponse:
    """Verify session and return Super Admin user profile.

    Requires SUPER_ADMIN role (403 Forbidden for non-admin).
    """
    return UserProfileResponse.model_validate(current_admin)
