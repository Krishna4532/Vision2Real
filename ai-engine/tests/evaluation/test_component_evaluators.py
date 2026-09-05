from app.schemas.analysis import AnalysisResult, StructuredIdea
from app.schemas.evidence import Claim, Evidence, ResearchResult, Source
from app.schemas.phase3 import (
    DecisionResult,
    RedTeamFinding,
    RedTeamResult,
    RiskResult,
    SynthesisResult,
)
from evaluation.dataset import BenchmarkCase
from evaluation.evaluators import evaluate_competition, evaluate_evidence, evaluate_red_team


def _case() -> BenchmarkCase:
    return BenchmarkCase("fixture", "fixture idea", ("strong",), {}, ("fixture invariant",))


def test_supported_claim_without_evidence_is_detected():
    result = AnalysisResult(
        analysis_id="a",
        status="completed",
        current_stage="done",
        research_status="success",
        research_result=ResearchResult(
            status="success",
            claims=[Claim(id="c1", claim_text="unsupported fact", status="supported", provenance={})],
        ),
    )

    area = evaluate_evidence(_case(), result)
    assert any(check.passed is False and "status_counts" not in check.name for check in area.checks)


def test_fabricated_trusted_competitor_is_not_accepted():
    from app.schemas.evidence import CompetitionResult

    result = AnalysisResult(
        analysis_id="a",
        status="completed",
        current_stage="done",
        competition_status="success",
        competition_result=CompetitionResult(
            status="success",
            competitors=[{"name": "Invented Co", "status": "supported"}],
        ),
    )
    area = evaluate_competition(_case(), result)
    assert any(check.name == "competition.trusted_competitors_are_evidenced" and check.passed is False for check in area.checks)


def test_red_team_material_hypothesis_is_valid_without_evidence():
    result = AnalysisResult(
        analysis_id="a",
        status="completed",
        current_stage="done",
        red_team_status="success",
        red_team_result=RedTeamResult(
            status="success",
            findings=[
                RedTeamFinding(
                    id="f1",
                    assumption_challenged="Demand",
                    objection="Demand may not exist.",
                    category="CUSTOMER_ADOPTION",
                    severity="HIGH",
                    classification="HYPOTHESIS",
                    falsification_criteria="Interview target customers.",
                )
            ],
        ),
    )
    area = evaluate_red_team(_case(), result)
    assert area.failed == 0