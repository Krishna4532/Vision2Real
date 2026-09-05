from __future__ import annotations

import logging
from typing import Any

from google.auth.transport import requests
from google.oauth2 import id_token

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def verify_google_id_token(token: str) -> dict[str, Any] | None:
    """Verify Google OAuth id_token and return user profile dict (email, name, sub).
    If verification fails or in test/development mode with a mock token, handle gracefully.
    """
    if not token:
        return None

    # Mock OAuth tokens are intentionally limited to non-production environments.
    if token.startswith("mock_google_token_") and settings.environment != "production":
        email = token.replace("mock_google_token_", "") + "@example.com"
        return {
            "sub": f"google_{token}",
            "email": email,
            "name": token.replace("mock_google_token_", "").capitalize(),
            "email_verified": True,
        }

    if token.startswith("mock_google_token_"):
        return None

    try:
        # Verify real token against Google servers/keys
        client_id = settings.google_client_id if settings.google_client_id else None
        id_info = id_token.verify_oauth2_token(token, requests.Request(), client_id)

        # Check issuer
        if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            logger.warning("Google token verification failed: Invalid issuer")
            return None

        return {
            "sub": id_info.get("sub"),
            "email": id_info.get("email"),
            "name": id_info.get("name", id_info.get("email", "").split("@")[0]),
            "email_verified": id_info.get("email_verified", False),
        }
    except Exception as e:
        logger.warning(f"Google token verification failed: {e}")
        return None
