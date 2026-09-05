from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.bootstrap.admin_seed import ensure_super_admin_exists
from app.core.config import get_settings
from app.core.database import init_db, session_scope

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_required_config()
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "version": "0.1.0",
        "environment": settings.environment,
    }


app.include_router(api_router)
