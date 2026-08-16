import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import session_scope
from app.models.evidence import ClaimORM, EvidenceORM, SourceORM
from app.schemas.evidence import Claim, Evidence, Source, ResearchResult
from app.schemas.analysis import AnalysisState, StructuredIdea, ClassificationResult
from app.services.research_provider import BaseResearchProvider, SearchResult, MockResearchProvider
from app.services.research_service import conduct_research, sanitize_untrusted_data
from app.services.llm_provider import MockLLMProvider
from app.agents.research_agent import research_agent
from app.agents.competition_agent import competition_agent
from app.agents.customer_agent import customer_agent
from app.graph.state import GraphState
from app.graph.workflow import run_graph
from app.services.analysis_service import run_analysis_pipeline, save_analysis_findings


# =====================================================================
# 1. EVIDENCE TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_evidence_one_claim_multiple_evidences_one_source_multiple_claims():
    async with session_scope() as session:
        # Create unique analysis id
        analysis_id = str(uuid.uuid4())
        
        # 1. Create a single source
        source = SourceORM(
            id=str(uuid.uuid4()),
            url="https://example.com/multi-support",
            title="Shared Industry Source",
            source_type="web",
            retrieval_status="success",
            additional_metadata={},
            created_at=datetime.now(timezone.utc)
        )
        session.add(source)
        
        # 2. Create two claims
        claim1 = ClaimORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            claim_text="AI Tutoring adoption is surging.",
            claim_type="market_trend",
            status="supported",
            confidence=0.8,
            created_at=datetime.now(timezone.utc)
        )
        claim2 = ClaimORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            claim_text="EdTech tools save instructor time.",
            claim_type="customer_need",
            status="supported",
            confidence=0.7,
            created_at=datetime.now(timezone.utc)
        )
        session.add_all([claim1, claim2])
        
        # 3. Create two evidence items for claim1
        ev1 = EvidenceORM(
            id=str(uuid.uuid4()),
            excerpt="Adoption rose 40% YoY in higher education.",
            evidence_type="supporting",
            confidence=0.8,
            created_at=datetime.now(timezone.utc)
        )
        ev2 = EvidenceORM(
            id=str(uuid.uuid4()),
            excerpt="70% of surveyed schools plan AI tutoring pilots.",
            evidence_type="supporting",
            confidence=0.75,
            created_at=datetime.now(timezone.utc)
        )
        # Create one evidence item for claim2
        ev3 = EvidenceORM(
            id=str(uuid.uuid4()),
            excerpt="Instructors save 5 hours per week on grading using AI helpers.",
            evidence_type="supporting",
            confidence=0.85,
            created_at=datetime.now(timezone.utc)
        )
        session.add_all([ev1, ev2, ev3])
        
        # Link Claim 1 to multiple evidence items
        claim1.evidence_items.append(ev1)
        claim1.evidence_items.append(ev2)
        
        # Link Claim 2 to one evidence item
        claim2.evidence_items.append(ev3)
        
        # Link the single Source to multiple evidence items (across claims)
        ev1.sources.append(source)
        ev3.sources.append(source)
        
        await session.commit()
        
        # Reload and assert relationships
        reloaded_c1 = await session.get(ClaimORM, claim1.id)
        reloaded_c2 = await session.get(ClaimORM, claim2.id)
        
        assert len(reloaded_c1.evidence_items) == 2
        assert len(reloaded_c2.evidence_items) == 1
        
        assert reloaded_c1.evidence_items[0].sources[0].id == source.id
        assert reloaded_c2.evidence_items[0].sources[0].id == source.id
        
        # Verify different status values (Supported, Inference, Hypothesis, Unsupported)
        c_hypothesis = ClaimORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            claim_text="Willingness to pay is high.",
            claim_type="pricing",
            status="hypothesis",
            confidence=0.3,
            created_at=datetime.now(timezone.utc)
        )
        c_inference = ClaimORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            claim_text="Tutoring costs vary by city.",
            claim_type="market_trend",
            status="inference",
            confidence=0.6,
            created_at=datetime.now(timezone.utc)
        )
        c_unsupported = ClaimORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            claim_text="Students never study on weekends.",
            claim_type="other",
            status="unsupported",
            confidence=0.0,
            created_at=datetime.now(timezone.utc)
        )
        session.add_all([c_hypothesis, c_inference, c_unsupported])
        await session.commit()
        
        assert (await session.get(ClaimORM, c_hypothesis.id)).status == "hypothesis"
        assert (await session.get(ClaimORM, c_inference.id)).status == "inference"
        assert (await session.get(ClaimORM, c_unsupported.id)).status == "unsupported"


