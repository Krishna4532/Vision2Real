from __future__ import annotations

import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuditLogService:
    """Extension point for future Stage audit log recording."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_admin_action(self, admin_id: str, action: str, details: dict[str, Any] | None = None) -> None:
        """Architectural stub for future audit logging."""
        logger.info(f"[AuditLogStub] Admin {admin_id} performed action: {action} with details: {details}")
