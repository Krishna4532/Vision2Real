from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models import Base

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.database_echo, future=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    async with engine.begin() as conn:
        if settings.environment != "production":
            await conn.run_sync(Base.metadata.create_all)
            return

        await _verify_migrated_schema(conn)


async def _verify_migrated_schema(conn) -> None:
    table_names = await conn.run_sync(lambda sync_conn: set(inspect(sync_conn).get_table_names()))
    required_tables = {"alembic_version", "users", "validations", "reality_sprints", "build_requests"}
    missing_tables = sorted(required_tables - table_names)
    if missing_tables:
        raise RuntimeError(
            "Production database migrations are incomplete. Missing tables: " + ", ".join(missing_tables)
        )


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    if settings.environment != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
