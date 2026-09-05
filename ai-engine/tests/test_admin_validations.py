"""
Stage 7.3 — Admin Validation Management Tests.

Covers:
- Admin access control (anonymous, founder, super admin)
- Validation list endpoint: basic, pagination, search, status filter, sorting
- Validation detail endpoint: 200, 404
- Founder isolation: founders cannot access admin validation APIs

All tests use an in-memory SQLite database via conftest.py.
"""
from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.bootstrap.admin_seed import ensure_super_admin_exists, SUPER_ADMIN_EMAIL
from app.core.database import init_db, session_scope
from app.models.auth import UserORM
from app.models.validation import Validation, ValidationInput
from app.main import app


# ── Helpers ───────────────────────────────────────────────────────────────────

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
        json={"full_name": "Test Founder", "email": email, "password": FOUNDER_PASSWORD},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


async def _setup() -> None:
    """Initialise DB and seed super admin."""
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)


def _transport() -> ASGITransport:
    return ASGITransport(app=app)


# ── Access Control Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validation_list_anonymous_401():
    """Unauthenticated requests to admin validation list must return 401."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/validations")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_validation_list_founder_forbidden_403():
    """Founder JWT must be rejected with 403 on admin validation list."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        founder_token = await _create_founder_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations",
            headers={"Authorization": f"Bearer {founder_token}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_validation_detail_founder_forbidden_403():
    """Founder JWT must be rejected with 403 on admin validation detail."""
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        founder_token = await _create_founder_token(ac)
        res = await ac.get(
            f"/api/v1/admin/validations/{fake_id}",
            headers={"Authorization": f"Bearer {founder_token}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_validation_detail_anonymous_401():
    """Unauthenticated requests to admin validation detail must return 401."""
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/validations/{fake_id}")
    assert res.status_code == 401


# ── Validation List Tests ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validation_list_admin_200():
    """Super Admin can list validations and receives correct response shape."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "page_size" in body
    assert "total_pages" in body
    assert isinstance(body["items"], list)
    assert body["page"] == 1
    assert body["page_size"] == 20


@pytest.mark.asyncio
async def test_validation_list_pagination_defaults():
    """Default pagination values are respected."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["total_pages"] >= 1


@pytest.mark.asyncio
async def test_validation_list_pagination_custom():
    """Custom page_size is respected."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?page=1&page_size=5",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["page_size"] == 5
    assert len(body["items"]) <= 5


@pytest.mark.asyncio
async def test_validation_list_search_returns_list():
    """Search parameter is accepted and returns a valid list."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?search=nonexistent_term_xyz",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["items"] == []
    assert body["total"] == 0


@pytest.mark.asyncio
async def test_validation_list_status_filter_completed():
    """Status filter COMPLETED returns only COMPLETED validations."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?status=COMPLETED",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    body = res.json()
    for item in body["items"]:
        assert item["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_validation_list_invalid_status_returns_all():
    """Unknown status value is silently normalised (returns all results, no 422)."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?status=INVALID_STATUS",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    # Service normalises unknown status to None (no filter) — should return 200
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_validation_list_sort_by_created_at_desc():
    """Sort by created_at desc is accepted and returns correct shape."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?sort_by=created_at&sort_order=desc",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200
    assert res.json()["page"] == 1


@pytest.mark.asyncio
async def test_validation_list_sort_by_overall_score():
    """Sort by overall_score is accepted."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?sort_by=overall_score&sort_order=asc",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_validation_list_date_filter_accepted():
    """date_from and date_to query params are accepted without error."""
    await _setup()
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            "/api/v1/admin/validations?date_from=2024-01-01&date_to=2030-12-31",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 200


# ── Validation Detail Tests ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validation_detail_not_found_404():
    """Non-existent validation ID returns 404."""
    await _setup()
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        res = await ac.get(
            f"/api/v1/admin/validations/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_validation_detail_shape_when_found():
    """
    When a validation exists, the detail endpoint returns the correct
    response shape including all required top-level fields.
    """
    await _setup()

    validation_id = str(uuid.uuid4())
    founder_id = str(uuid.uuid4())
    founder_email = f"founder_{uuid.uuid4().hex[:8]}@example.com"

    async with session_scope() as session:
        founder = UserORM(
            id=founder_id,
            email=founder_email,
            full_name="Test Founder 7.3",
            password_hash="password",
            role="FOUNDER",
            is_active=True,
            is_verified=True,
        )
        session.add(founder)

        val = Validation(
            id=validation_id,
            founder_id=founder_id,
            source="TEST",
            status="COMPLETED",
            overall_score=88.5,
            recommendation="PROCEED",
            llm_provider="google",
            llm_model="gemini-2.5-flash",
            processing_time_ms=1250,
            total_tokens=1500,
        )
        session.add(val)

        val_input = ValidationInput(
            validation_id=validation_id,
            idea_description="An AI-powered platform to help founders validate ideas.",
            target_customer="Early-stage founders",
            target_market="SaaS",
            founder_stage="IDEA",
        )
        session.add(val_input)

    async with AsyncClient(transport=_transport(), base_url="http://test") as ac:
        admin_token = await _get_admin_token(ac)
        detail_res = await ac.get(
            f"/api/v1/admin/validations/{validation_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert detail_res.status_code == 200
    body = detail_res.json()

    # Required top-level fields
    assert "id" in body
    assert body["id"] == validation_id
    assert "status" in body
    assert body["status"] == "COMPLETED"
    assert "source" in body
    assert "created_at" in body
    assert "updated_at" in body
    assert "operational" in body

    # Founder identity resolved correctly
    assert body.get("founder") is not None
    assert body["founder"]["email"] == founder_email
    assert body["founder"]["full_name"] == "Test Founder 7.3"

    # Inputs present
    assert body.get("inputs") is not None
    assert body["inputs"]["idea_description"] == "An AI-powered platform to help founders validate ideas."

    # Operational metadata
    op = body["operational"]
    assert isinstance(op, dict)
    assert op["llm_provider"] == "google"
    assert op["llm_model"] == "gemini-2.5-flash"
    assert op["processing_time_ms"] == 1250

