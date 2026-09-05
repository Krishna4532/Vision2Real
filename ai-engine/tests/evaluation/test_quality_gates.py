"""
Tests for evaluation/gates.py - the piece that turns benchmark scores into
an actual PASS/FAIL regression signal with a real exit code.

These tests build synthetic CaseScore/AreaScore/Check fixtures directly
(rather than running the full pipeline) so each scenario is fast and
isolates exactly one gate-logic property at a time. The full, real pipeline
is exercised separately by test_evaluation_framework.py and by actually
running `python -m evaluation.runner`.
"""
from __future__ import annotations

import pytest

from app.schemas.evidence import Claim
from app.services.intelligence_framework import enforce_quality_gate
from evaluation.gates import (
    NON_CRITICAL_AREA_THRESHOLDS,
    evaluate_quality_gates,
)
from evaluation.scoring import AreaScore, CaseScore, Check


def _case(case_id: str, areas: dict[str, AreaScore]) -> CaseScore:
    unavailable = tuple(name for name, area in areas.items() if area.score is None)
    scored = [area.score for area in areas.values() if area.score is not None]
    overall = round(sum(scored) / len(scored), 4) if scored else None
    return CaseScore(case_id=case_id, categories=("test",), areas=areas, overall_score=overall, unavailable_metrics=unavailable)


def _area(area: str, checks: list[Check]) -> AreaScore:
    material = [c for c in checks if c.passed is not None]
    passed = sum(c.passed is True for c in material)
    failed = sum(c.passed is False for c in material)
    unavailable = sum(c.passed is None for c in checks)
    score = round(passed / (passed + failed), 4) if material else None
    return AreaScore(area, score, passed, failed, unavailable, tuple(checks))


def _stopped_preflight_area() -> AreaScore:
    return _area("preflight", [Check("preflight.stops_downstream", True, "stopped as expected")])


def _running_preflight_area() -> AreaScore:
    return _area("preflight", [Check("preflight.expected_status", True, "valid")])


# ---------------------------------------------------------------------------
# Passing metrics -> PASS
# ---------------------------------------------------------------------------

