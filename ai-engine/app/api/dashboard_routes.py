from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_founder_dashboard(
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    """Fetch aggregated founder dashboard data including stats, journey, and recent activity."""
    service = DashboardService(db)
    return await service.get_founder_dashboard(user)
