import os

# IMPORTANT: Settings uses env_prefix="VISION2REAL_" and pydantic-settings maps
# VISION2REAL_<FIELD_NAME> to Settings.<field_name> (case-insensitive). The
# previous values here (VISION2REAL_ENV, VISION2REAL_DB_URL) did not match any
# Settings field (environment, database_url) and were silently ignored -
# meaning tests were actually running against the real dev database
# (./vision2real.db) instead of an isolated test database. Fixed below.
os.environ.setdefault("VISION2REAL_ENVIRONMENT", "test")
os.environ.setdefault("VISION2REAL_DATABASE_URL", "sqlite+aiosqlite:///./test_vision2real.db")
os.environ.setdefault("VISION2REAL_DATABASE_URL_SYNC", "sqlite:///./test_vision2real.db")
os.environ.setdefault("VISION2REAL_SECRET_KEY", "test-secret")
