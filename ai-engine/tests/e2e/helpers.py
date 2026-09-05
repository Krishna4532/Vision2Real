from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient


def read_restaurant_idea() -> str:
    idea_path = Path(__file__).parent / "data" / "restaurant_ai.txt"
    return idea_path.read_text(encoding="utf-8").strip()


async def submit_analysis(client: AsyncClient, idea: str) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/analysis",
        json={"idea": idea},
    )
    assert response.status_code == 201, (
        f"analysis submission failed: {response.status_code} {response.text}"
    )
    body = response.json()
    assert "analysis_id" in body, f"missing analysis_id in response: {body}"
    assert body["status"] in {"completed", "degraded", "pending", "in_progress"}, (
        f"unexpected initial status: {body}"
    )
    return body


async def wait_for_completion(client: AsyncClient, analysis_id: str, timeout_seconds: int = 300) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_payload: dict[str, Any] | None = None

    while time.monotonic() < deadline:
        response = await client.get(f"/api/v1/analysis/{analysis_id}")
        assert response.status_code == 200, (
            f"analysis fetch failed for {analysis_id}: {response.status_code} {response.text}"
        )
        payload = response.json()
        last_payload = payload

        status = str(payload.get("status", "")).lower()
        if status in {"completed", "degraded", "rejected", "requires_clarification"}:
            return payload

        if status in {"pending", "in_progress"}:
            time.sleep(1)
            continue

        pytest.fail(f"unexpected pipeline status for {analysis_id}: {payload}")

    pytest.fail(
        f"analysis {analysis_id} did not complete within {timeout_seconds}s; "
        f"last status: {last_payload.get('status') if last_payload else 'unknown'}"
    )


async def fetch_validation(client: AsyncClient, validation_id: str, *, guest_session_id: str = "e2e-session") -> dict[str, Any]:
    response = await client.get(
        f"/api/v1/validations/{validation_id}?guest_session_id={guest_session_id}"
    )
    assert response.status_code == 200, (
        f"validation fetch failed: {response.status_code} {response.text}"
    )
    return response.json()


async def wait_for_validation_completion(client: AsyncClient, validation_id: str, *, guest_session_id: str = "e2e-session", timeout_seconds: int = 300) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_payload: dict[str, Any] | None = None

    while time.monotonic() < deadline:
        response = await client.get(
            f"/api/v1/validations/status/{validation_id}?guest_session_id={guest_session_id}"
        )
        assert response.status_code == 200, (
            f"validation status fetch failed: {response.status_code} {response.text}"
        )
        payload = response.json()
        last_payload = payload

        status = str(payload.get("status", "")).upper()
        if status == "COMPLETED":
            return await fetch_validation(client, validation_id, guest_session_id=guest_session_id)
        if status in {"FAILED", "QUEUED", "PROCESSING"}:
            time.sleep(1)
            continue
        pytest.fail(f"unexpected validation status for {validation_id}: {payload}")

    pytest.fail(
        f"validation {validation_id} did not complete within {timeout_seconds}s; "
        f"last status: {last_payload.get('status') if last_payload else 'unknown'}"
    )


def assert_pipeline_completed(payload: dict[str, Any]) -> None:
    status = str(payload.get("status", "")).lower()
    assert status in {"completed", "degraded"}, (
        f"pipeline should have completed or degraded, got status={payload.get('status')!r}"
    )

    structured = payload.get("structured_idea") or {}
    assert structured.get("problem"), f"missing structured problem: {payload}"
    assert structured.get("solution"), f"missing structured solution: {payload}"
    assert structured.get("target_customer"), f"missing target customer: {payload}"

    attributes = [
        ("research_status", "research_result"),
        ("competition_status", "competition_result"),
        ("customer_status", "customer_result"),
        ("market_status", "market_result"),
        ("business_model_status", "business_model_result"),
        ("risk_status", "risk_result"),
    ]

    for status_key, result_key in attributes:
        status_value = payload.get(status_key)
        result_value = payload.get(result_key)
        if status_value in {"failed", "rejected"}:
            assert result_value in (None, {}), (
                f"{status_key} failed but returned data unexpectedly: {result_value}"
            )
        else:
            assert status_value in {"success", "degraded", "completed", "pending"}, (
                f"unexpected {status_key} status: {status_value}"
            )
            if result_key == "research_result":
                assert result_value is not None, f"research_result missing despite status={status_value}"


def assert_pdf_generated(pdf_path: str | None) -> None:
    assert pdf_path, "pdf path was not recorded"
    path = Path(pdf_path)
    assert path.exists(), f"expected PDF file at {pdf_path}"
    assert path.is_file(), f"PDF path is not a file: {pdf_path}"
    assert path.stat().st_size > 0, f"PDF file is empty: {pdf_path}"


def assert_database_saved(validation_record: dict[str, Any]) -> None:
    assert validation_record.get("id"), "validation id missing"
    assert validation_record.get("status") in {"COMPLETED", "PROCESSING", "QUEUED"}, (
        f"unexpected validation status: {validation_record.get('status')}"
    )
    assert validation_record.get("overall_score") is not None, "overall_score missing"
    assert validation_record.get("report_data") is not None, "report_data missing"
    assert validation_record["report_data"].get("executive_summary"), "executive summary missing"
    assert validation_record["report_data"].get("overall_score") is not None, "report overall_score missing"
    assert validation_record.get("created_at"), "created_at missing"
    assert validation_record.get("updated_at"), "updated_at missing"

    if validation_record.get("report_data", {}).get("pdf_url"):
        assert "pdf" in str(validation_record["report_data"]["pdf_url"]), (
            f"pdf_url looks invalid: {validation_record['report_data']['pdf_url']}"
        )


def assert_meaningful_response(payload: dict[str, Any]) -> None:
    report_data = payload.get("report_data") or {}
    assert report_data.get("executive_summary"), "executive_summary missing"
    assert report_data.get("business_model"), "business_model missing"
    assert report_data.get("market_opportunity"), "market_opportunity missing"
    assert report_data.get("financial_outlook"), "financial_outlook missing"
    assert report_data.get("risk_assessment"), "risk_assessment missing"
    assert report_data.get("recommendation"), "recommendation missing"
    assert report_data.get("overall_score") is not None, "overall_score missing"

    if isinstance(report_data.get("scores"), dict):
        assert report_data["scores"].get("overall_score") is not None


async def assert_pipeline_logs(logs: list[str]) -> None:
    required = [
        "Analysis Started",
        "Idea Extraction",
        "Research",
        "Market",
        "Business Model",
        "Financial",
        "Risk",
        "Decision",
        "PDF Generated",
        "Database Saved",
        "Completed",
    ]
    joined = "\n".join(logs)
    for item in required:
        assert item in joined, f"missing expected pipeline log: {item}\nObserved: {joined[:2000]}"


async def fetch_recent_logs(max_lines: int = 200) -> list[str]:
    log_path = Path("./logs") / "vision2real.log"
    if not log_path.exists():
        return []
    lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-max_lines:]
    return [line.strip() for line in lines if line.strip()]
