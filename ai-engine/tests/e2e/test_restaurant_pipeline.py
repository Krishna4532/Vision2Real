from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest
from httpx import AsyncClient

from tests.e2e.helpers import (
    assert_database_saved,
    assert_meaningful_response,
    assert_pdf_generated,
    assert_pipeline_completed,
    fetch_recent_logs,
    read_restaurant_idea,
    submit_analysis,
    wait_for_completion,
    wait_for_validation_completion,
)


@pytest.mark.asyncio
async def test_restaurant_pipeline_e2e(client: AsyncClient):
    """Exercise the real startup validation flow for one restaurant waste-reduction idea."""
    idea = read_restaurant_idea()

    analysis_status = await submit_analysis(client, idea)
    analysis_id = analysis_status["analysis_id"]
    assert analysis_id, "analysis_id should be present in the create response"

    completed_analysis = await wait_for_completion(client, analysis_id, timeout_seconds=300)
    assert_pipeline_completed(completed_analysis)

    structured = completed_analysis.get("structured_idea") or {}
    assert "food waste" in (structured.get("problem") or "").lower(), (
        "structured problem should reflect the provided restaurant waste scenario"
    )
    assert "restaurant" in (structured.get("target_customer") or "").lower(), (
        "target_customer should be populated with the restaurant user segment"
    )

    required_agent_statuses = {
        "research_status": {"success", "degraded", "completed"},
        "competition_status": {"success", "degraded", "completed"},
        "customer_status": {"success", "degraded", "completed"},
        "market_status": {"success", "degraded", "completed"},
        "business_model_status": {"success", "degraded", "completed"},
        "risk_status": {"success", "degraded", "completed"},
    }

    for key, allowed in required_agent_statuses.items():
        value = completed_analysis.get(key)
        assert value in allowed, f"{key} should be populated by a real agent run, got {value!r}"

    # Validate the major response sections are meaningful, not just present.
    summary = completed_analysis.get("report") if isinstance(completed_analysis.get("report"), dict) else None
    if summary is None:
        summary = completed_analysis.get("decision_result") or {}

    if isinstance(summary, dict):
        assert summary.get("decision") or summary.get("proposed_decision"), "decision missing from the final result"

    result = completed_analysis.get("research_result") or {}
    claims = result.get("claims") or []
    assert len(claims) > 0, "research result must include at least one claim"

    market = completed_analysis.get("market_result") or {}
    assert market.get("market_maturity") or market.get("market_category"), "market result missing key market signal"

    business = completed_analysis.get("business_model_result") or {}
    assert business.get("revenue_model") or business.get("business_viability"), "business model result missing a revenue or viability signal"

    risk = completed_analysis.get("risk_result") or {}
    assert risk.get("risks") or risk.get("overall_risk_profile"), "risk result missing risk content"

    decision = completed_analysis.get("decision_result") or {}
    decision_value = decision.get("decision") or decision.get("proposed_decision")
    assert decision_value, "decision result is missing its recommendation"

    # The real validation API is a separate pipeline from the analysis POST flow.
    payload = {
        "idea_description": idea,
        "target_customer": structured.get("target_customer") or "Restaurant operators",
        "target_market": "restaurants",
        "founder_stage": "IDEA",
        "source": "workspace",
        "guest_session_id": "e2e-session",
    }

    validation_response = await client.post(
        "/api/v1/validations",
        data={"request_data": json.dumps(payload)},
    )
    assert validation_response.status_code == 200, (
        f"validation submission failed: {validation_response.status_code} {validation_response.text}"
    )
    validation = validation_response.json()
    validation_id = validation["id"]
    assert validation_id, "validation id missing from submission response"

    completed_validation = await wait_for_validation_completion(
        client,
        validation_id,
        guest_session_id="e2e-session",
        timeout_seconds=300,
    )

    assert completed_validation["status"] in {"COMPLETED", "PROCESSING", "QUEUED"}, (
        f"unexpected validation finished status: {completed_validation.get('status')}"
    )
    assert completed_validation.get("overall_score") is not None, "validation overall_score missing"
    assert completed_validation.get("recommendation"), "validation recommendation missing"
    assert completed_validation.get("report_data") is not None, "validation report_data missing"

    report_data = completed_validation["report_data"]
    assert report_data.get("executive_summary"), "executive_summary missing from validation report"
    assert report_data.get("business_model"), "business_model missing from validation report"
    assert report_data.get("market_opportunity"), "market_opportunity missing from validation report"
    assert report_data.get("financial_outlook"), "financial_outlook missing from validation report"
    assert report_data.get("risk_assessment"), "risk_assessment missing from validation report"
    assert report_data.get("recommendation"), "recommendation missing from validation report"
    assert report_data.get("overall_score") is not None, "overall_score missing from validation report"

    pdf_path = Path("./uploads/pdf_reports")
    matches = list(pdf_path.glob(f"Vision2Real_Validation_{validation_id[:8]}*.pdf"))
    assert matches, f"no PDF files were generated for validation {validation_id}"
    assert matches[0].exists() and matches[0].stat().st_size > 0, "generated PDF is empty or missing"

    logs = await fetch_recent_logs(max_lines=250)
    assert logs, "no application logs found for end-to-end validation run"
    joined = "\n".join(logs)
    assert "Analysis Started" in joined or "Validation Pipeline Started" in joined, "analysis log sequence missing start marker"
    assert "Idea Extraction" in joined, "idea extraction log marker missing"
    assert "Research" in joined or "Research Agent" in joined, "research log marker missing"
    assert "Market" in joined or "Market Analysis" in joined, "market log marker missing"
    assert "Business Model" in joined or "Business Model Agent" in joined, "business model log marker missing"
    assert "Financial" in joined or "Financial Agent" in joined, "financial log marker missing"
    assert "Risk" in joined or "Risk Analysis" in joined, "risk log marker missing"
    assert "Decision" in joined or "Scoring" in joined, "decision log marker missing"
    assert "PDF" in joined or "Generating PDF" in joined, "PDF generation log missing"
    assert "Completed" in joined or "Validation Finished" in joined, "completion log missing"

    assert_database_saved(completed_validation)
    assert_meaningful_response(completed_validation)
    assert_pdf_generated(str(matches[0]))
