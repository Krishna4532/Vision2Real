from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    is_verified: bool
    auth_provider: str
    last_login_at: datetime | None = None
    created_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminUserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    role: str = "ADMIN"
    is_active: bool = True

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if info.data.get("password") != value:
            raise ValueError("Passwords do not match")
        return value


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if info.data.get("password") != value:
            raise ValueError("Passwords do not match")
        return value


class AdminStatusUpdate(BaseModel):
    is_active: bool


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_name: str
    platform_name: str
    support_email: str | None = None
    support_phone: str | None = None
    website: str | None = None
    address: str | None = None
    timezone: str
    social_links: dict[str, str] = {}
    branding: dict[str, str] = {}
    updated_at: datetime


class OrganizationUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    platform_name: str | None = Field(default=None, min_length=1, max_length=255)
    support_email: EmailStr | None = None
    support_phone: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=512)
    address: str | None = None
    timezone: str | None = Field(default=None, max_length=80)
    social_links: dict[str, str] | None = None
    branding: dict[str, str] | None = None


class SecuritySettingsResponse(BaseModel):
    jwt_lifetime_minutes: int
    refresh_token_lifetime_days: int
    password_policy: dict[str, Any]
    maximum_login_attempts: int | None = None
    account_lock_duration_minutes: int | None = None
    session_timeout_minutes: int
    editable: bool = False


class AuthProviderStatus(BaseModel):
    name: str
    enabled: bool
    configuration_status: str


class AuthSettingsResponse(BaseModel):
    providers: list[AuthProviderStatus]


class PushSettingsResponse(BaseModel):
    vapid_public_key: str
    vapid_private_key_configured: bool
    subject: str
    push_service_status: str
    subscribers_count: int
    campaign_count: int
    delivery_success_rate: float


class InfrastructureResponse(BaseModel):
    queued_notifications: int
    scheduled_campaigns: int
    failed_deliveries: int
    retry_queue: int
    notification_templates: int
    delivery_workers: str


class PlatformResponse(BaseModel):
    backend_version: str
    frontend_version: str
    environment: str
    database: str
    migration_version: str
    api_version: str
    build_number: str
    deployment_date: str
    git_commit: str
    python_version: str
    node_version: str
    storage: dict[str, Any]


class AdminAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    admin_id: str | None
    admin_name: str | None
    action: str
    target_type: str | None
    target_id: str | None
    target_label: str | None
    old_values: dict[str, Any]
    new_values: dict[str, Any]
    ip_address: str | None
    result: str
    created_at: datetime


class AdminAuditLogListResponse(BaseModel):
    items: list[AdminAuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SettingsSummaryResponse(BaseModel):
    organization: OrganizationResponse
    auth: AuthSettingsResponse
    security: SecuritySettingsResponse
    push: PushSettingsResponse
    infrastructure: InfrastructureResponse
    platform: PlatformResponse
