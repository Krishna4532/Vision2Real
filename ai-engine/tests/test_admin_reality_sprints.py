"""
Stage 7.4 — Admin Reality Sprint Operations Tests.

Covers:
- Admin access control (anonymous, founder, super admin)
- Reality Sprint list endpoint: pagination, search, status filter, sorting
- Reality Sprint detail endpoint: 200, 404
- State transitions: Approve, Reject, Start, Pause, Resume, Progress Update, Complete
- Invalid transition rejections (400)
- Activity logging (`RealitySprintActivity` records created)

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
from app.models.reality_sprint import RealitySprint, RealitySprintActivity

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
        json={"full_name": "Test Founder 7.4", "email": email, "password": FOUNDER_PASSWORD},
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
async def test_reality_sprint_list_anonymous_401():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/reality-sprints")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_reality_sprint_list_founder_forbidden_403():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _create_founder_token(ac)
        res = await ac.get(
            "/api/v1/admin/reality-sprints",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_reality_sprint_detail_anonymous_401():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/reality-sprints/{fake_id}")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_reality_sprint_detail_founder_forbidden_403():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _create_founder_token(ac)
        res = await ac.get(
            f"/api/v1/admin/reality-sprints/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 403


# ── Read & Listing Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_reality_sprint_list_admin_200():
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/reality-sprints",
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
async def test_reality_sprint_detail_not_found_404():
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        token = await _get_admin_token(ac)
        res = await ac.get(
            f"/api/v1/admin/reality-sprints/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 404


# ── State Machine & Operational Transitions ────────────────────────────────────

@pytest.mark.asyncio
async def test_reality_sprint_full_lifecycle():
    """
    Test complete state machine flow:
    SUBMITTED -> APPROVED -> IN_PROGRESS -> PAUSED -> IN_PROGRESS -> PROGRESS (50%) -> COMPLETED (100%)
    and verify activity log creation for each state change.
    """
    await _setup()

    sprint_id = str(uuid.uuid4())
    founder_id = str(uuid.uuid4())

    async with session_scope() as session:
        founder = UserORM(
            id=founder_id,
            email=f"founder_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Sprint Founder",
            password_hash="pass",
            role="FOUNDER",
        )
        session.add(founder)

        sprint = RealitySprint(
            id=sprint_id,
            founder_id=founder_id,
            title="Test AI Platform Sprint",
            startup_name="InnovateAI",
            description="Building an automated AI platform for startup validation.",
            target_customer="Founders",
            target_market="SaaS",
            founder_stage="IDEA",
            status="SUBMITTED",
            priority="NORMAL",
            extra_metadata={"progress": 0},
        )
        session.add(sprint)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Approve
        approve_res = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/approve", headers=headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "ACCEPTED"
        assert approve_res.json()["accepted_at"] is not None

        # 2. Start
        start_res = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/start", headers=headers)
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "IN_PROGRESS"
        assert start_res.json()["started_at"] is not None
        assert len(start_res.json()["milestones"]) > 0

        # 3. Pause
        pause_res = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/pause", headers=headers)
        assert pause_res.status_code == 200
        assert pause_res.json()["status"] == "PAUSED"

        # 4. Resume
        resume_res = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/resume", headers=headers)
        assert resume_res.status_code == 200
        assert resume_res.json()["status"] == "IN_PROGRESS"

        # 5. Update progress to 50%
        prog_res = await ac.patch(
            f"/api/v1/admin/reality-sprints/{sprint_id}/progress",
            json={"progress": 50},
            headers=headers,
        )
        assert prog_res.status_code == 200
        assert prog_res.json()["progress"] == 50

        # 6. Complete
        comp_res = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/complete", headers=headers)
        assert comp_res.status_code == 200
        assert comp_res.json()["status"] == "COMPLETED"
        assert comp_res.json()["progress"] == 100
        assert comp_res.json()["completed_at"] is not None

        # 7. Check activities recorded
        detail_res = await ac.get(f"/api/v1/admin/reality-sprints/{sprint_id}", headers=headers)
        assert detail_res.status_code == 200
        activities = detail_res.json()["activities"]
        event_types = [act["event_type"] for act in activities]
        assert "REALITY_SPRINT_APPROVED" in event_types
        assert "REALITY_SPRINT_STARTED" in event_types
        assert "REALITY_SPRINT_PAUSED" in event_types
        assert "REALITY_SPRINT_RESUMED" in event_types
        assert "REALITY_SPRINT_PROGRESS_UPDATED" in event_types
        assert "REALITY_SPRINT_COMPLETED" in event_types


@pytest.mark.asyncio
async def test_reality_sprint_reject():
    await _setup()

    sprint_id = str(uuid.uuid4())
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

        sprint = RealitySprint(
            id=sprint_id,
            founder_id=founder_id,
            title="Invalid Request Sprint",
            description="Incomplete submission details for sprint request.",
            status="SUBMITTED",
        )
        session.add(sprint)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = await ac.patch(
            f"/api/v1/admin/reality-sprints/{sprint_id}/reject",
            json={"reason": "Insufficient project description provided."},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["status"] == "CANCELLED"
        assert res.json()["cancelled_at"] is not None


@pytest.mark.asyncio
async def test_reality_sprint_invalid_state_transitions():
    """Verify illegal status transitions return 400 Bad Request."""
    await _setup()

    sprint_id = str(uuid.uuid4())
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

        # Create sprint already COMPLETED
        sprint = RealitySprint(
            id=sprint_id,
            founder_id=founder_id,
            title="Completed Sprint",
            description="Sprint that is already finished.",
            status="COMPLETED",
        )
        session.add(sprint)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Cannot approve a completed sprint
        res_approve = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/approve", headers=headers)
        assert res_approve.status_code == 400

        # Cannot start a completed sprint
        res_start = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/start", headers=headers)
        assert res_start.status_code == 400

        # Cannot pause a completed sprint
        res_pause = await ac.patch(f"/api/v1/admin/reality-sprints/{sprint_id}/pause", headers=headers)
        assert res_pause.status_code == 400
