"""Sprint 2C.2 — Tests for Validation Orchestrator, Agents, SSE stream, PDF generation."""
import asyncio
import json
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas.validation import ValidationProgress


# ─── Agent Unit Tests ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_document_parser_agent_runs():
    from app.services.agents.concrete_agents import DocumentParserAgent
    agent = DocumentParserAgent()
    assert agent.name == "Document Parser"
    assert agent.status == "waiting"
    result = await agent.run({"idea_description": "A SaaS platform for startup validation.", "attachments": []})
    assert "parsed_text" in result
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_research_agent_runs():
    from app.services.agents.concrete_agents import ResearchAgent
    agent = ResearchAgent()
    result = await agent.run({"target_market": "B2B SaaS"})
    assert "evidence_signals" in result
    assert isinstance(result["evidence_signals"], list)
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_market_analysis_agent_runs():
    from app.services.agents.concrete_agents import MarketAnalysisAgent
    agent = MarketAnalysisAgent()
    result = await agent.run({"target_customer": "Startup Founders"})
    assert "market_size" in result
    assert "market_opportunity" in result
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_business_model_agent_runs():
    from app.services.agents.concrete_agents import BusinessModelAgent
    agent = BusinessModelAgent()
    result = await agent.run({})
    assert "monetization_type" in result
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_financial_agent_runs():
    from app.services.agents.concrete_agents import FinancialAgent
    agent = FinancialAgent()
    result = await agent.run({})
    assert "gross_margin" in result
    assert "financial_outlook" in result
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_risk_analysis_agent_runs():
    from app.services.agents.concrete_agents import RiskAnalysisAgent
    agent = RiskAnalysisAgent()
    result = await agent.run({})
    assert "risks" in result
    assert isinstance(result["risks"], list)
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_scoring_agent_runs():
    from app.services.agents.concrete_agents import ScoringAgent
    agent = ScoringAgent()
    result = await agent.run({})
    assert "overall_score" in result
    assert result["overall_score"] > 0
    assert result["recommendation"] in ("PROCEED", "PIVOT", "PAUSE")
    assert agent.status == "completed"


@pytest.mark.asyncio
async def test_report_generation_agent_runs():
    from app.services.agents.concrete_agents import ReportGenerationAgent
    agent = ReportGenerationAgent()
    result = await agent.run({})
    assert "report_summary" in result
    assert agent.status == "completed"


# ─── Base Agent Failure Mode ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_base_agent_failure_marking():
    from app.services.agents.base_agent import BaseAgent
    class BrokenAgent(BaseAgent):
        def __init__(self):
            super().__init__("Broken", "Always fails")
        async def run(self, context):
            raise RuntimeError("Simulated agent failure")

    agent = BrokenAgent()
    try:
        await agent.run({})
    except RuntimeError:
        agent.mark_failed("Simulated agent failure")

    assert agent.status == "failed"
    assert "Simulated" in (agent.error_message or "")


# ─── ValidationProgress Schema ────────────────────────────────────────────────

def test_validation_progress_schema():
    event = ValidationProgress(
        validation_id="test-uuid",
        stage="Market Analysis",
        agent_name="Market Intelligence",
        status="running",
        progress_percentage=42.0,
        message="Analyzing target addressable market...",
    )
    assert event.validation_id == "test-uuid"
    assert event.status == "running"
    assert 0 <= event.progress_percentage <= 100
    # JSON serializable
    json_str = event.model_dump_json()
    parsed = json.loads(json_str)
    assert parsed["agent_name"] == "Market Intelligence"


# ─── ValidationProgressBroadcaster ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_broadcaster_publish_and_subscribe():
    from app.services.validation.orchestrator import ValidationProgressBroadcaster
    vid = "broadcast-test-id"
    queue = ValidationProgressBroadcaster.subscribe(vid)

    event = ValidationProgress(
        validation_id=vid,
        stage="Scoring",
        agent_name="Scoring Agent",
        status="completed",
        progress_percentage=80.0,
        message="Scores finalized",
    )
    await ValidationProgressBroadcaster.publish(vid, event)
    received = await asyncio.wait_for(queue.get(), timeout=2.0)

    assert received.stage == "Scoring"
    assert received.status == "completed"
    ValidationProgressBroadcaster.unsubscribe(vid, queue)
    assert vid not in ValidationProgressBroadcaster._listeners


# ─── PDF Generation ───────────────────────────────────────────────────────────

def test_pdf_generation_creates_file(tmp_path):
    from app.services.pdf_service import PDFReportGenerator
    generator = PDFReportGenerator(output_dir=str(tmp_path))

    report_data = {
        "executive_summary": "Test startup demonstrates strong market potential.",
        "problem_analysis": "Founders lack AI-powered validation tools.",
        "solution_analysis": "Automated multi-agent validation pipeline.",
        "target_customer": "Early-stage founders",
        "market_opportunity": "TAM: $12.5B",
        "competitive_landscape": "Fragmented market.",
        "business_model": "B2B SaaS tiered licensing.",
        "revenue_model": "Monthly subscription.",
        "financial_outlook": "75-82% gross margin.",
        "risk_assessment": "Moderate risk profile.",
        "swot": {
            "strengths": ["Proprietary AI agents"],
            "weaknesses": ["Early brand awareness"],
            "opportunities": ["Enterprise expansion"],
            "threats": ["Incumbent additions"],
        },
        "overall_score": 8.4,
        "confidence_score": 88.5,
        "recommendation": "PROCEED",
        "next_steps": ["Build MVP", "Conduct customer discovery"],
    }

    filepath = generator.generate_pdf(
        validation_id="test-uuid-1234567890",
        report_data=report_data,
    )
    assert os.path.exists(filepath)
    assert filepath.endswith(".pdf")
    assert os.path.getsize(filepath) > 1000  # meaningful PDF


# ─── SSE Stream Endpoint ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sse_stream_endpoint_returns_200():
    """Validate that the SSE stream endpoint is reachable and returns streaming response headers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Use send/receive directly to inspect headers without consuming the stream
        req = client.build_request("GET", "/api/v1/validations/stream/nonexistent-id-sse")
        resp = await client.send(req, stream=True)
        try:
            assert resp.status_code == 200
            # SSE should return text/event-stream content type
            assert "text/event-stream" in resp.headers.get("content-type", "")
        finally:
            await resp.aclose()


# ─── Orchestrator Integration ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_orchestrator_delegates_to_agents():
    """Test that orchestrator properly coordinates agent execution (mocked DB)."""
    from app.services.validation.orchestrator import ValidationOrchestrator
    from app.schemas.validation import ValidationStatus

    # Mock the repository and validation
    mock_validation = MagicMock()
    mock_validation.id = "test-orch-id"
    mock_validation.status = ValidationStatus.QUEUED.value
    mock_validation.inputs = MagicMock(
        idea_description="AI startup validation tool for founders",
        target_customer="Founders",
        target_market="B2B SaaS",
        founder_stage="Idea Phase",
    )
    mock_validation.attachments = []

    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_validation)
    mock_repo.save = AsyncMock(return_value=mock_validation)
    mock_repo.save_event = AsyncMock()
    mock_repo.save_report = AsyncMock()

    mock_db = MagicMock()

    orchestrator = ValidationOrchestrator(mock_db)
    orchestrator.repo = mock_repo

    result = await orchestrator.run_pipeline("test-orch-id")
    assert result is not None

    # Verify report was saved
    assert mock_repo.save_report.called
    # Verify final status was set to COMPLETED
    assert mock_validation.status == ValidationStatus.COMPLETED.value
    assert mock_validation.overall_score is not None
