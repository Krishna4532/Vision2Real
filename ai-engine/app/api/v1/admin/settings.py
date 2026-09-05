from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_db, require_admin, require_super_admin
from app.models.auth import UserORM
from app.schemas.admin_settings import (
    AdminAuditLogListResponse,
    AdminAuditLogResponse,
    AdminPasswordReset,
    AdminStatusUpdate,
    AdminUserCreate,
    AdminUserListResponse,
    AdminUserResponse,
    AdminUserUpdate,
    AuthSettingsResponse,
    InfrastructureResponse,
    OrganizationResponse,
    OrganizationUpdate,
    PlatformResponse,
    PushSettingsResponse,
    SecuritySettingsResponse,
    SettingsSummaryResponse,
)
from app.services.admin.admin_settings_service import AdminSettingsService

router = APIRouter(prefix="/settings", tags=["admin-settings"])


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/summary", response_model=SettingsSummaryResponse)
async def get_settings_summary(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get high-level summary of all platform settings and system health metrics."""
    service = AdminSettingsService(db)
    return await service.get_summary()


@router.get("/admin-users", response_model=AdminUserListResponse)
async def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    status: str | None = Query(None),
    provider: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """List all admin accounts with filtering, search, and pagination."""
    service = AdminSettingsService(db)
    users, total = await service.repo.list_admin_users(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        status_filter=status,
        provider=provider,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return AdminUserListResponse(
        items=[AdminUserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/admin-users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    data: AdminUserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_super_admin),
) -> Any:
    """Create a new Admin account. Requires Super Admin privilege."""
    service = AdminSettingsService(db)
    try:
        user = await service.create_admin(data=data, actor=actor, ip_address=_get_client_ip(request))
        return AdminUserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/admin-users/{user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    user_id: str,
    data: AdminUserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_super_admin),
) -> Any:
    """Update an existing admin account details or role. Enforces safety constraints."""
    service = AdminSettingsService(db)
    try:
        user = await service.update_admin(
            user_id=user_id, data=data, actor=actor, ip_address=_get_client_ip(request)
        )
        return AdminUserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/admin-users/{user_id}/password")
async def reset_admin_password(
    user_id: str,
    data: AdminPasswordReset,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_super_admin),
) -> Any:
    """Reset password for an admin account without requiring old password. Requires Super Admin."""
    service = AdminSettingsService(db)
    try:
        await service.reset_password(
            user_id=user_id, data=data, actor=actor, ip_address=_get_client_ip(request)
        )
        return {"status": "success", "message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/admin-users/{user_id}/status", response_model=AdminUserResponse)
async def update_admin_status(
    user_id: str,
    data: AdminStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_super_admin),
) -> Any:
    """Enable or disable an admin account. Enforces safety rules."""
    service = AdminSettingsService(db)
    try:
        user = await service.update_status(
            user_id=user_id, is_active=data.is_active, actor=actor, ip_address=_get_client_ip(request)
        )
        return AdminUserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/organization", response_model=OrganizationResponse)
async def get_organization_settings(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get platform organization details."""
    service = AdminSettingsService(db)
    settings = await service.get_organization()
    return OrganizationResponse.model_validate(settings)


@router.patch("/organization", response_model=OrganizationResponse)
async def update_organization_settings(
    data: OrganizationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_admin),
) -> Any:
    """Update organization settings."""
    service = AdminSettingsService(db)
    settings = await service.update_organization(
        data=data, actor=actor, ip_address=_get_client_ip(request)
    )
    return OrganizationResponse.model_validate(settings)


@router.get("/security", response_model=SecuritySettingsResponse)
async def get_security_settings(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get security and authentication policy settings."""
    service = AdminSettingsService(db)
    return await service.get_security()


@router.get("/auth", response_model=AuthSettingsResponse)
async def get_auth_settings(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get configured authentication providers status."""
    service = AdminSettingsService(db)
    return await service.get_auth()


@router.get("/push", response_model=PushSettingsResponse)
async def get_push_settings(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get push notification server status and metrics."""
    service = AdminSettingsService(db)
    return await service.get_push()


@router.post("/push/regenerate-keys", response_model=PushSettingsResponse)
async def regenerate_push_keys(
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: UserORM = Depends(require_super_admin),
) -> Any:
    """Regenerate VAPID push notification key pair."""
    service = AdminSettingsService(db)
    return await service.regenerate_push_keys(actor=actor, ip_address=_get_client_ip(request))


@router.get("/infrastructure", response_model=InfrastructureResponse)
async def get_infrastructure_settings(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get live notification infrastructure metrics."""
    service = AdminSettingsService(db)
    return await service.get_infrastructure()


@router.get("/platform", response_model=PlatformResponse)
async def get_platform_info(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """Get environment and system runtime version specifications."""
    service = AdminSettingsService(db)
    return await service.get_platform()


@router.get("/audit-logs", response_model=AdminAuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    action: str | None = Query(None),
    result: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> Any:
    """List admin audit logs with filtering and pagination."""
    service = AdminSettingsService(db)
    logs, total = await service.repo.list_audit_logs(
        page=page,
        page_size=page_size,
        search=search,
        action=action,
        result_filter=result,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return AdminAuditLogListResponse(
        items=[AdminAuditLogResponse.model_validate(l) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
