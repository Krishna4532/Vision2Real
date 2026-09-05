import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.schemas.validation import ValidationStatus


@pytest.mark.asyncio
async def test_validation_health_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/validations/health")
    assert response.status_code == 200
    data = response.json()
    assert "provider_status" in data
    assert "database_status" in data
    assert "storage_status" in data


@pytest.mark.asyncio
async def test_validation_async_lifecycle_flow(client: AsyncClient):
    # 1. Post validation request
    payload = {
        "idea_description": "An AI-powered automated code review platform for teams.",
        "target_customer": "Software Engineers",
        "target_market": "B2B SaaS",
        "founder_stage": "IDEA",
        "source": "marketing",
        "guest_session_id": "test-session-12345",
    }
    
    response = await client.post(
        "/api/v1/validations",
        data={"request_data": pytest.importorskip("json").dumps(payload)},
    )
    assert response.status_code == 200
    data = response.json()
    val_id = data["id"]
    
    # Should start in QUEUED or PROCESSING state immediately (non-blocking)
    assert data["status"] in [ValidationStatus.QUEUED.value, ValidationStatus.PROCESSING.value, ValidationStatus.COMPLETED.value]

    # 2. Check status endpoint
    status_resp = await client.get(
        f"/api/v1/validations/status/{val_id}?guest_session_id=test-session-12345"
    )
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["id"] == val_id
    assert status_data["status"] in ["QUEUED", "PROCESSING", "COMPLETED"]

    # 3. Get full detail endpoint
    detail_resp = await client.get(
        f"/api/v1/validations/{val_id}?guest_session_id=test-session-12345"
    )
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["id"] == val_id
    assert detail_data["inputs"]["idea_description"] == payload["idea_description"]
