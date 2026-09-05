from functools import lru_cache
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Vision2Real AI Engine"
    environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    secret_key: str = "change-me"

    # Production / Development Database — Defaulting to PostgreSQL
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/vision2real",
        description="Async database URL for application runtime",
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/vision2real",
        description="Sync database URL for Alembic migrations",
    )
    database_echo: bool = False

    # Execution Mode — controls which pipeline runs inside ValidationOrchestrator
    # "v1" → single master LLM call (MVP, current default)
    # "v2" → full multi-agent pipeline (future; restores agents without code changes)
    execution_mode: str = "v1"

    # LLM Configuration
    llm_provider: str = "auto"  # "auto", "mock", "openai", "anthropic", "gemini", "groq", "openrouter"
    llm_model: str = "gpt-4o-mini"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    groq_model: str = "openai/gpt-oss-120b"
    openrouter_model: str = "google/gemini-2.5-flash"

    # Research Configuration
    research_provider: str = "mock"  # "mock", "tavily", "serpapi", "brave"
    tavily_api_key: str = ""

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    jwt_secret_key: str = "vision2real-super-secret-jwt-key-change-in-production-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    google_client_id: str = ""
    admin_bootstrap_email: str = ""
    admin_bootstrap_password: str = ""

    model_config = SettingsConfigDict(
        env_prefix="VISION2REAL_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("openai_api_key", "anthropic_api_key", "gemini_api_key", "groq_api_key", "openrouter_api_key", mode="before")
    @classmethod
    def strip_api_keys(cls, value: str | None) -> str:
        if value is None:
            return ""
        return value.strip()

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    def validate_required_config(self) -> None:
        """Validate required configuration at application startup."""
        missing = []
        if not self.jwt_secret_key or self.jwt_secret_key.strip() == "":
            missing.append("VISION2REAL_JWT_SECRET_KEY")

        if self.environment == "production":
            if self.debug:
                missing.append("VISION2REAL_DEBUG=false (debug must be disabled in production)")
            if self.secret_key == "change-me":
                missing.append("VISION2REAL_SECRET_KEY (cannot use default in production)")
            if self.jwt_secret_key == "vision2real-super-secret-jwt-key-change-in-production-2026":
                missing.append("VISION2REAL_JWT_SECRET_KEY (cannot use default in production)")
            if not self.admin_bootstrap_email.strip():
                missing.append("VISION2REAL_ADMIN_BOOTSTRAP_EMAIL")
            if not self.admin_bootstrap_password.strip():
                missing.append("VISION2REAL_ADMIN_BOOTSTRAP_PASSWORD")

            for name, value in (
                ("VISION2REAL_DATABASE_URL", self.database_url),
                ("VISION2REAL_DATABASE_URL_SYNC", self.database_url_sync),
            ):
                parsed = urlparse(value)
                if not value or parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
                    missing.append(f"{name} (must use a production database endpoint)")

            if not self.allowed_origin_list or not any(
                urlparse(origin).scheme == "https" or urlparse(origin).hostname not in {"localhost", "127.0.0.1", "::1"}
                for origin in self.allowed_origin_list
            ):
                missing.append("VISION2REAL_ALLOWED_ORIGINS (must contain production HTTPS origins)")

            if self.llm_provider.lower() == "mock":
                missing.append("VISION2REAL_LLM_PROVIDER (mock is not allowed in production)")
            if self.llm_provider.lower() == "auto":
                if not any((self.gemini_api_key, self.groq_api_key, self.openrouter_api_key)):
                    missing.append("a production LLM API key for VISION2REAL_LLM_PROVIDER=auto")
            else:
                provider_keys = {
                    "openai": self.openai_api_key,
                    "anthropic": self.anthropic_api_key,
                    "gemini": self.gemini_api_key,
                    "groq": self.groq_api_key,
                    "openrouter": self.openrouter_api_key,
                }
                if self.llm_provider.lower() not in provider_keys:
                    missing.append("VISION2REAL_LLM_PROVIDER (must name a supported production provider)")
                elif not provider_keys[self.llm_provider.lower()]:
                    missing.append(f"the API key for VISION2REAL_LLM_PROVIDER={self.llm_provider}")

            if self.research_provider.lower() == "mock":
                missing.append("VISION2REAL_RESEARCH_PROVIDER (mock is not allowed in production)")
            elif self.research_provider.lower() == "tavily" and not self.tavily_api_key:
                missing.append("VISION2REAL_TAVILY_API_KEY")

        if missing:
            raise RuntimeError(
                f"Missing or invalid required environment variable(s):\n" + "\n".join(f"  - {m}" for m in missing)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
