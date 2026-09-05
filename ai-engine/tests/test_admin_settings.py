from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.bootstrap.admin_seed import ensure_super_admin_exists, SUPER_ADMIN_EMAIL
from app.core.database import init_db, session_scope
from app.core.roles import Roles
from app.main import app


@pytest.mark.asyncio
async def test_admin_settings_summary_and_read_endpoints():
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "SuperAdmin@V2R2026!"},
        )
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Summary
        res = await ac.get("/api/v1/admin/settings/summary", headers=headers)
        assert res.status_code == 200
        summary = res.json()
        assert "organization" in summary
        assert "auth" in summary
        assert "security" in summary

        # 2. Organization
        res_org = await ac.get("/api/v1/admin/settings/organization", headers=headers)
        assert res_org.status_code == 200
        assert "Vision2Real" in res_org.json()["company_name"]

        # 3. Security
        res_sec = await ac.get("/api/v1/admin/settings/security", headers=headers)
        assert res_sec.status_code == 200
        assert "jwt_lifetime_minutes" in res_sec.json()

        # 4. Auth
        res_auth = await ac.get("/api/v1/admin/settings/auth", headers=headers)
        assert res_auth.status_code == 200
        providers = res_auth.json()["providers"]
        assert any(p["name"] == "local" for p in providers)

        # 5. Push
        res_push = await ac.get("/api/v1/admin/settings/push", headers=headers)
        assert res_push.status_code == 200
        assert "vapid_public_key" in res_push.json()

        # 6. Infrastructure
        res_infra = await ac.get("/api/v1/admin/settings/infrastructure", headers=headers)
        assert res_infra.status_code == 200
        assert "notification_templates" in res_infra.json()

        # 7. Platform
        res_plat = await ac.get("/api/v1/admin/settings/platform", headers=headers)
        assert res_plat.status_code == 200
        assert "backend_version" in res_plat.json()


@pytest.mark.asyncio
async def test_admin_users_crud_and_safety_rules():
    await init_db()
    async with session_scope() as session:
        super_admin = await ensure_super_admin_exists(session)
        super_admin_id = super_admin.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "SuperAdmin@V2R2026!"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create new admin
        new_email = f"ops_{uuid.uuid4().hex[:8]}@vision2real.ai"
        create_res = await ac.post(
            "/api/v1/admin/settings/admin-users",
            headers=headers,
            json={
                "full_name": "Ops Specialist",
                "email": new_email,
                "password": "Password123!",
                "confirm_password": "Password123!",
                "role": "OPERATIONS",
                "is_active": True,
            },
        )
        assert create_res.status_code == 201
        new_admin = create_res.json()
        assert new_admin["email"] == new_email
        assert new_admin["role"] == "OPERATIONS"
        new_admin_id = new_admin["id"]

        # 2. List admin users & search
        list_res = await ac.get(f"/api/v1/admin/settings/admin-users?search={new_email}", headers=headers)
        assert list_res.status_code == 200
        assert list_res.json()["total"] == 1

        # 3. Edit admin
        edit_res = await ac.patch(
            f"/api/v1/admin/settings/admin-users/{new_admin_id}",
            headers=headers,
            json={"full_name": "Lead Ops Manager", "role": "ADMIN"},
        )
        assert edit_res.status_code == 200
        assert edit_res.json()["full_name"] == "Lead Ops Manager"
        assert edit_res.json()["role"] == "ADMIN"

        # 4. Reset admin password
        reset_res = await ac.patch(
            f"/api/v1/admin/settings/admin-users/{new_admin_id}/password",
            headers=headers,
            json={"password": "NewSecurePassword456!", "confirm_password": "NewSecurePassword456!"},
        )
        assert reset_res.status_code == 200
        assert reset_res.json()["status"] == "success"

        # Verify new password login
        ops_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": new_email, "password": "NewSecurePassword456!"},
        )
        assert ops_login.status_code == 200

        # 5. Disable & Enable admin
        disable_res = await ac.patch(
            f"/api/v1/admin/settings/admin-users/{new_admin_id}/status",
            headers=headers,
            json={"is_active": False},
        )
        assert disable_res.status_code == 200
        assert disable_res.json()["is_active"] is False

        # Disabled admin cannot login
        disabled_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": new_email, "password": "NewSecurePassword456!"},
        )
        assert disabled_login.status_code in (400, 401)

        # 6. Safety Rule Checks:
        # Cannot disable self
        self_disable = await ac.patch(
            f"/api/v1/admin/settings/admin-users/{super_admin_id}/status",
            headers=headers,
            json={"is_active": False},
        )
        assert self_disable.status_code == 400
        assert "cannot disable yourself" in self_disable.json()["detail"].lower()

        # Cannot demote self if last Super Admin
        self_demote = await ac.patch(
            f"/api/v1/admin/settings/admin-users/{super_admin_id}",
            headers=headers,
            json={"role": "ADMIN"},
        )
        assert self_demote.status_code == 400
        assert "cannot demote yourself" in self_demote.json()["detail"].lower()


@pytest.mark.asyncio
async def test_organization_settings_and_audit_logs():
    await init_db()
    async with session_scope() as session:
        await ensure_super_admin_exists(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "SuperAdmin@V2R2026!"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Update organization settings
        update_res = await ac.patch(
            "/api/v1/admin/settings/organization",
            headers=headers,
            json={
                "company_name": "Vision2Real Inc",
                "support_email": "support@vision2real.ai",
                "support_phone": "+1-800-555-0199",
                "website": "https://vision2real.ai",
            },
        )
        assert update_res.status_code == 200
        org = update_res.json()
        assert org["company_name"] == "Vision2Real Inc"
        assert org["support_phone"] == "+1-800-555-0199"

        # 2. Regenerate VAPID keys
        regen_res = await ac.post("/api/v1/admin/settings/push/regenerate-keys", headers=headers)
        assert regen_res.status_code == 200
        assert "v2r-pub-" in regen_res.json()["vapid_public_key"]

        # 3. Query audit logs
        logs_res = await ac.get("/api/v1/admin/settings/audit-logs", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert logs["total"] >= 2
        actions = [item["action"] for item in logs["items"]]
        assert "ORGANIZATION_UPDATED" in actions
        assert "VAPID_KEYS_REGENERATED" in actions
