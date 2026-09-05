import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_unauthenticated_dashboard_request():
    """Unauthenticated request must return 401 Unauthorized."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/dashboard")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_dashboard_request_schema_and_defaults():
    """Authenticated request returns 200 OK with stable DashboardResponse schema and truthful defaults."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
        password = "Password123!"
        full_name = "Alice Founder"

        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": full_name, "email": email, "password": password},
        )
        assert signup_res.status_code == 201
        token = signup_res.json()["access_token"]

        res = await ac.get(
            "/api/v1/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()

        # Schema & Version Check
        assert data["version"] == "1.0"
        assert "generated_at" in data and isinstance(data["generated_at"], str)

        # User Summary Isolation Check
        assert data["user"]["email"] == email
        assert data["user"]["full_name"] == full_name
        assert "id" in data["user"]

        # Truthful Empty Stats Check
        stats = data["stats"]
        assert stats["ideas_count"] == 0
        assert stats["validations_count"] == 0
        assert stats["reports_count"] == 0
        assert stats["projects_count"] == 0

        # Truthful Initial Journey Check
        journey = data["journey"]
        assert journey["current_stage_id"] == "idea"
        assert journey["current_stage_name"] == "Idea Intake"
        assert journey["progress_percentage"] == 0
        assert len(journey["steps"]) == 5
        assert journey["steps"][0]["status"] == "current"
        assert journey["steps"][1]["status"] == "upcoming"

        # Truthful Empty Widgets & Activity Feed
        assert data["latest_idea"] is None
        assert data["latest_validation"] is None
        assert data["active_build"] is None
        assert data["recent_activity"] == []


@pytest.mark.asyncio
async def test_no_fabricated_production_data():
    """Dashboard response must never include fabricated mock strings or scores."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
        password = "Password123!"

        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Bob Founder", "email": email, "password": password},
        )
        token = signup_res.json()["access_token"]

        res = await ac.get(
            "/api/v1/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        text_content = res.text

        # Ensure known audit mock strings are nowhere in response
        assert "Autonomous AI Code Review" not in text_content
        assert "AI Security Sentinel" not in text_content
        assert "val_01" not in text_content
        assert "sprint_v2r_01" not in text_content
        assert "act_01" not in text_content


@pytest.mark.asyncio
async def test_founder_isolation():
    """Dashboard queries for Founder A must return Founder A's isolated data and not leak or cross-contaminate."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Founder A
        email_a = f"founder_a_{uuid.uuid4().hex[:8]}@example.com"
        signup_a = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Alpha", "email": email_a, "password": "Password123!"},
        )
        token_a = signup_a.json()["access_token"]

        # Founder B
        email_b = f"founder_b_{uuid.uuid4().hex[:8]}@example.com"
        signup_b = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Beta", "email": email_b, "password": "Password123!"},
        )
        token_b = signup_b.json()["access_token"]

        res_a = await ac.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token_a}"})
        res_b = await ac.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token_b}"})

        assert res_a.status_code == 200
        assert res_b.status_code == 200

        data_a = res_a.json()
        data_b = res_b.json()

        assert data_a["user"]["email"] == email_a
        assert data_a["user"]["full_name"] == "Founder Alpha"

        assert data_b["user"]["email"] == email_b
        assert data_b["user"]["full_name"] == "Founder Beta"

        assert data_a["user"]["id"] != data_b["user"]["id"]
