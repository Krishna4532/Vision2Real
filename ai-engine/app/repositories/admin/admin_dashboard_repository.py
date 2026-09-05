from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.build_request import BuildRequest
from app.models.reality_sprint import RealitySprint


class AdminDashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview_counts(self) -> dict[str, int]:
        total_founders = (await self.db.execute(select(func.count(UserORM.id)))).scalar_one() or 0
        total_reality_sprints = (await self.db.execute(select(func.count(RealitySprint.id)))).scalar_one() or 0
        total_build_requests = (await self.db.execute(select(func.count(BuildRequest.id)))).scalar_one() or 0

        return {
            "total_founders": total_founders,
            "total_reality_sprints": total_reality_sprints,
            "total_build_requests": total_build_requests,
        }