def test_all_passing_metrics_yield_pass():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "evidence": _area("evidence", [Check("evidence.supported_claims_have_evidence", True, "ok")]),
        "verdict": _area("verdict", [Check("verdict.supported_outcome", True, "ok")]),
        "structuring": _area("structuring", [Check("structuring.classification_labels", True, "ok")]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is True
    assert result.critical_failures == ()
    assert result.non_critical_failures == ()


# ---------------------------------------------------------------------------
# Critical metric below threshold -> FAIL
# ---------------------------------------------------------------------------

def test_critical_check_failure_fails_the_gate():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "evidence": _area("evidence", [
            Check("evidence.supported_claims_have_evidence", False, "a supported claim has no evidence"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert len(result.critical_failures) == 1
    assert result.critical_failures[0].check_name == "evidence.supported_claims_have_evidence"
    assert result.critical_failures[0].reason == "failed"


def test_verdict_safety_failure_is_critical():
    """The canonical dangerous regression: a critical unresolved risk
    coexisting with a BUILD decision. This must always fail the gate."""
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "verdict": _area("verdict", [
            Check("verdict.critical_risk_blocks_build", False, "critical risk coexists with BUILD"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert any(f.check_name == "verdict.critical_risk_blocks_build" for f in result.critical_failures)


def test_unknown_preservation_failure_is_critical():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "structuring": _area("structuring", [
            Check("structuring.unknown_preserved.geography", False, "geography was fabricated instead of left unknown"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert any(f.check_name == "structuring.unknown_preserved.geography" for f in result.critical_failures)


def test_report_provenance_failure_is_critical():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "report": _area("report", [
            Check("report.no_fabricated_market_size", False, "a market-size chart appeared with no evidence"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert any(f.check_name == "report.no_fabricated_market_size" for f in result.critical_failures)


# ---------------------------------------------------------------------------
# Non-critical metric below threshold -> configured policy (fails the gate,
# but distinctly from critical failures)
# ---------------------------------------------------------------------------

def test_non_critical_area_below_threshold_fails_the_gate_but_not_as_critical():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "structuring": _area("structuring", [
            Check("structuring.classification_labels", False, "wrong label") for _ in range(8)
        ] + [
            Check("structuring.classification_labels", True, "ok") for _ in range(2)
        ]),  # 20% pass rate, below the default 0.6 threshold
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert result.critical_failures == ()
    assert len(result.non_critical_failures) == 1
    assert result.non_critical_failures[0].area == "structuring"
    assert result.non_critical_failures[0].score == 0.2


def test_non_critical_area_above_threshold_does_not_fail():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "structuring": _area("structuring", [
            Check("structuring.classification_labels", True, "ok") for _ in range(8)
        ] + [
            Check("structuring.classification_labels", False, "miss") for _ in range(2)
        ]),  # 80% pass rate, above the default 0.6 threshold
    })
    result = evaluate_quality_gates([case])
    assert result.passed is True
    assert result.non_critical_failures == ()


def test_non_critical_thresholds_are_configurable():
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "structuring": _area("structuring", [
            Check("structuring.classification_labels", True, "ok") for _ in range(7)
        ] + [
            Check("structuring.classification_labels", False, "miss") for _ in range(3)
        ]),  # 70% pass rate
    })
    # Default threshold (0.6) should pass...
    assert evaluate_quality_gates([case]).passed is True
    # ...but a stricter configured threshold should not.
    strict = dict(NON_CRITICAL_AREA_THRESHOLDS)
    strict["structuring"] = 0.9
    result = evaluate_quality_gates([case], non_critical_thresholds=strict)
    assert result.passed is False
    assert result.non_critical_failures[0].threshold == 0.9


# ---------------------------------------------------------------------------
# Unavailable critical metric cannot silently become PASS
# ---------------------------------------------------------------------------

def test_unavailable_critical_metric_fails_when_not_architecturally_expected():
    """A critical check that SHOULD have run (pre-flight passed, pipeline
    was expected to reach this stage) but came back unavailable must fail
    the gate - it is not equivalent to passing."""
    case = _case("case-1", {
        "preflight": _running_preflight_area(),
        "verdict": _area("verdict", [
            Check("verdict.supported_outcome", None, "decision engine did not run for an unknown reason"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert result.critical_failures[0].reason == "unavailable"


def test_unavailable_critical_metric_is_expected_and_excused_after_legitimate_rejection():
    """The one legitimate exception: pre-flight correctly rejected the
    input, so evidence/verdict never ran by design. That must NOT count
    against the gate - but only because preflight.stops_downstream is
    itself verified True for this case, not merely assumed."""
    case = _case("rejected-case", {
        "preflight": _stopped_preflight_area(),
        "evidence": _area("evidence", [
            Check("evidence.synthesis_summary", None, "Synthesis did not run; aggregate evidence accounting is unavailable."),
        ]),
        "verdict": _area("verdict", [
            Check("verdict.result_present", None, "No decision is expected when pre-flight rejects the input."),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is True
    assert result.critical_failures == ()


def test_unavailable_critical_metric_still_fails_if_preflight_did_not_actually_stop_downstream():
    """Guards against the excuse being applied too broadly: if the case's
    own preflight.stops_downstream check did NOT pass (or isn't present),
    an unavailable critical metric is a real gap, not an expected one -
    even if the case happens to also be a "rejected"-flavoured case."""
    case = _case("case-1", {
        "preflight": _area("preflight", [Check("preflight.stops_downstream", False, "downstream data leaked")]),
        "evidence": _area("evidence", [
            Check("evidence.synthesis_summary", None, "unexpectedly unavailable"),
        ]),
    })
    result = evaluate_quality_gates([case])
    assert result.passed is False
    assert any(f.reason == "unavailable" for f in result.critical_failures)


# ---------------------------------------------------------------------------
# Multiple cases aggregate correctly
# ---------------------------------------------------------------------------

def test_gate_aggregates_across_multiple_cases():
    good_case = _case("good", {
        "preflight": _running_preflight_area(),
        "evidence": _area("evidence", [Check("evidence.supported_claims_have_evidence", True, "ok")]),
    })
    bad_case = _case("bad", {
        "preflight": _running_preflight_area(),
        "evidence": _area("evidence", [Check("evidence.supported_claims_have_evidence", False, "broken")]),
    })
    result = evaluate_quality_gates([good_case, bad_case])
    assert result.passed is False
    assert len(result.critical_failures) == 1
    assert result.critical_failures[0].case_id == "bad"


def test_quality_gate_downgrades_unsupported_claims_to_insufficient_evidence():
    claim = Claim(
        id="claim-unsupported",
        claim_text="The market is definitely huge.",
        claim_type="market_size",
        status="supported",
        confidence=0.95,
        evidence_items=[],
        unknowns=[],
        missing_evidence=[],
        contradictions=[],
        decision_impact=[],
    )

    normalized = enforce_quality_gate([claim])
    assert len(normalized) == 1
    assert normalized[0].evidence_basis == "INSUFFICIENT_EVIDENCE"
    assert normalized[0].status == "unsupported"
    assert normalized[0].confidence == 0.0
    assert normalized[0].missing_evidence
    assert normalized[0].decision_impact
