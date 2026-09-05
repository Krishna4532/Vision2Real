import io
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import init_db
from app.main import app
from app.services.reality_sprint_service import RealitySprintService


@pytest.mark.asyncio
async def test_reality_sprint_full_lifecycle():
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Founder A
        email_a = f"founder_a_{uuid.uuid4().hex[:8]}@example.com"
        signup_a = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder A", "email": email_a, "password": "Password123!"},
        )
        assert signup_a.status_code == 201
        token_a = signup_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Create Founder B
        email_b = f"founder_b_{uuid.uuid4().hex[:8]}@example.com"
        signup_b = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder B", "email": email_b, "password": "Password123!"},
        )
        assert signup_b.status_code == 201
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 9. Empty Analytics for Founder A
        analytics_empty = await client.get("/api/v1/reality-sprints/analytics", headers=headers_a)
        assert analytics_empty.status_code == 200
        an_data = analytics_empty.json()["analytics"]
        assert an_data["total_requests"] == 0
        assert an_data["submitted"] == 0
        assert an_data["pending"] == 0
        assert an_data["latest_request"] == ""

        # 1. Create Sprint by Founder A
        sprint_payload = {
            "title": "Autonomous AI Code Reviewer",
            "startup_name": "CodePulse AI",
            "description": "Building a real-time autonomous AI agent for deep static analysis and PR reviews.",
            "target_customer": "Software Development Agencies & Mid-market SaaS",
            "target_market": "Developer Tools",
            "founder_stage": "MVP",
            "priority": "HIGH",
            "request_source": "FOUNDER_WORKSPACE",
            "estimated_duration_days": 14,
            "execution_mode": "v1",
            "version": 1,
            "extra_metadata": {"tech_stack": ["Python", "FastAPI", "React"]},
        }
        create_res = await client.post("/api/v1/reality-sprints", json=sprint_payload, headers=headers_a)
        assert create_res.status_code == 201
        created_sprint = create_res.json()["data"]
        sprint_id = created_sprint["id"]
        assert created_sprint["title"] == "Autonomous AI Code Reviewer"
        assert created_sprint["status"] == "SUBMITTED"
        assert created_sprint["execution_mode"] == "v1"
        assert created_sprint["version"] == 1
        assert created_sprint["is_archived"] is False
        assert created_sprint["submitted_at"] is not None

        # 2. Founder A Retrieval
        get_res = await client.get(f"/api/v1/reality-sprints/{sprint_id}", headers=headers_a)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == sprint_id

        # 3. Founder B Access Isolation (Get Sprint)
        b_get_res = await client.get(f"/api/v1/reality-sprints/{sprint_id}", headers=headers_b)
        assert b_get_res.status_code == 404

        # 11. Attachment Upload by Founder A
        file_content = b"Sample architecture doc for Reality Sprint"
        files = {"files": ("architecture.pdf", io.BytesIO(file_content), "application/pdf")}
        upload_res = await client.post(
            f"/api/v1/reality-sprints/{sprint_id}/attachments",
            files=files,
            headers=headers_a,
        )
        assert upload_res.status_code == 200
        attachments = upload_res.json()["data"]["attachments"]
        assert len(attachments) == 1
        att_id = attachments[0]["id"]
        assert attachments[0]["original_filename"] == "architecture.pdf"

        # Download Attachment by Founder A
        dl_res = await client.get(
            f"/api/v1/reality-sprints/{sprint_id}/attachments/{att_id}",
            headers=headers_a,
        )
        assert dl_res.status_code == 200
        assert dl_res.content == file_content

        # 4. Founder B Download Attachment Isolation
        b_dl_res = await client.get(
            f"/api/v1/reality-sprints/{sprint_id}/attachments/{att_id}",
            headers=headers_b,
        )
        assert b_dl_res.status_code == 404

        # 12 & 13. Status Transitions & Timestamp Updates
        # Founder attempting illegal jump directly to COMPLETED -> 400 Bad Request
        illegal_update = await client.patch(
            f"/api/v1/reality-sprints/{sprint_id}",
            json={"status": "COMPLETED"},
            headers=headers_a,
        )
        assert illegal_update.status_code == 400

        # Valid transition: SUBMITTED -> UNDER_REVIEW
        update_review = await client.patch(
            f"/api/v1/reality-sprints/{sprint_id}",
            json={"status": "UNDER_REVIEW"},
            headers=headers_a,
        )
        assert update_review.status_code == 200
        updated_data = update_review.json()["data"]
        assert updated_data["status"] == "UNDER_REVIEW"
        assert updated_data["review_started_at"] is not None

        # 5. List Pagination & 6. Search & 7. Filtering & 8. Sorting
        # Create second sprint for Founder A
        sprint_payload_2 = {
            "title": "BioTech Research Synthesizer",
            "startup_name": "GeneSynth Labs",
            "description": "Accelerating drug discovery literature analysis with specialized NLP models.",
            "target_customer": "Pharmaceutical R&D Teams",
            "target_market": "Healthcare Tech",
            "founder_stage": "Idea",
            "priority": "NORMAL",
        }
        await client.post("/api/v1/reality-sprints", json=sprint_payload_2, headers=headers_a)

        list_res = await client.get("/api/v1/reality-sprints?page=1&page_size=10", headers=headers_a)
        assert list_res.status_code == 200
        l_json = list_res.json()
        assert l_json["pagination"]["total"] == 2
        assert len(l_json["data"]) == 2

        search_res = await client.get("/api/v1/reality-sprints?search=GeneSynth", headers=headers_a)
        assert search_res.status_code == 200
        assert search_res.json()["pagination"]["total"] == 1

        filter_res = await client.get("/api/v1/reality-sprints?status=UNDER_REVIEW", headers=headers_a)
        assert filter_res.status_code == 200
        assert filter_res.json()["pagination"]["total"] == 1

        sort_res = await client.get("/api/v1/reality-sprints?sort_by=title&sort_order=asc", headers=headers_a)
        assert sort_res.status_code == 200
        items = sort_res.json()["data"]
        assert items[0]["title"] < items[1]["title"]

        # 10. Filled Analytics
        filled_an = await client.get("/api/v1/reality-sprints/analytics", headers=headers_a)
        assert filled_an.status_code == 200
        f_analytics = filled_an.json()["analytics"]
        assert f_analytics["total_requests"] == 2
        assert f_analytics["submitted"] == 1
        assert f_analytics["under_review"] == 1

        # 14. Soft Archiving
        archive_patch = await client.patch(
            f"/api/v1/reality-sprints/{sprint_id}",
            json={"is_archived": True},
            headers=headers_a,
        )
        assert archive_patch.status_code == 200
        assert archive_patch.json()["data"]["is_archived"] is True

        # Default listing excludes archived sprint
        default_list = await client.get("/api/v1/reality-sprints", headers=headers_a)
        assert default_list.json()["pagination"]["total"] == 1

        # Explicit query including archived returns both
        incl_archived_list = await client.get("/api/v1/reality-sprints?include_archived=true", headers=headers_a)
        assert incl_archived_list.json()["pagination"]["total"] == 2


@pytest.mark.asyncio
async def test_v1_unsupported_ai_operations_safety(db_session=None):
    from app.services.reality_sprint_service import RealitySprintService

    # Service placeholder calls fail safely with HTTPException(400)
    service = RealitySprintService(db=None)

    with pytest.raises(Exception) as exc_info:
        await service.start_ai_execution()
    assert getattr(exc_info.value, "status_code", None) == 400

    with pytest.raises(Exception) as exc_info:
        await service.generate_prd()
    assert getattr(exc_info.value, "status_code", None) == 400

    with pytest.raises(Exception) as exc_info:
        await service.launch_multi_agent_pipeline()
    assert getattr(exc_info.value, "status_code", None) == 400


@pytest.mark.asyncio
async def test_migration_up_down_safety():
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config("alembic.ini")
    # Upgrade & Downgrade execution verification
    command.upgrade(alembic_cfg, "head")
    command.downgrade(alembic_cfg, "4aaf0df4e719")
    command.upgrade(alembic_cfg, "head")
