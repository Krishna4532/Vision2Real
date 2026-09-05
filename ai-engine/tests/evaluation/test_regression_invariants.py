import pytest

from app.schemas.analysis import AnalysisResult
from app.schemas.evidence import Claim, Evidence, ResearchResult, Source
from app.schemas.phase3 import (
    BusinessModelResult,
    DecisionResult,
    FeasibilityResult,
    RedTeamResult,
    RiskResult,
    SynthesisResult,
)
from app.services.analysis_service import run_analysis_pipeline
from app.services.decision_rules import decide
from app.services.llm_provider import MockLLMProvider
from evaluation.dataset import BenchmarkCase
from evaluation.evaluators import evaluate_verdict


@pytest.mark.asyncio
async def test_normal_pipeline_keeps_unknown_business_fields_unknown(benchmark_cases):
    case = next(case for case in benchmark_cases if case.id == "strong-ai-tutor-saas")
    result = await run_analysis_pipeline(case.idea, llm_provider=MockLLMProvider())

    assert result.structured_idea is not None
    assert result.structured_idea.geography == "unknown"
    assert result.structured_idea.business_model == "unknown"


def test_many_to_many_claim_evidence_relationships_are_evaluated():
    source = Source(id="s1", url="https://research.test/source", title="Source")
    evidence_one = Evidence(id="e1", sources=[source])
    evidence_two = Evidence(id="e2", sources=[source])
    result = AnalysisResult(
        analysis_id="a",
        status="completed",
        current_stage="done",
        research_status="success",
        research_result=ResearchResult(
            status="success",
            claims=[
                Claim(id="c1", claim_text="claim one", status="hypothesis", provenance={"fixture": True}, evidence_items=[evidence_one, evidence_two]),
                Claim(id="c2", claim_text="claim two", status="hypothesis", provenance={"fixture": True}, evidence_items=[evidence_one]),
            ],
        ),
        synthesis_result=SynthesisResult(
            status="success",
            evidence_confidence={
                "hypothesis": 2,
                "total_claims": 2,
                "total_evidence_items": 3,
                "total_sources": 3,
            },
        ),
    )
    case = BenchmarkCase("many-to-many", "fixture", ("evidence",), {}, ("relationships",))
    from evaluation.evaluators import evaluate_evidence

    area = evaluate_evidence(case, result)
    assert area.failed == 0


def test_deterministic_gate_overrides_unsafe_llm_proposal():
    synthesis = SynthesisResult(
        status="success",
        evidence_confidence={"overall_confidence_score": 0.8, "total_claims": 1},
    )
    decision = decide(
        synthesis=synthesis,
        business_model=BusinessModelResult(
            status="success",
            strengths=["revenue"],
            weaknesses=[],
        ),
        feasibility=FeasibilityResult(status="success", technical_feasibility="HIGH"),
        risk=RiskResult(status="success"),
        red_team=RedTeamResult(status="success"),
        pipeline_status="degraded",
    )
    assert decision.decision != "BUILD"
    assert decision.llm_proposed_decision == "BUILD"
    assert decision.rule_trace


def test_allowed_decision_outcomes_are_closed():
    result = AnalysisResult(
        analysis_id="a",
        status="rejected",
        current_stage="pre_flight",
    )
    case = BenchmarkCase("verdict", "fixture", ("invalid",), {}, ("outcome",))
    area = evaluate_verdict(case, result)
    assert area.score is None