from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.jwt import verify_access_token
from app.core.roles import Roles
from app.models.auth import UserORM
from app.services.auth_service import UserService

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserORM | None:
    """Dependency that returns the authenticated user if valid token supplied, else None (for guest compatibility)."""
    if not credentials or not credentials.credentials:
        return None

    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if not user or not user.is_active:
        return None

    return user


async def require_authenticated_user(
    user: UserORM | None = Depends(get_current_user_optional),
) -> UserORM:
    """Dependency requiring a valid, active authenticated user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_verified_user(
    user: UserORM = Depends(require_authenticated_user),
) -> UserORM:
    """Dependency requiring an authenticated user with verified email."""
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required.",
        )
    return user


async def require_admin(
    user: UserORM = Depends(require_authenticated_user),
) -> UserORM:
    """Dependency requiring an authenticated user with an Admin HQ role."""
    if user.role not in Roles.ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin HQ privileges required.",
        )
    return user


async def require_super_admin(
    user: UserORM = Depends(require_authenticated_user),
) -> UserORM:
    """Dependency for destructive or identity-management Admin HQ actions."""
    if user.role != Roles.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Admin privileges required.",
        )
    return user

