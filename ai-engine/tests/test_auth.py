import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt import create_access_token, verify_access_token, create_refresh_token, verify_refresh_token


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"
        assert "environment" in data


@pytest.mark.asyncio
async def test_password_hashing():
    raw_pass = "SecurePass123!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_jwt_utilities():
    user_id = "test-user-uuid"
    email = "test@example.com"

    access_token = create_access_token(user_id, email)
    payload = verify_access_token(access_token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "access"

    refresh_token, _ = create_refresh_token(user_id, email)
    ref_payload = verify_refresh_token(refresh_token)
    assert ref_payload is not None
    assert ref_payload["sub"] == user_id
    assert ref_payload["type"] == "refresh"


@pytest.mark.asyncio
async def test_e2e_authentication_smoke_test():
    from app.core.database import init_db
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"founder_{uuid.uuid4().hex[:8]}@example.com"
        password = "Password123!"
        full_name = "Jane Founder"

        # 1. Signup
        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": full_name, "email": email, "password": password},
        )
        assert signup_res.status_code == 201
        s_data = signup_res.json()
        assert "access_token" in s_data
        assert "refresh_token" in s_data
        assert s_data["user"]["email"] == email

        initial_refresh = s_data["refresh_token"]

        # 2. Login
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200
        l_data = login_res.json()
        access_token = l_data["access_token"]
        refresh_token = l_data["refresh_token"]

        # 3. GET /me
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email

        # 4. Refresh Access Token
        refresh_res = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_res.status_code == 200
        r_data = refresh_res.json()
        new_refresh = r_data["refresh_token"]

        # 5. Logout
        logout_res = await ac.post(
            "/api/v1/auth/logout",
            json={"refresh_token": new_refresh},
        )
        assert logout_res.status_code == 200
        assert logout_res.json()["message"] == "Successfully logged out."

        # 6. Attempt Refresh Again -> must fail (401)
        failed_refresh = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": new_refresh},
        )
        assert failed_refresh.status_code == 401

        # 7. Login Again -> must succeed (200)
        relogin_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert relogin_res.status_code == 200
        assert "access_token" in relogin_res.json()


@pytest.mark.asyncio
async def test_auth_edge_cases():
    from app.core.database import init_db
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"dupe_{uuid.uuid4().hex[:8]}@example.com"
        password = "Password123!"

        # Create user
        s_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Dupe User", "email": email, "password": password},
        )
        assert s_res.status_code == 201

        # Duplicate signup -> 400
        dupe_res = await ac.post(
            "/api/v1/auth/signup",
            json={"full_name": "Dupe User", "email": email, "password": password},
        )
        assert dupe_res.status_code == 400

        # Wrong password -> 401
        wrong_pass = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword!"},
        )
        assert wrong_pass.status_code == 401

        # Invalid token on /me -> 401
        invalid_me = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token_str"},
        )
        assert invalid_me.status_code == 401
