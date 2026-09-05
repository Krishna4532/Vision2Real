# Vision2Real - Integration Tests: Flow Isolation and Sequential Submissions (Stage 6.7.1)
# Verifies complete separation between Reality Sprint and Build My Product database models, APIs, and analytics.

import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models import Base
from app.core.database import AsyncSessionLocal, engine, init_db
from app.models.auth import UserORM
from app.models.build_request import BuildRequest
from app.models.reality_sprint import RealitySprint
from app.services.build_request_service import BuildRequestService
from app.services.reality_sprint_service import RealitySprintService
from app.schemas.build_request import BuildRequestCreate
from app.schemas.reality_sprint import RealitySprintCreate
from app.auth.hashing import hash_password
from sqlalchemy import select


@pytest_asyncio.fixture
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_build_request_and_reality_sprint_isolation(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Founder Alpha",
        email=f"alpha_{uid}@example.com",
        password_hash=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    build_service = BuildRequestService(db_session)
    sprint_service = RealitySprintService(db_session)

    # 1. Submit Build Request
    build_payload = BuildRequestCreate(
        title="SaaS Platform MVP",
        startup_name="Alpha Tech",
        description="Full stack SaaS application development",
        product_category="Full-Stack Software",
        target_customer="Email",
        target_market="Software & Technology",
        founder_stage="Idea",
        priority="NORMAL",
        estimated_duration_days=30,
        current_phase="Submission",
        current_milestone="Request Received",
        idempotency_key=f"idem-bld-{uid}",
    )
    created_build = await build_service.create_request(founder, build_payload)
    assert created_build.id is not None

    # Verify Reality Sprint table has 0 records for this founder
    sprints_query = await db_session.execute(
        select(RealitySprint).where(RealitySprint.founder_id == founder.id)
    )
    assert len(sprints_query.scalars().all()) == 0

    # 2. Submit Reality Sprint
    sprint_payload = RealitySprintCreate(
        title="Market Reality Analysis",
        startup_name="Alpha Tech",
        description="Comprehensive technical specification and roadmap",
        target_customer="Tech Users",
        target_market="Software & Technology",
        founder_stage="Idea",
        priority="NORMAL",
        request_source="MARKETING_BUILD_PAGE",
        execution_mode="v1",
        version=1,
    )
    created_sprint = await sprint_service.create_sprint(founder, sprint_payload)
    assert created_sprint.id is not None

    # Verify IDs are distinct and independent
    assert created_build.id != created_sprint.id

    # Verify count of build requests is 1 and reality sprints is 1
    builds_after = await db_session.execute(
        select(BuildRequest).where(BuildRequest.founder_id == founder.id)
    )
    sprints_after = await db_session.execute(
        select(RealitySprint).where(RealitySprint.founder_id == founder.id)
    )
    assert len(builds_after.scalars().all()) == 1
    assert len(sprints_after.scalars().all()) == 1


@pytest.mark.asyncio
async def test_multiple_sequential_submissions_different_uuids(db_session):
    uid = str(uuid.uuid4())[:8]
    founder = UserORM(
        full_name="Founder Beta",
        email=f"beta_{uid}@example.com",
        password_hash=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(founder)
    await db_session.commit()
    await db_session.refresh(founder)

    build_service = BuildRequestService(db_session)
    sprint_service = RealitySprintService(db_session)

    # 1. Create first Build Request
    b1 = await build_service.create_request(
        founder,
        BuildRequestCreate(
            title="First Build Request",
            description="First submission description",
            idempotency_key=f"bld-1-{uid}",
        ),
    )

    # 2. Create second Build Request
    b2 = await build_service.create_request(
        founder,
        BuildRequestCreate(
            title="Second Build Request",
            description="Second submission description",
            idempotency_key=f"bld-2-{uid}",
        ),
    )

    assert b1.id != b2.id

    # 3. Create first Reality Sprint
    s1 = await sprint_service.create_sprint(
        founder,
        RealitySprintCreate(
            title="First Reality Sprint",
            description="First sprint description",
        ),
    )

    # 4. Create second Reality Sprint
    s2 = await sprint_service.create_sprint(
        founder,
        RealitySprintCreate(
            title="Second Reality Sprint",
            description="Second sprint description",
        ),
    )

    assert s1.id != s2.id
    assert len({b1.id, b2.id, s1.id, s2.id}) == 4


@pytest.mark.asyncio
async def test_reality_sprint_visibility_and_analytics_isolation():
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Founder A
        email_a = f"founder_sprint_a_{uuid.uuid4().hex[:8]}@example.com"
        signup_a = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Sprint A", "email": email_a, "password": "Password123!"},
        )
        assert signup_a.status_code == 201
        token_a = signup_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Create Founder B
        email_b = f"founder_sprint_b_{uuid.uuid4().hex[:8]}@example.com"
        signup_b = await client.post(
            "/api/v1/auth/signup",
            json={"full_name": "Founder Sprint B", "email": email_b, "password": "Password123!"},
        )
        assert signup_b.status_code == 201
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 1. Submit Reality Sprint by Founder A
        sprint_payload = {
            "title": "Autonomous AI Agent Validation",
            "startup_name": "Agentic Labs",
            "description": "Validating multi-agent orchestration for enterprise workflows.",
            "target_customer": "Enterprise Tech Leads",
            "target_market": "Developer Infrastructure",
            "founder_stage": "MVP",
            "priority": "HIGH",
            "request_source": "MARKETING_BUILD_PAGE",
        }
        create_res = await client.post("/api/v1/reality-sprints", json=sprint_payload, headers=headers_a)
        assert create_res.status_code == 201
        created_data = create_res.json()["data"]
        sprint_id = created_data["id"]
        assert created_data["title"] == "Autonomous AI Agent Validation"
        assert created_data["status"] == "SUBMITTED"

        # 2. Verify Founder A GET /api/v1/reality-sprints lists the new record
        list_a = await client.get("/api/v1/reality-sprints", headers=headers_a)
        assert list_a.status_code == 200
        l_a = list_a.json()
        assert l_a["pagination"]["total"] == 1
        assert l_a["data"][0]["id"] == sprint_id

        # 3. Multi-account isolation: Founder B GET /api/v1/reality-sprints sees 0 records
        list_b = await client.get("/api/v1/reality-sprints", headers=headers_b)
        assert list_b.status_code == 200
        assert list_b.json()["pagination"]["total"] == 0

        # 4. Analytics: Founder A sees total_requests = 1, submitted = 1
        an_a = await client.get("/api/v1/reality-sprints/analytics", headers=headers_a)
        assert an_a.status_code == 200
        an_data_a = an_a.json()["analytics"]
        assert an_data_a["total_requests"] == 1
        assert an_data_a["submitted"] == 1

        # Founder B analytics shows 0 total_requests
        an_b = await client.get("/api/v1/reality-sprints/analytics", headers=headers_b)
        assert an_b.status_code == 200
        assert an_b.json()["analytics"]["total_requests"] == 0
