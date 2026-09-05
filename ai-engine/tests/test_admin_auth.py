from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.bootstrap.admin_seed import ensure_super_admin_exists, SUPER_ADMIN_EMAIL
from app.core.database import init_db, session_scope
from app.core.roles import Roles
from app.main import app


@pytest.mark.asyncio
async def test_super_admin_seed():
    await init_db()
    async with session_scope() as session:
        admin_user = await ensure_super_admin_exists(session)
        assert admin_user is not None
        assert admin_user.email == SUPER_ADMIN_EMAIL
        assert admin_user.role == Roles.SUPER_ADMIN


@pytest.mark.asyncio
async def test_admin_me_endpoint_access_control():
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create standard founder
        founder_email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
        founder_pass = "Password123!"
        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Standard Founder", "email": founder_email, "password": founder_pass},
        )
        assert signup_res.status_code == 201
        founder_token = signup_res.json()["access_token"]
        assert signup_res.json()["user"]["role"] == Roles.FOUNDER

        # 2. Login Super Admin
        login_admin_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "SuperAdmin@V2R2026!"},
        )
        assert login_admin_res.status_code == 200
        admin_token = login_admin_res.json()["access_token"]
        assert login_admin_res.json()["user"]["role"] == Roles.SUPER_ADMIN

        # 3. Anonymous access -> 401 Unauthorized
        res_anon = await ac.get("/api/v1/admin/me")
        assert res_anon.status_code == 401

        # 4. Founder user access -> 403 Forbidden
        res_founder = await ac.get(
            "/api/v1/admin/me",
            headers={"Authorization": f"Bearer {founder_token}"},
        )
        assert res_founder.status_code == 403
        assert "Super Admin privileges required" in res_founder.json()["detail"]

        # 5. Super Admin access -> 200 OK
        res_admin = await ac.get(
            "/api/v1/admin/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        data = res_admin.json()
        assert data["email"] == SUPER_ADMIN_EMAIL
        assert data["role"] == Roles.SUPER_ADMIN


@pytest.mark.asyncio
async def test_admin_dashboard_summary_access_control():
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        founder_email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder User", "email": founder_email, "password": "Password123!"},
        )
        founder_token = signup_res.json()["access_token"]

        login_admin_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "SuperAdmin@V2R2026!"},
        )
        admin_token = login_admin_res.json()["access_token"]

        # Founder blocked -> 403
        res_founder = await ac.get(
            "/api/v1/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {founder_token}"},
        )
        assert res_founder.status_code == 403

        # Super admin allowed -> 200
        res_admin = await ac.get(
            "/api/v1/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        body = res_admin.json()
        assert "total_founders" in body
        assert "total_reality_sprints" in body
        assert "total_build_requests" in body
