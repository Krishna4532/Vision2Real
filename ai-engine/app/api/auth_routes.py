from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.auth.oauth import verify_google_id_token
from app.models.auth import UserORM
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    SignupRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account with email and password."""
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.register_user(
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password,
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserProfileResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate an existing user using email and password."""
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.authenticate_user(
            email=payload.email,
            password=payload.password,
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserProfileResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or register a user via Google OAuth ID Token."""
    google_profile = verify_google_id_token(payload.id_token)
    if not google_profile or not google_profile.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google authentication token.",
        )

    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.authenticate_google_user(
            email=google_profile["email"],
            name=google_profile.get("name", "Google User"),
            google_sub=google_profile.get("sub", ""),
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserProfileResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Obtain a new access token and refresh token using a valid refresh token."""
    auth_service = AuthService(db)
    try:
        user, new_access_token, new_refresh_token = await auth_service.refresh_tokens(
            payload.refresh_token
        )
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            user=UserProfileResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Log out user by revoking the supplied refresh token."""
    auth_service = AuthService(db)
    await auth_service.revoke_refresh_token(payload.refresh_token)
    return MessageResponse(message="Successfully logged out.")


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: UserORM = Depends(require_authenticated_user)):
    """Return profile details for the currently authenticated user."""
    return UserProfileResponse.model_validate(current_user)
