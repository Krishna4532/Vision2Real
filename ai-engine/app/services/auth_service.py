from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.hashing import hash_password, verify_password
from app.auth.jwt import create_access_token, create_refresh_token, verify_refresh_token
from app.models.auth import RefreshTokenORM, UserORM

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> UserORM | None:
        result = await self.db.execute(select(UserORM).where(UserORM.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> UserORM | None:
        result = await self.db.execute(select(UserORM).where(UserORM.email == email.lower().strip()))
        return result.scalar_one_or_none()

    async def create_user(
        self,
        full_name: str,
        email: str,
        password: str | None = None,
        auth_provider: str = "local",
        is_verified: bool = False,
    ) -> UserORM:
        normalized_email = email.lower().strip()
        pwd_hash = hash_password(password) if password else None

        user = UserORM(
            full_name=full_name.strip(),
            email=normalized_email,
            password_hash=pwd_hash,
            auth_provider=auth_provider,
            is_verified=is_verified,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Created new user: user_id={user.id}, email={user.email}, provider={auth_provider}")

        # Trigger automatic welcome notification
        try:
            from app.services.notification_service import NotificationService
            await NotificationService(self.db).notify_welcome(user.id, user.full_name)
        except Exception as ex:
            logger.warning(f"Failed to create welcome notification for user {user.id}: {ex}")

        return user

    async def update_last_login(self, user: UserORM) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    async def register_user(self, full_name: str, email: str, password: str) -> tuple[UserORM, str, str]:
        existing = await self.user_service.get_by_email(email)
        if existing:
            raise ValueError("An account with this email already exists.")

        user = await self.user_service.create_user(full_name=full_name, email=email, password=password, auth_provider="local")
        await self.user_service.update_last_login(user)

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, expires_at = create_refresh_token(user.id, user.email)

        await self._store_refresh_token(user.id, refresh_token_str, expires_at)
        logger.info(f"Successful signup: user_id={user.id}")
        return user, access_token, refresh_token_str

    async def authenticate_user(self, email: str, password: str) -> tuple[UserORM, str, str]:
        user = await self.user_service.get_by_email(email)
        if not user:
            logger.warning(f"Failed login attempt: email={email} (User not found)")
            raise ValueError("Invalid email or password.")

        if not user.is_active:
            logger.warning(f"Failed login attempt: user_id={user.id} (Account inactive)")
            raise ValueError("Account is inactive.")

        if user.auth_provider != "local" or not user.password_hash:
            logger.warning(f"Failed login attempt: user_id={user.id} (Provider mismatch: {user.auth_provider})")
            raise ValueError("Please sign in using your OAuth provider (e.g. Google).")

        if not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt: user_id={user.id} (Invalid password)")
            raise ValueError("Invalid email or password.")

        await self.user_service.update_last_login(user)

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, expires_at = create_refresh_token(user.id, user.email)

        await self._store_refresh_token(user.id, refresh_token_str, expires_at)
        logger.info(f"Successful login: user_id={user.id}")
        return user, access_token, refresh_token_str

    async def authenticate_google_user(self, email: str, name: str, google_sub: str) -> tuple[UserORM, str, str]:
        user = await self.user_service.get_by_email(email)
        if not user:
            user = await self.user_service.create_user(
                full_name=name, email=email, password=None, auth_provider="google", is_verified=True
            )
        else:
            if not user.is_active:
                raise ValueError("Account is inactive.")
            # If account existed as local, link google auth provider if appropriate
            if user.auth_provider == "local":
                user.auth_provider = "google"
                user.is_verified = True
                await self.db.commit()

        await self.user_service.update_last_login(user)

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, expires_at = create_refresh_token(user.id, user.email)

        await self._store_refresh_token(user.id, refresh_token_str, expires_at)
        logger.info(f"Successful Google OAuth login: user_id={user.id}")
        return user, access_token, refresh_token_str

    async def refresh_tokens(self, refresh_token_str: str) -> tuple[UserORM, str, str]:
        payload = verify_refresh_token(refresh_token_str)
        if not payload:
            raise ValueError("Invalid or expired refresh token.")

        result = await self.db.execute(
            select(RefreshTokenORM).where(
                RefreshTokenORM.token == refresh_token_str, RefreshTokenORM.revoked == False
            )
        )
        token_orm = result.scalar_one_or_none()
        if not token_orm:
            raise ValueError("Refresh token has been revoked or is invalid.")

        user_id = payload.get("sub")
        user = await self.user_service.get_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("User not found or inactive.")

        # Revoke old refresh token (Token rotation)
        token_orm.revoked = True

        new_access_token = create_access_token(user.id, user.email)
        new_refresh_token_str, expires_at = create_refresh_token(user.id, user.email)

        await self._store_refresh_token(user.id, new_refresh_token_str, expires_at)
        logger.info(f"Successful token refresh: user_id={user.id}")
        return user, new_access_token, new_refresh_token_str

    async def revoke_refresh_token(self, refresh_token_str: str) -> None:
        result = await self.db.execute(
            select(RefreshTokenORM).where(RefreshTokenORM.token == refresh_token_str)
        )
        token_orm = result.scalar_one_or_none()
        if token_orm:
            token_orm.revoked = True
            await self.db.commit()
            logger.info(f"Revoked refresh token for user_id={token_orm.user_id}")

    async def _store_refresh_token(self, user_id: str, token_str: str, expires_at: datetime) -> None:
        refresh_orm = RefreshTokenORM(
            token=token_str,
            user_id=user_id,
            expires_at=expires_at,
            revoked=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(refresh_orm)
        await self.db.commit()