# =====================================================================
# 2. RESEARCH TESTS
# =====================================================================

class BadResearchProvider(BaseResearchProvider):
    async def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        raise RuntimeError("Provider search crashed")
        
    async def retrieve_content(self, url: str) -> str | None:
        return None


class EmptyResearchProvider(BaseResearchProvider):
    async def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        return []
        
    async def retrieve_content(self, url: str) -> str | None:
        return None


class DuplicateResearchProvider(BaseResearchProvider):
    async def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        return [
            SearchResult(title="Dup Title", url="https://dup.com", snippet="dup snippet"),
            SearchResult(title="Dup Title", url="https://dup.com", snippet="dup snippet")
        ]
        
    async def retrieve_content(self, url: str) -> str | None:
        return "Duplicate webpage content."


@pytest.mark.asyncio
async def test_conduct_research_successful_and_sanitisation():
    # Test successful research using MockResearchProvider
    result = await conduct_research("AI education tutor", "Education")
    assert result.status == "success"
    assert len(result.sources) > 0
    assert len(result.claims) > 0
    
    # Test prompt injection sanitisation on content and queries
    inject_result = await conduct_research("malicious query", "malicious")
    assert inject_result.status == "success"
    
    # Check that search results and retrieved content were sanitized
    # MockResearchProvider returns injection phrase for query "malicious" / url "https://example.com/malicious-injection"
    malicious_claims = [c for c in inject_result.claims if "HACKED" in c.claim_text or "[REDACTED UNSAFE INJECTION" in c.claim_text]
    assert len(malicious_claims) > 0
    for c in malicious_claims:
        assert "Ignore all previous instructions" not in c.claim_text
        assert "[REDACTED UNSAFE INJECTION ATTEMPT]" in c.claim_text


@pytest.mark.asyncio
async def test_conduct_research_no_results():
    provider = EmptyResearchProvider()
    result = await conduct_research("some query", "Education", provider)
    assert result.status == "failed"
    assert len(result.sources) == 0
    assert len(result.claims) == 0


@pytest.mark.asyncio
async def test_conduct_research_duplicates():
    provider = DuplicateResearchProvider()
    result = await conduct_research("some query", "Education", provider)
    assert len(result.sources) == 1  # Deduplicated from 2 to 1
    assert len(result.claims) == 1
    assert result.sources[0].url == "https://dup.com"


@pytest.mark.asyncio
async def test_conduct_research_retrieval_failure():
    # MockResearchProvider throws ConnectionError if URL contains "retrieval-fail"
    provider = MockResearchProvider()
    # We trigger a mock search result url containing retrieval-fail
    class CustomFailProvider(MockResearchProvider):
        async def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
            return [SearchResult(title="Fail Title", url="https://example.com/retrieval-fail", snippet="fail")]
            
    result = await conduct_research("query", "industry", CustomFailProvider())
    assert len(result.sources) == 1
    assert result.sources[0].retrieval_status == "failed"
    assert len(result.claims) == 0  # No claim extracted since retrieval failed
    assert len(result.errors) > 0


@pytest.mark.asyncio
async def test_conduct_research_malformed_provider():
    provider = BadResearchProvider()
    result = await conduct_research("query", "industry", provider)
    assert result.status == "failed"
    assert len(result.errors) > 0


# =====================================================================
# 3. COMPETITION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_competition_agent_success():
    state = GraphState(
        raw_idea="I want to build an AI tutor for college students.",
        structured_idea=StructuredIdea(
            problem="Students need tutoring.",
            solution="AI tutor.",
            target_customer="College students",
            industry_category="Education"
        )
    )
    result_dict = await competition_agent(state)
    assert result_dict["competition_status"] == "success"
    competition_result = result_dict["competition_result"]
    assert len(competition_result.competitors) == 3
    # Check that pricing claims exist
    pricing_claims = [c for c in competition_result.claims if c.claim_type == "pricing"]
    assert len(pricing_claims) >= 3
    # Fix (Phase 2 audit): this agent uses a static heuristic template, not a
    # real search/citation provider, so it can never honestly claim
    # "supported" (fact-level) status for a named real company's pricing.
    # Previously this test asserted status == "supported" sourced from a
    # fabricated example.com URL, i.e. it locked in the exact fabrication
    # the audit was tasked to eliminate. Every claim from this template must
    # now be capped at "hypothesis", with the mock nature disclosed in
    # provenance and source credibility_notes.
    assert all(c.status == "hypothesis" for c in pricing_claims)
    khan_claims = [c for c in pricing_claims if "Khan Academy" in c.claim_text or "Khanmigo" in c.claim_text]
    assert len(khan_claims) == 1
    assert khan_claims[0].status == "hypothesis"
    assert len(khan_claims[0].evidence_items) == 1
    assert khan_claims[0].evidence_items[0].sources[0].url == "https://example.com/khanmigo-pricing"
    assert khan_claims[0].provenance.get("mock_data") is True
    assert "mock" in khan_claims[0].evidence_items[0].sources[0].credibility_notes.lower()
    # Traditional human tutoring is also hypothesis (general market inference,
    # no specific source at all)
    trad_claims = [c for c in pricing_claims if c.status == "hypothesis" and "Traditional human tutoring" in c.claim_text]
    assert len(trad_claims) == 1


