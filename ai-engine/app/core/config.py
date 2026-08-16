from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Vision2Real AI Engine"
    environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    secret_key: str = "change-me"
    database_url: str = "sqlite+aiosqlite:///./vision2real.db"
    database_url_sync: str = "sqlite:///./vision2real.db"
    database_echo: bool = False
    llm_provider: str = "mock"
    llm_model: str = "mock-gpt-4o-mini"
    research_provider: str = "mock"
    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_prefix="VISION2REAL_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
