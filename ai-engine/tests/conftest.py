import os
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# IMPORTANT: Settings uses env_prefix="VISION2REAL_" and pydantic-settings maps
# VISION2REAL_<FIELD_NAME> to Settings.<field_name> (case-insensitive).
os.environ.setdefault("VISION2REAL_ENVIRONMENT", "test")
os.environ.setdefault("VISION2REAL_DATABASE_URL", "sqlite+aiosqlite:///./test_vision2real.db")
os.environ.setdefault("VISION2REAL_DATABASE_URL_SYNC", "sqlite:///./test_vision2real.db")
os.environ.setdefault("VISION2REAL_SECRET_KEY", "test-secret")
os.environ.setdefault("VISION2REAL_ADMIN_BOOTSTRAP_EMAIL", "admin@example.com")
os.environ.setdefault("VISION2REAL_ADMIN_BOOTSTRAP_PASSWORD", "SuperAdmin@V2R2026!")

from app.core.database import init_db
from app.main import app


@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