@pytest.mark.asyncio
async def test_competition_agent_no_competitors():
    # Test on a generic non-EdTech idea
    state = GraphState(
        raw_idea="I want to make a new SaaS tool for construction.",
        structured_idea=StructuredIdea(
            problem="Construction is slow.",
            solution="SaaS tool.",
            target_customer="Construction managers",
            industry_category="Construction"
        )
    )
    result_dict = await competition_agent(state)
    assert result_dict["competition_status"] == "partial"
    competition_result = result_dict["competition_result"]
    assert len(competition_result.competitors) == 0
    assert len(competition_result.claims) == 1
    assert competition_result.claims[0].status == "hypothesis"


# =====================================================================
# 4. CUSTOMER TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_customer_agent_success():
    state = GraphState(
        raw_idea="I want to build an AI tutor for college students.",
        structured_idea=StructuredIdea(
            problem="Tutoring is expensive.",
            solution="AI tutor.",
            target_customer="College students",
            industry_category="Education"
        )
    )
    result_dict = await customer_agent(state)
    assert result_dict["customer_status"] == "success"
    customer_result = result_dict["customer_result"]
    analysis = customer_result.customer_analysis
    assert analysis["primary_customer"] == "College students"
    assert "willingness_to_pay_hypothesis" in analysis

    # Verify claims
    claims = customer_result.claims
    wtp_claims = [c for c in claims if c.claim_type == "pricing" and c.status == "hypothesis"]
    assert len(wtp_claims) == 1  # Willingness to pay is explicitly hypothesis

    # Fix (Phase 2 audit): the demand-signal claim previously asserted here was
    # a fabricated "40% YoY adoption" statistic attributed to a fake
    # example.com source and labeled "supported" (fact-level) status - i.e.
    # mock data presented as verified real-world evidence. This agent has no
    # real research provider behind it, so it cannot honestly produce
    # "supported" claims; the demand-signal claim is now "hypothesis" with
    # the mock nature disclosed in provenance and source credibility_notes.
    supported_claims = [c for c in claims if c.status == "supported"]
    assert len(supported_claims) == 0
    demand_claims = [c for c in claims if c.claim_type == "demand_signal"]
    assert len(demand_claims) == 1
    assert demand_claims[0].status == "hypothesis"
    assert demand_claims[0].provenance.get("mock_data") is True
    assert len(demand_claims[0].evidence_items) == 1
    assert "mock" in demand_claims[0].evidence_items[0].sources[0].credibility_notes.lower()


@pytest.mark.asyncio
async def test_customer_agent_missing_customer():
    state = GraphState(
        raw_idea="I want to build a general system.",
        structured_idea=StructuredIdea(
            problem="General issue.",
            solution="General solution.",
            target_customer=None,
            industry_category="Technology"
        )
    )
    result_dict = await customer_agent(state)
    assert result_dict["customer_status"] == "partial"
    assert result_dict["customer_result"].customer_analysis["primary_customer"] == "unknown"


# =====================================================================
# 5. PIPELINE DEGRADED AND SUCCESS STATES
# =====================================================================

class CrashAgentException(Exception):
    pass


