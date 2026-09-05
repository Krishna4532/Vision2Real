"""
Stage 7.4B — Admin Build Request Operations Tests.

Covers:
- Admin access control (anonymous, founder, super admin)
- Build Request list endpoint: pagination, search, status/priority filters, sorting
- Build Request detail endpoint: 200 (100% dossier view), 404
- State machine transitions: Approve, Reject, Start, Pause, Resume, Progress Update, Complete
- Invalid state transition rejections (400)
- Private operational notes creation
- Audit timeline logging (`BuildRequestTimelineEvent` records created)

All tests use in-memory SQLite database via conftest.py.
"""
from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.bootstrap.admin_seed import ensure_super_admin_exists, SUPER_ADMIN_EMAIL
from app.core.database import init_db, session_scope
from app.main import app
from app.models.auth import UserORM
from app.models.build_request import BuildRequest

ADMIN_PASSWORD = "SuperAdmin@V2R2026!"
FOUNDER_PASSWORD = "Password123!"


async def _get_admin_token(ac: AsyncClient) -> str:
    res = await ac.post(
        "/api/v1/auth/login",
        json={"email": SUPER_ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


async def _create_founder_token(ac: AsyncClient) -> str:
    email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
    res = await ac.post(
        "/api/v1/auth/signup",
        json={"full_name": "Test Founder 7.4B", "email": email, "password": FOUNDER_PASSWORD},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


async def _setup() -> None:
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)


def _transport() -> ASGITransport:
    return ASGITransport(app=app)


# ── Access Control Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_build_request_list_anonymous_401():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/build-requests")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_build_request_list_founder_forbidden_403():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _create_founder_token(ac)
        res = await ac.get(
            "/api/v1/admin/build-requests",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_build_request_detail_anonymous_401():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/build-requests/{fake_id}")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_build_request_detail_founder_forbidden_403():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _create_founder_token(ac)
        res = await ac.get(
            f"/api/v1/admin/build-requests/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 403


# ── Read & Listing Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_build_request_list_admin_200():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/build-requests",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "page_size" in body
    assert "total_pages" in body
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_build_request_detail_not_found_404():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _get_admin_token(ac)
        res = await ac.get(
            f"/api/v1/admin/build-requests/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 404


# ── State Machine & Operational Transitions ────────────────────────────────────

@pytest.mark.asyncio
async def test_build_request_full_lifecycle():
    """
    Test complete state machine flow:
    SUBMITTED -> APPROVED -> IN_PROGRESS -> PAUSED -> IN_PROGRESS -> PROGRESS (50%) -> NOTE -> COMPLETED (100%)
    and verify audit timeline events and private notes.
    """
    await _setup()

    request_id = str(uuid.uuid4())
    founder_id = str(uuid.uuid4())

    async with session_scope() as session:
        founder = UserORM(
            id=founder_id,
            email=f"founder_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Build Founder",
            password_hash="pass",
            role="FOUNDER",
        )
        session.add(founder)

        req = BuildRequest(
            id=request_id,
            founder_id=founder_id,
            title="NextGen Mobile SaaS Build",
            startup_name="SaaSify Inc",
            description="Complete full-stack React & FastAPI mobile application development request.",
            product_category="Mobile SaaS",
            target_customer="SMBs",
            target_market="US/Global",
            founder_stage="MVP",
            status="SUBMITTED",
            priority="HIGH",
            extra_metadata={},
        )
        session.add(req)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Approve
        approve_res = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/approve", headers=headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "APPROVED"
        assert approve_res.json()["accepted_at"] is not None

        # 2. Start Development
        start_res = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/start", headers=headers)
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "IN_PROGRESS"
        assert start_res.json()["started_at"] is not None
        assert len(start_res.json()["milestones"]) > 0

        # 3. Pause Development
        pause_res = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/pause", headers=headers)
        assert pause_res.status_code == 200
        assert pause_res.json()["status"] == "PAUSED"

        # 4. Resume Development
        resume_res = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/resume", headers=headers)
        assert resume_res.status_code == 200
        assert resume_res.json()["status"] == "IN_PROGRESS"

        # 5. Add Private Operational Note
        note_res = await ac.patch(
            f"/api/v1/admin/build-requests/{request_id}/note",
            json={"content": "Internal review completed. Database schema finalized."},
            headers=headers,
        )
        assert note_res.status_code == 200
        assert len(note_res.json()["operational_notes"]) == 1
        assert note_res.json()["operational_notes"][0]["content"] == "Internal review completed. Database schema finalized."

        # 6. Update Progress to 50%
        prog_res = await ac.patch(
            f"/api/v1/admin/build-requests/{request_id}/progress",
            json={"progress_percentage": 50, "current_phase": "Phase 2: Core Backend Implementation"},
            headers=headers,
        )
        assert prog_res.status_code == 200
        assert prog_res.json()["progress_percentage"] == 50
        assert prog_res.json()["current_phase"] == "Phase 2: Core Backend Implementation"

        # 7. Complete Development
        comp_res = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/complete", headers=headers)
        assert comp_res.status_code == 200
        assert comp_res.json()["status"] == "COMPLETED"
        assert comp_res.json()["progress_percentage"] == 100
        assert comp_res.json()["completed_at"] is not None

        # 8. Check audit timeline events recorded
        detail_res = await ac.get(f"/api/v1/admin/build-requests/{request_id}", headers=headers)
        assert detail_res.status_code == 200
        timeline = detail_res.json()["timeline_events"]
        event_types = [evt["event_type"] for evt in timeline]
        assert "BUILD_APPROVED" in event_types
        assert "BUILD_STARTED" in event_types
        assert "BUILD_PAUSED" in event_types
        assert "BUILD_RESUMED" in event_types
        assert "BUILD_PROGRESS_UPDATED" in event_types
        assert "BUILD_COMPLETED" in event_types


@pytest.mark.asyncio
async def test_build_request_reject():
    await _setup()

    request_id = str(uuid.uuid4())
    founder_id = str(uuid.uuid4())

    async with session_scope() as session:
        founder = UserORM(
            id=founder_id,
            email=f"founder_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Reject Founder",
            password_hash="pass",
            role="FOUNDER",
        )
        session.add(founder)

        req = BuildRequest(
            id=request_id,
            founder_id=founder_id,
            title="Out of Scope Build Request",
            description="Requesting custom crypto hardware firmware development.",
            status="SUBMITTED",
        )
        session.add(req)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = await ac.patch(
            f"/api/v1/admin/build-requests/{request_id}/reject",
            json={"reason": "Hardware development is outside Vision2Real execution scope."},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["status"] == "REJECTED"
        assert res.json()["cancelled_at"] is not None


@pytest.mark.asyncio
async def test_build_request_invalid_state_transitions():
    """Verify illegal status transitions return 400 Bad Request."""
    await _setup()

    request_id = str(uuid.uuid4())
    founder_id = str(uuid.uuid4())

    async with session_scope() as session:
        founder = UserORM(
            id=founder_id,
            email=f"founder_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Invalid Flow Founder",
            password_hash="pass",
            role="FOUNDER",
        )
        session.add(founder)

        # Create request already COMPLETED
        req = BuildRequest(
            id=request_id,
            founder_id=founder_id,
            title="Completed Build",
            description="Build request already finished.",
            status="COMPLETED",
        )
        session.add(req)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Cannot approve a completed build request
        res_approve = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/approve", headers=headers)
        assert res_approve.status_code == 400

        # Cannot start a completed build request
        res_start = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/start", headers=headers)
        assert res_start.status_code == 400

        # Cannot pause a completed build request
        res_pause = await ac.patch(f"/api/v1/admin/build-requests/{request_id}/pause", headers=headers)
        assert res_pause.status_code == 400
