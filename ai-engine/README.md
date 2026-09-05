# Vision2Real AI Engine

This repository contains the FastAPI backend powering Vision2Real's AI Engine and Authentication System (Stage 2 complete).

## Quick Start

### 1. Environment Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure environment variables as needed:
```bash
cp .env.example .env
```

Ensure `VISION2REAL_JWT_SECRET_KEY` is configured. Variable names in `.env` map directly to Settings fields using the `VISION2REAL_` prefix (e.g. `VISION2REAL_DATABASE_URL` -> `Settings.database_url`).

### 3. Database Migrations
Run Alembic migrations to initialize the database schema (including Phase 1-3 AI engine tables, `users`, and `refresh_tokens`):
```bash
alembic upgrade head
```

### 4. Start Server
Launch the FastAPI uvicorn development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- **API Base**: `http://localhost:8000/api/v1`
- **Health Check**: `http://localhost:8000/health`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **OpenAPI JSON Schema**: `http://localhost:8000/openapi.json`

---

## Authentication Endpoints (Stage 2 Complete)

The AI Engine provides a platform-level authentication system supporting both password-based and Google OAuth logins with JWT access/refresh token rotation:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Register a new founder account (`full_name`, `email`, `password`) |
| `POST` | `/api/v1/auth/login` | Authenticate founder with password |
| `POST` | `/api/v1/auth/google` | Authenticate founder using Google OAuth ID token |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and issue new access/refresh pair |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token |
| `GET` | `/api/v1/auth/me` | Fetch authenticated founder profile (Requires `Authorization: Bearer <access_token>`) |

---

## Testing & Quality Assurance

Run the test suite with pytest:
```bash
pytest tests/ -v
```

To run specifically the authentication tests:
```bash
pytest tests/test_auth.py -v
```

---

## Architecture & AI Engine Pipeline

```
Founder Idea -> Pre-flight -> Idea Structuring -> Classification
                                                        |
                          +----------- parallel --------+---------+
                          v                              v          v
                      Research                     Competition   Customer
                          +-------------- converge -------------+
                                            v
                                     Combined State
                                            v
                                       Synthesis
                                            v
        +---------------+---------------+---------------+
        v                v                v               v
   Business Model    Feasibility        Market         Risk
        +---------------+---------------+---------------+
                                            v
                                  Phase 3 Combined State
                                            v
                                        Red Team
                                            v
                                Red Team Combined State
                                            v
                                Deterministic Decision Gate
                                            v
                                     Validation Plan
                                            v
                               Founder Decision Brief -> Persistence -> API
```
