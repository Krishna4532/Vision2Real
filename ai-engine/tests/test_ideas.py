import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_unauthenticated_ideas_request():
    """Unauthenticated request to ideas endpoints must return 401 Unauthorized."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/ideas")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_idea_lifecycle_crud_and_activity_log():
    """Create, fetch, update, archive, restore, and list ideas with structured activity logging."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"founder_ideas_{uuid.uuid4().hex[:8]}@example.com"
        password = "Password123!"
        full_name = "Carol Founder"

        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": full_name, "email": email, "password": password},
        )
        assert signup_res.status_code == 201
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create Idea
        create_payload = {
            "title": "Autonomous AI Code Auditor",
            "problem_statement": "Developers waste hours auditing legacy codebases for security vulnerabilities manually.",
            "proposed_solution": "Multi-agent static analysis and automated patch generation engine.",
            "industry": "Developer Tools",
            "target_market": "B2B SaaS / Enterprise Dev Teams",
            "current_stage": "DRAFT",
        }
        create_res = await ac.post("/api/v1/ideas", json=create_payload, headers=headers)
        assert create_res.status_code == 201
        idea_data = create_res.json()
        assert idea_data["title"] == "Autonomous AI Code Auditor"
        assert "autonomous-ai-code-auditor" in idea_data["slug"]
        assert idea_data["current_stage"] == "DRAFT"
        assert idea_data["is_archived"] is False
        idea_id = idea_data["id"]

        # 2. Get Idea by ID and Slug
        get_res = await ac.get(f"/api/v1/ideas/{idea_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == idea_id

        get_slug_res = await ac.get(f"/api/v1/ideas/{idea_data['slug']}", headers=headers)
        assert get_slug_res.status_code == 200
        assert get_slug_res.json()["id"] == idea_id

        # 3. Update Idea
        update_res = await ac.patch(
            f"/api/v1/ideas/{idea_id}",
            json={"current_stage": "READY_FOR_VALIDATION", "industry": "DevSecOps"},
            headers=headers,
        )
        assert update_res.status_code == 200
        assert update_res.json()["current_stage"] == "READY_FOR_VALIDATION"
        assert update_res.json()["industry"] == "DevSecOps"

        # 4. List Ideas & Stats
        list_res = await ac.get("/api/v1/ideas", headers=headers)
        assert list_res.status_code == 200
        l_data = list_res.json()
        assert l_data["total"] == 1
        assert len(l_data["items"]) == 1

        stats_res = await ac.get("/api/v1/ideas/stats", headers=headers)
        assert stats_res.status_code == 200
        assert stats_res.json()["total_ideas"] == 1

        # 5. Archive Idea
        archive_res = await ac.post(f"/api/v1/ideas/{idea_id}/archive", headers=headers)
        assert archive_res.status_code == 200
        assert archive_res.json()["is_archived"] is True

        # List default active should be 0, include_archived=True should be 1
        active_list = await ac.get("/api/v1/ideas", headers=headers)
        assert active_list.json()["total"] == 0

        archived_list = await ac.get("/api/v1/ideas?include_archived=true", headers=headers)
        assert archived_list.json()["total"] == 1

        # 6. Restore Idea
        restore_res = await ac.post(f"/api/v1/ideas/{idea_id}/restore", headers=headers)
        assert restore_res.status_code == 200
        assert restore_res.json()["is_archived"] is False

        # 7. Verify Dashboard automatically reflects idea & activity
        dash_res = await ac.get("/api/v1/dashboard", headers=headers)
        assert dash_res.status_code == 200
        d_data = dash_res.json()
        assert d_data["stats"]["ideas_count"] == 1
        assert d_data["latest_idea"]["title"] == "Autonomous AI Code Auditor"
        assert len(d_data["recent_activity"]) >= 1


@pytest.mark.asyncio
async def test_idea_tenant_isolation():
    """Founder A must never be able to access Founder B's startup ideas."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Founder A
        email_a = f"founder_a_{uuid.uuid4().hex[:8]}@example.com"
        signup_a = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Alpha", "email": email_a, "password": "Password123!"},
        )
        token_a = signup_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Founder B
        email_b = f"founder_b_{uuid.uuid4().hex[:8]}@example.com"
        signup_b = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Beta", "email": email_b, "password": "Password123!"},
        )
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Founder A creates idea
        create_res = await ac.post(
            "/api/v1/ideas",
            json={
                "title": "Alpha Private Concept",
                "problem_statement": "Private problem statement details.",
                "proposed_solution": "Private solution details.",
                "industry": "Fintech",
                "target_market": "Founders",
            },
            headers=headers_a,
        )
        idea_id = create_res.json()["id"]

        # Founder B attempts to access Founder A's idea -> 404
        get_b_res = await ac.get(f"/api/v1/ideas/{idea_id}", headers=headers_b)
        assert get_b_res.status_code == 404

        # Founder B list ideas -> empty
        list_b_res = await ac.get("/api/v1/ideas", headers=headers_b)
        assert list_b_res.json()["total"] == 0
