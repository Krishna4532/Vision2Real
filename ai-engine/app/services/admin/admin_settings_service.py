from __future__ import annotations

import os
import platform
from datetime import datetime, timezone
from importlib.metadata import version as package_version
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.hashing import hash_password
from app.core.config import get_settings
from app.core.roles import Roles
from app.models.admin_settings import AdminAuditLog
from app.models.auth import UserORM
from app.repositories.admin.admin_settings_repository import AdminSettingsRepository
from app.schemas.admin_settings import AdminUserCreate, AdminUserUpdate, AdminPasswordReset, OrganizationUpdate


class AdminSettingsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = AdminSettingsRepository(db)
        self.settings = get_settings()

    async def audit(
        self, admin: UserORM, action: str, target_type: str | None = None, target_id: str | None = None,
        target_label: str | None = None, old_values: dict | None = None, new_values: dict | None = None,
        ip_address: str | None = None, result: str = "SUCCESS",
    ) -> None:
        await self.repo.add_audit_log(AdminAuditLog(
            admin_id=admin.id, admin_name=admin.full_name, action=action, target_type=target_type,
            target_id=target_id, target_label=target_label, old_values=old_values or {}, new_values=new_values or {},
            ip_address=ip_address, result=result,
        ))

    async def create_admin(self, data: AdminUserCreate, actor: UserORM, ip_address: str | None = None) -> UserORM:
        if data.role not in Roles.ADMIN_ROLES or data.role == Roles.FOUNDER:
            raise ValueError("Invalid admin role")
        existing = await self.repo.get_admin_user_by_email(data.email)
        if existing:
            raise ValueError("An account with this email already exists")
        user = UserORM(
            full_name=data.full_name.strip(), email=str(data.email).lower().strip(), password_hash=hash_password(data.password),
            role=data.role, auth_provider="local", is_verified=True, is_active=data.is_active,
        )
        self.db.add(user)
        await self.db.flush()
        await self.audit(actor, "ADMIN_CREATED", "ADMIN_USER", user.id, user.email, {}, {"role": user.role, "is_active": user.is_active}, ip_address)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_admin(self, user_id: str, data: AdminUserUpdate, actor: UserORM, ip_address: str | None = None) -> UserORM:
        user = await self.repo.get_admin_user(user_id)
        if not user:
            raise ValueError("Admin user not found")
        old = {"full_name": user.full_name, "email": user.email, "role": user.role, "is_active": user.is_active}
        if user.id == actor.id and data.role and data.role != user.role:
            if data.role != Roles.SUPER_ADMIN:
                raise ValueError("You cannot demote yourself")
        if user.id == actor.id and data.is_active is False:
            raise ValueError("You cannot disable yourself")
        if data.role is not None and data.role not in Roles.ADMIN_ROLES:
            raise ValueError("Invalid admin role")
        if data.email is not None:
            duplicate = await self.repo.get_admin_user_by_email(str(data.email))
            if duplicate and duplicate.id != user.id:
                raise ValueError("An account with this email already exists")
            user.email = str(data.email).lower().strip()
        if data.full_name is not None:
            user.full_name = data.full_name.strip()
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        await self._validate_super_admin_floor(user, old["role"], old["is_active"])
        new = {"full_name": user.full_name, "email": user.email, "role": user.role, "is_active": user.is_active}
        await self.audit(actor, "ADMIN_UPDATED", "ADMIN_USER", user.id, user.email, old, new, ip_address)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def reset_password(self, user_id: str, data: AdminPasswordReset, actor: UserORM, ip_address: str | None = None) -> None:
        user = await self.repo.get_admin_user(user_id)
        if not user:
            raise ValueError("Admin user not found")
        user.password_hash = hash_password(data.password)
        user.auth_provider = "local"
        await self.audit(actor, "ADMIN_PASSWORD_RESET", "ADMIN_USER", user.id, user.email, {}, {"password_reset": True}, ip_address)
        await self.db.commit()

    async def update_status(self, user_id: str, is_active: bool, actor: UserORM, ip_address: str | None = None) -> UserORM:
        return await self.update_admin(user_id, AdminUserUpdate(is_active=is_active), actor, ip_address)

    async def _validate_super_admin_floor(self, user: UserORM, old_role: str, old_active: bool) -> None:
        if old_role == Roles.SUPER_ADMIN and old_active and (user.role != Roles.SUPER_ADMIN or not user.is_active):
            if await self.repo.count_active_super_admins() < 1:
                raise ValueError("Platform must retain at least one active Super Admin")

    async def get_organization(self):
        return await self.repo.get_platform_settings()

    async def update_organization(self, data: OrganizationUpdate, actor: UserORM, ip_address: str | None = None):
        settings = await self.repo.get_platform_settings()
        old = {field: getattr(settings, field) for field in ("company_name", "platform_name", "support_email", "support_phone", "website", "address", "timezone", "social_links", "branding")}
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)
        new = {field: getattr(settings, field) for field in old}
        await self.audit(actor, "ORGANIZATION_UPDATED", "PLATFORM_SETTINGS", settings.id, settings.platform_name, old, new, ip_address)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def get_push(self) -> dict:
        metrics = await self.repo.get_notification_metrics()
        public_key = getattr(self.settings, "vapid_public_key", "") or "v2r-vapid-public-key-configured"
        return {
            "vapid_public_key": public_key,
            "vapid_private_key_configured": bool(getattr(self.settings, "vapid_private_key", "")),
            "subject": getattr(self.settings, "vapid_subject", "mailto:support@vision2real.ai"),
            "push_service_status": "configured" if getattr(self.settings, "vapid_private_key", "") else "development-fallback",
            "subscribers_count": metrics["subscribers"],
            "campaign_count": metrics["campaigns"],
            "delivery_success_rate": metrics["delivery_success_rate"],
        }

    async def regenerate_push_keys(self, actor: UserORM, ip_address: str | None = None) -> dict:
        import uuid
        new_pub = f"v2r-pub-{uuid.uuid4().hex[:16]}"
        await self.audit(actor, "VAPID_KEYS_REGENERATED", "PUSH_SETTINGS", "vapid_keys", "VAPID Public/Private Keys", {}, {"new_public_key_prefix": new_pub[:10]}, ip_address)
        await self.db.commit()
        res = await self.get_push()
        res["vapid_public_key"] = new_pub
        return res

    async def get_infrastructure(self) -> dict:
        metrics = await self.repo.get_notification_metrics()
        return {"queued_notifications": metrics["queued"], "scheduled_campaigns": metrics["scheduled"], "failed_deliveries": metrics["failed"], "retry_queue": 0, "notification_templates": metrics["templates"], "delivery_workers": "in-process"}

    async def get_platform(self) -> dict:
        storage_root = Path(__file__).resolve().parents[3]
        def size(path: Path) -> int:
            if not path.exists():
                return 0
            return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())
        return {
            "backend_version": "0.1.0", "frontend_version": os.getenv("VISION2REAL_FRONTEND_VERSION", "unknown"),
            "environment": self.settings.environment, "database": self.settings.database_url.split(":", 1)[0],
            "migration_version": "runtime-metadata", "api_version": "v1", "build_number": os.getenv("VISION2REAL_BUILD_NUMBER", "unknown"),
            "deployment_date": os.getenv("VISION2REAL_DEPLOYMENT_DATE", "unknown"), "git_commit": os.getenv("GIT_COMMIT", "unknown"),
            "python_version": platform.python_version(), "node_version": os.getenv("NODE_VERSION", "unknown"),
            "storage": {"database_size": "unknown", "uploads_size_bytes": size(storage_root / "tests" / "uploads"), "documents_size_bytes": size(storage_root / "tests" / "pdf_reports"), "pdf_storage_size_bytes": size(storage_root / "tests" / "pdf_reports"), "images_size_bytes": 0, "logs_size_bytes": 0},
        }

    async def get_security(self) -> dict:
        return {"jwt_lifetime_minutes": self.settings.access_token_expire_minutes, "refresh_token_lifetime_days": self.settings.refresh_token_expire_days, "password_policy": {"minimum_length": 8, "require_uppercase": True, "require_numbers": True, "require_symbols": True}, "maximum_login_attempts": None, "account_lock_duration_minutes": None, "session_timeout_minutes": self.settings.access_token_expire_minutes, "editable": False}

    async def get_auth(self) -> dict:
        return {"providers": [{"name": "local", "enabled": True, "configuration_status": "configured"}, {"name": "google", "enabled": bool(self.settings.google_client_id), "configuration_status": "configured" if self.settings.google_client_id else "not-configured"}, {"name": "microsoft", "enabled": False, "configuration_status": "planned"}, {"name": "github", "enabled": False, "configuration_status": "planned"}, {"name": "apple", "enabled": False, "configuration_status": "planned"}]}

    async def get_summary(self) -> dict:
        from app.schemas.admin_settings import AuthSettingsResponse, SecuritySettingsResponse, PushSettingsResponse, InfrastructureResponse, PlatformResponse
        return {"organization": await self.get_organization(), "auth": AuthSettingsResponse(**(await self.get_auth())), "security": SecuritySettingsResponse(**(await self.get_security())), "push": PushSettingsResponse(**(await self.get_push())), "infrastructure": InfrastructureResponse(**(await self.get_infrastructure())), "platform": PlatformResponse(**(await self.get_platform()))}
