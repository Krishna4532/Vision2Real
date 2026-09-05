"""
Vision2Real – Settings Schemas (Stage 6.5)
Pydantic schemas for Profile, Preferences, Password Change, Active Sessions, and Data Export.
"""

from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    auth_provider: str
    company: Optional[str] = None
    designation: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    avatar_url: Optional[str] = None
    updated_at: Optional[datetime] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    designation: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, max_length=255)
    linkedin: Optional[str] = Field(None, max_length=255)
    github: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=512)

    @field_validator("website", "linkedin", "github", mode="before")
    @classmethod
    def validate_urls(cls, v: Optional[str]) -> Optional[str]:
        if not v or v.strip() == "":
            return None
        v_str = v.strip()
        if not (v_str.startswith("http://") or v_str.startswith("https://")):
            v_str = f"https://{v_str}"
        return v_str


class UserPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    theme: str
    timezone: str
    language: str
    date_format: str
    time_format: str
    profile_visibility: str
    updated_at: Optional[datetime] = None


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(dark|light|system)$")
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    date_format: Optional[str] = Field(None, max_length=20)
    time_format: Optional[str] = Field(None, max_length=10)
    profile_visibility: Optional[str] = Field(None, pattern="^(public|private)$")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("New password and confirmation password do not match.")
        return v


class ActiveSessionResponse(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime
    is_current: bool = False
    device_summary: str = "Web Session"


class AccountExportResponse(BaseModel):
    exported_at: datetime
    profile: Dict[str, Any]
    preferences: Dict[str, Any]
    notification_preferences: Dict[str, Any]
    summary_counts: Dict[str, int]


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1)
    reason: Optional[str] = None
