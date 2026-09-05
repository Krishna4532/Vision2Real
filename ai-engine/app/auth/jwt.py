from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from app.core.config import get_settings

settings = get_settings()


def create_access_token(user_id: str, email: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, email: str, expires_delta: timedelta | None = None) -> tuple[str, datetime]:
    """Create a signed JWT refresh token and return (token_str, expires_at_datetime)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.refresh_token_expire_days)

    import uuid
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    token_str = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token_str, expire


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT token. Returns payload dict if valid, else None."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.PyJWTError:
        return None


def verify_access_token(token: str) -> dict[str, Any] | None:
    """Verify that token is a valid access token."""
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload
    return None


def verify_refresh_token(token: str) -> dict[str, Any] | None:
    """Verify that token is a valid refresh token."""
    payload = decode_token(token)
    if payload and payload.get("type") == "refresh":
        return payload
    return None