@pytest.mark.asyncio
async def test_pipeline_all_agents_succeed():
    # An E2E pipeline run with a valid AI tutor idea
    result = await run_analysis_pipeline(
        "I want to build an AI tutor for college students.",
        llm_provider=MockLLMProvider()
    )
    assert result.status == "completed"
    assert result.research_status == "success"
    assert result.competition_status == "success"
    assert result.customer_status == "success"
    assert len(result.errors) == 0
    assert result.research_result is not None
    assert len(result.research_result.claims) > 0
    assert result.competition_result is not None
    assert len(result.competition_result.competitors) == 3
    assert result.customer_result is not None
    # Fix (Phase 2 audit): Competition/Customer use static heuristic
    # templates with no real research provider behind them, so no claim from
    # either agent should ever be "supported" (fact-level) - that would be
    # presenting mock data as real-world evidence. Research agent claims are
    # "inference" (mock-provider-derived), never "supported" either.
    for claim in result.competition_result.claims:
        assert claim.status != "supported", f"Unverified claim marked as supported: {claim.claim_text}"
    for claim in result.customer_result.claims:
        assert claim.status != "supported", f"Unverified claim marked as supported: {claim.claim_text}"

    # LangGraph state-contract regression check: research_step, competition_step,
    # and customer_step run in parallel (fan out from classification_step) and
    # each returns a *partial* dict update scoped to its own fields
    # (research_result/research_status/research_errors, etc.) rather than the
    # full GraphState. Verify that fan-out/convergence didn't clobber fields
    # owned by earlier, non-parallel stages (structured_idea, classification,
    # preflight) - i.e. each parallel branch only wrote its own namespaced keys.
    assert result.structured_idea is not None
    assert result.structured_idea.target_customer == "College students"
    assert result.classification is not None
    assert "AI" in result.classification.labels
    assert result.preflight is not None
    assert result.preflight.is_valid is True


@pytest.mark.asyncio
async def test_pipeline_research_agent_fails(monkeypatch):
    # Simulate Research Agent throwing an exception
    async def mock_research_agent_fail(state: GraphState) -> dict:
        return {
            "research_status": "failed",
            "research_errors": ["Research failed due to network timeout."],
        }

    monkeypatch.setattr("app.graph.workflow.research_agent", mock_research_agent_fail)

    result = await run_analysis_pipeline(
        "I want to build an AI tutor for college students.",
        llm_provider=MockLLMProvider()
    )
    # The pipeline should execute but complete in "degraded" state
    assert result.status == "degraded"
    assert result.research_status == "failed"
    assert result.competition_status == "success"  # Others succeed
    assert result.customer_status == "success"
    assert "Research failed due to network timeout." in result.errors
    # Do not fabricate missing results
    assert result.research_result is None


@pytest.mark.asyncio
async def test_pipeline_competition_agent_fails(monkeypatch):
    # Simulate Competition Agent failure
    async def mock_competition_agent_fail(state: GraphState) -> dict:
        return {
            "competition_status": "failed",
            "competition_errors": ["Competition failed to retrieve data."],
        }

    monkeypatch.setattr("app.graph.workflow.competition_agent", mock_competition_agent_fail)

    result = await run_analysis_pipeline(
        "I want to build an AI tutor for college students.",
        llm_provider=MockLLMProvider()
    )
    assert result.status == "degraded"
    assert result.research_status == "success"
    assert result.competition_status == "failed"
    assert result.customer_status == "success"
    assert "Competition failed to retrieve data." in result.errors
    assert result.competition_result is None


@pytest.mark.asyncio
async def test_pipeline_customer_agent_fails(monkeypatch):
    # Simulate Customer Agent failure
    async def mock_customer_agent_fail(state: GraphState) -> dict:
        return {
            "customer_status": "failed",
            "customer_errors": ["Customer agent database read failed."],
        }

    monkeypatch.setattr("app.graph.workflow.customer_agent", mock_customer_agent_fail)

    result = await run_analysis_pipeline(
        "I want to build an AI tutor.",
        llm_provider=MockLLMProvider()
    )
    assert result.status == "degraded"
    assert result.research_status == "success"
    assert result.competition_status == "success"
    assert result.customer_status == "failed"
    assert "Customer agent database read failed." in result.errors
    assert result.customer_result is None


@pytest.mark.asyncio
async def test_pipeline_multiple_agents_fail(monkeypatch):
    # Simulate both research and competition agents failing
    async def mock_research_fail(state: GraphState) -> dict:
        return {
            "research_status": "failed",
            "research_errors": ["Research failed."],
        }

    async def mock_competition_fail(state: GraphState) -> dict:
        return {
            "competition_status": "failed",
            "competition_errors": ["Competition failed."],
        }

    monkeypatch.setattr("app.graph.workflow.research_agent", mock_research_fail)
    monkeypatch.setattr("app.graph.workflow.competition_agent", mock_competition_fail)

    result = await run_analysis_pipeline(
        "I want to build an AI tutor.",
        llm_provider=MockLLMProvider()
    )
    assert result.status == "degraded"
    assert result.research_status == "failed"
    assert result.competition_status == "failed"
    assert result.customer_status == "success"  # Customer still runs successfully
    assert "Research failed." in result.errors
    assert "Competition failed." in result.errors
    assert result.research_result is None
    assert result.competition_result is None
    assert result.customer_result is not None

