from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.hashing import hash_password
from app.core.roles import Roles
from app.core.config import get_settings
from app.models.auth import UserORM

logger = logging.getLogger(__name__)

SUPER_ADMIN_EMAIL = os.getenv("VISION2REAL_ADMIN_BOOTSTRAP_EMAIL", "")
DEFAULT_SUPER_ADMIN_NAME = "Super Admin"


async def ensure_super_admin_exists(db: AsyncSession) -> UserORM | None:
    """Bootstrap function to ensure the seeded Super Admin user exists with SUPER_ADMIN role."""
    settings = get_settings()
    normalized_email = settings.admin_bootstrap_email.lower().strip()
    if not normalized_email:
        if settings.environment == "production":
            raise RuntimeError("VISION2REAL_ADMIN_BOOTSTRAP_EMAIL is required to seed the initial Super Admin")
        logger.warning("Admin bootstrap credentials not provided; skipping initial admin seeding.")
        return None
    result = await db.execute(select(UserORM).where(UserORM.email == normalized_email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.role != Roles.SUPER_ADMIN:
            existing_user.role = Roles.SUPER_ADMIN
            await db.commit()
            await db.refresh(existing_user)
            logger.info(f"Updated user {normalized_email} role to {Roles.SUPER_ADMIN}")
        return existing_user

    bootstrap_password = settings.admin_bootstrap_password
    if not bootstrap_password:
        if settings.environment == "production":
            raise RuntimeError("VISION2REAL_ADMIN_BOOTSTRAP_PASSWORD is required to seed the initial Super Admin")
        bootstrap_password = "SuperAdmin@V2R2026!"

    pwd_hash = hash_password(bootstrap_password)

    super_admin = UserORM(
        full_name=DEFAULT_SUPER_ADMIN_NAME,
        email=normalized_email,
        password_hash=pwd_hash,
        role=Roles.SUPER_ADMIN,
        auth_provider="local",
        is_verified=True,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(super_admin)
    await db.commit()
    await db.refresh(super_admin)
    logger.info("Seeded initial Super Admin account")
    return super_admin
