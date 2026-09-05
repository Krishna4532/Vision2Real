from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.services.admin.admin_dashboard_service import AdminDashboardService

router = APIRouter()


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> dict[str, int]:
    """Retrieve operational dashboard counts for Admin HQ foundation."""
    service = AdminDashboardService(db)
    return await service.get_dashboard_summary()
