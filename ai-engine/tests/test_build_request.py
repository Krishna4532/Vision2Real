import io
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import init_db
from app.main import app


@pytest.mark.asyncio
async def test_build_request_full_lifecycle():
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Founder A
        email_a = f"founder_br_a_{uuid.uuid4().hex[:8]}@example.com"
        signup_a = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder BR A", "email": email_a, "password": "Password123!"},
        )
        assert signup_a.status_code == 201
        token_a = signup_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Create Founder B
        email_b = f"founder_br_b_{uuid.uuid4().hex[:8]}@example.com"
        signup_b = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder BR B", "email": email_b, "password": "Password123!"},
        )
        assert signup_b.status_code == 201
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 1. Zero Analytics Check for Founder A
        an_empty_res = await client.get("/api/v1/build-requests/analytics", headers=headers_a)
        assert an_empty_res.status_code == 200
        an_empty = an_empty_res.json()
        assert an_empty["total_requests"] == 0
        assert an_empty["active_requests"] == 0
        assert an_empty["completed_requests"] == 0
        assert an_empty["cancelled_requests"] == 0
        assert an_empty["average_progress"] == 0.0
        assert an_empty["completion_rate"] == 0.0
        assert an_empty["latest_request"] == ""

        # 2. Create Build Request by Founder A
        request_payload = {
            "title": "AI Knowledge Discovery Engine",
            "startup_name": "NeuralMind Inc",
            "description": "Building an enterprise vector search and automated document synthesizer platform.",
            "product_category": "Developer Infrastructure",
            "target_customer": "Enterprise IT & Security Teams",
            "target_market": "B2B SaaS",
            "founder_stage": "Post-Seed",
            "priority": "HIGH",
            "estimated_duration_days": 30,
            "current_phase": "Architecture Setup",
            "current_work": "Designing PostgreSQL schema and vector index pipeline.",
            "current_milestone": "Database Design",
            "execution_mode": "v1",
            "version": 1,
            "extra_metadata": {"cloud": "AWS", "tier": "Enterprise"},
            "project_slug": "neuralmind-discovery",
            "project_id": "proj-12345",
            "workspace_id": "ws-67890",
        }
        create_res = await client.post("/api/v1/build-requests", json=request_payload, headers=headers_a)
        assert create_res.status_code == 201
        req_data = create_res.json()["data"]
        req_id = req_data["id"]
        assert req_data["title"] == "AI Knowledge Discovery Engine"
        assert req_data["status"] == "SUBMITTED"
        assert req_data["priority"] == "HIGH"
        assert req_data["progress_percentage"] == 0
        assert req_data["extra_metadata"] == {"cloud": "AWS", "tier": "Enterprise"}
        assert req_data["project_slug"] == "neuralmind-discovery"
        assert req_data["submitted_at"] is not None
        assert len(req_data["timeline_events"]) == 1
        assert req_data["timeline_events"][0]["event_type"] == "REQUEST_CREATED"

        # 3. Retrieval by Founder A & Founder B Isolation
        get_a = await client.get(f"/api/v1/build-requests/{req_id}", headers=headers_a)
        assert get_a.status_code == 200
        assert get_a.json()["id"] == req_id

        get_b = await client.get(f"/api/v1/build-requests/{req_id}", headers=headers_b)
        assert get_b.status_code == 404

        # 4. Attachment Upload by Founder A & Download Security Check
        file_bytes = b"System architecture specification PDF document"
        files = {"files": ("system_architecture.pdf", io.BytesIO(file_bytes), "application/pdf")}
        upload_res = await client.post(f"/api/v1/build-requests/{req_id}/attachments", files=files, headers=headers_a)
        assert upload_res.status_code == 200
        attachments = upload_res.json()["data"]["attachments"]
        assert len(attachments) == 1
        att_id = attachments[0]["id"]

        dl_a = await client.get(f"/api/v1/build-requests/{req_id}/attachments/{att_id}", headers=headers_a)
        assert dl_a.status_code == 200
        assert dl_a.content == file_bytes

        # Founder B download isolation check
        dl_b = await client.get(f"/api/v1/build-requests/{req_id}/attachments/{att_id}", headers=headers_b)
        assert dl_b.status_code == 404

        # 5. Timeline Event Verification
        timeline_res = await client.get(f"/api/v1/build-requests/{req_id}/timeline", headers=headers_a)
        assert timeline_res.status_code == 200
        timeline_events = timeline_res.json()
        assert len(timeline_events) >= 1
        assert timeline_events[0]["event_type"] == "REQUEST_CREATED"

        # 6. Messaging Thread Operations & Timeline Auto-Logging
        msg_payload = {"message": "Hello team, please prioritize the vector index database setup."}
        post_msg = await client.post(f"/api/v1/build-requests/{req_id}/messages", json=msg_payload, headers=headers_a)
        assert post_msg.status_code == 201
        posted_data = post_msg.json()
        assert posted_data["sender_type"] == "FOUNDER"
        assert posted_data["message"] == msg_payload["message"]

        get_msgs = await client.get(f"/api/v1/build-requests/{req_id}/messages", headers=headers_a)
        assert get_msgs.status_code == 200
        msgs_list = get_msgs.json()
        assert len(msgs_list) == 1
        assert msgs_list[0]["message"] == msg_payload["message"]

        # 7. Progress & Status Updates (Founder forbidden, reserved for Stage 7 Admin)
        progress_update = await client.patch(
            f"/api/v1/build-requests/{req_id}",
            json={"progress_percentage": 35, "current_milestone": "Authentication"},
            headers=headers_a,
        )
        assert progress_update.status_code == 403

        # 8. Listing, Searching across multiple fields, Filtering, Sorting & Pagination
        req_2_payload = {
            "title": "BioMed Clinical Trial Synthesizer",
            "startup_name": "BioTech Health Labs",
            "description": "NLP tool for clinical trial protocol extraction.",
            "product_category": "Healthcare Tech",
            "target_customer": "Pharma R&D",
            "target_market": "Healthcare",
            "priority": "NORMAL",
        }
        await client.post("/api/v1/build-requests", json=req_2_payload, headers=headers_a)

        list_res = await client.get("/api/v1/build-requests?page=1&page_size=10", headers=headers_a)
        assert list_res.status_code == 200
        l_json = list_res.json()
        assert l_json["pagination"]["total"] == 2

        # Multi-field search
        search_res = await client.get("/api/v1/build-requests?search=protocol", headers=headers_a)
        assert search_res.status_code == 200
        assert search_res.json()["pagination"]["total"] == 1

        filter_cat = await client.get("/api/v1/build-requests?product_category=Healthcare+Tech", headers=headers_a)
        assert filter_cat.status_code == 200
        assert filter_cat.json()["pagination"]["total"] == 1

        # 9. Populated Analytics Check
        analytics_res = await client.get("/api/v1/build-requests/analytics", headers=headers_a)
        assert analytics_res.status_code == 200
        analytics = analytics_res.json()
        assert analytics["total_requests"] == 2
        assert analytics["active_requests"] == 2
        assert analytics["average_progress"] == 0.0

        # 10. Soft Archiving (Founder forbidden, reserved for Stage 7 Admin)
        archive_res = await client.patch(
            f"/api/v1/build-requests/{req_id}",
            json={"is_archived": True},
            headers=headers_a,
        )
        assert archive_res.status_code == 403

        list_default = await client.get("/api/v1/build-requests", headers=headers_a)
        assert list_default.json()["pagination"]["total"] == 2

        list_with_archived = await client.get("/api/v1/build-requests?include_archived=true", headers=headers_a)
        assert list_with_archived.json()["pagination"]["total"] == 2


@pytest.mark.asyncio
async def test_alembic_migration_repeatability():
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config("alembic.ini")
    command.stamp(alembic_cfg, "head")
    command.downgrade(alembic_cfg, "63df14cce4af")
    command.upgrade(alembic_cfg, "head")

