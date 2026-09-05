from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin.admin_dashboard_repository import AdminDashboardRepository


class AdminDashboardService:
    def __init__(self, db: AsyncSession):
        self.repo = AdminDashboardRepository(db)

    async def get_dashboard_summary(self) -> dict[str, int]:
        return await self.repo.get_overview_counts()
