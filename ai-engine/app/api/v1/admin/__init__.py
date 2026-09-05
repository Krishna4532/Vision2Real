from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.admin.build_requests import router as build_requests_router
from app.api.v1.admin.campaigns import router as campaigns_router
from app.api.v1.admin.dashboard import router as dashboard_router
from app.api.v1.admin.founders import router as founders_router
from app.api.v1.admin.me import router as me_router
from app.api.v1.admin.notifications import router as notifications_router
from app.api.v1.admin.reality_sprints import router as reality_sprints_router
from app.api.v1.admin.settings import router as settings_router
from app.api.v1.admin.validations import router as validations_router

admin_router = APIRouter(prefix="/admin", tags=["Admin HQ"])

admin_router.include_router(me_router)
admin_router.include_router(dashboard_router)
admin_router.include_router(founders_router)
admin_router.include_router(validations_router)
admin_router.include_router(reality_sprints_router)
admin_router.include_router(build_requests_router)
admin_router.include_router(notifications_router)
admin_router.include_router(campaigns_router)
admin_router.include_router(settings_router)

__all__ = ["admin_router"]
