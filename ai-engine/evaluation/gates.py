"""
Phase 7 - Quality gates.

This module answers the question evaluation/scoring.py deliberately does
NOT answer: given a set of per-case, per-check evaluation results, is the
benchmark run PASS or FAIL?

scoring.py computes structural-check pass rates (0.0-1.0). Those numbers on
their own are not a regression gate - a score of 0.87 could hide a single
catastrophic safety failure (e.g. a supported claim with no evidence) mixed
in with dozens of harmless presentational misses. Quality gates fix that by
splitting checks into two categories with different failure semantics:

CRITICAL checks - safety/integrity invariants. ANY failure, or ANY
unavailable critical check, fails the benchmark outright. Unavailable must
never be silently treated as passing here: a critical property we couldn't
even verify is exactly as dangerous as one we verified is broken.

NON-CRITICAL checks - quality/completeness signals (e.g. classification
label recall, presentation completeness). These are judged against a
configurable per-area minimum pass-rate threshold rather than requiring
every single check to pass, because some non-critical gaps are known,
documented, and acceptable today (see NON_CRITICAL_AREA_THRESHOLDS below
for why 0.6, not some other number).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from evaluation.scoring import CaseScore


# ---------------------------------------------------------------------------
# Critical checks: safety/integrity invariants.
#
# Identified by exact check name or dotted-prefix match against the
# "{area}.{check}" naming convention already used throughout
# evaluation/evaluators.py. Each entry below maps directly to one of the
# five critical-gate categories named in the Phase 7 spec:
#
#   - evidence integrity / provenance         -> "evidence."
#   - unknown/missing-information preservation -> "structuring.unknown_preserved."
#   - deterministic verdict safety             -> "verdict."
#   - report/visualization provenance          -> the three report.* entries below
#   - (added) rejected input must not leak downstream -> "preflight.stops_downstream"
#     A prompt-injection/malicious/spam input that still produces a
#     structured idea or evidence would be a security regression, not
#     merely a quality miss, so this is treated as critical even though it
#     lives in the "preflight" area alongside non-critical checks.
# ---------------------------------------------------------------------------
CRITICAL_CHECK_PREFIXES: tuple[str, ...] = (
    "evidence.",
    "structuring.unknown_preserved.",
    "verdict.",
)

CRITICAL_CHECK_EXACT: tuple[str, ...] = (
    "preflight.stops_downstream",
    "report.no_fabricated_market_size",
    "report.visualization_references_resolve",
    "report.degraded_state_explicit",
)


def _is_critical(check_name: str) -> bool:
    return check_name in CRITICAL_CHECK_EXACT or any(
        check_name.startswith(prefix) for prefix in CRITICAL_CHECK_PREFIXES
    )


# ---------------------------------------------------------------------------
# Non-critical thresholds: per-area minimum pass rate.
#
# 0.6 is used as the shared default because it sits below every non-critical
# area's currently observed score against the real (mock-provider) pipeline
# (structuring ~0.74, preflight ~0.96, research/competition/customer 1.0,
# feasibility 0.8, red_team 0.8, report's non-critical remainder ~0.9) - see
# CHANGELOG_PHASE_7.md / this module's test suite for the measured run this
# was calibrated against. The threshold exists to catch a genuine regression
# (a real drop in structural quality) without tripping on the current,
# already-known, non-blocking limitation that MockLLMProvider only produces
# differentiated structured output for two hardcoded idea phrases ("ai
# tutor", "app idea") - every other benchmark idea falls through to a
# generic ["General"] classification, which is why "structuring" sits at
# ~0.74 rather than higher today. That gap is a MockLLMProvider vocabulary
# limitation, not a Phase 1-6 regression; see docs/PHASE_7_EVALUATION.md
# "Limitations".
# ---------------------------------------------------------------------------
DEFAULT_NON_CRITICAL_THRESHOLD = 0.6

NON_CRITICAL_AREA_THRESHOLDS: dict[str, float] = {
    "structuring": DEFAULT_NON_CRITICAL_THRESHOLD,
    "preflight": DEFAULT_NON_CRITICAL_THRESHOLD,
    "research": DEFAULT_NON_CRITICAL_THRESHOLD,
    "competition": DEFAULT_NON_CRITICAL_THRESHOLD,
    "customer": DEFAULT_NON_CRITICAL_THRESHOLD,
    "feasibility": DEFAULT_NON_CRITICAL_THRESHOLD,
    "red_team": DEFAULT_NON_CRITICAL_THRESHOLD,
    "report": DEFAULT_NON_CRITICAL_THRESHOLD,
}


@dataclass(frozen=True)
class CriticalFailure:
    case_id: str
    check_name: str
    detail: str
    reason: str  # "failed" or "unavailable"

    def to_dict(self) -> dict[str, Any]:
        return {"case_id": self.case_id, "check": self.check_name, "detail": self.detail, "reason": self.reason}


@dataclass(frozen=True)
class NonCriticalFailure:
    area: str
    score: float
    threshold: float

    def to_dict(self) -> dict[str, Any]:
        return {"area": self.area, "score": self.score, "threshold": self.threshold}


@dataclass(frozen=True)
class QualityGateResult:
    passed: bool
    critical_failures: tuple[CriticalFailure, ...] = field(default_factory=tuple)
    non_critical_failures: tuple[NonCriticalFailure, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "critical_failures": [f.to_dict() for f in self.critical_failures],
            "non_critical_failures": [f.to_dict() for f in self.non_critical_failures],
        }


def evaluate_quality_gates(
    case_results: list[CaseScore],
    *,
    non_critical_thresholds: dict[str, float] | None = None,
) -> QualityGateResult:
    """Compute PASS/FAIL for a completed benchmark run.

    A critical check that FAILED (passed=False) always counts against the
    gate, in every case, with no exceptions - including on a
    rejected/malicious-input case, where a leaked claim or evidence item
    would be a serious safety failure, not a quality miss.

    A critical check that is UNAVAILABLE (passed=None) counts against the
    gate UNLESS that case's own preflight legitimately stopped the pipeline
    before that check could ever apply (preflight.stops_downstream ==
    True for that case - e.g. a rejected prompt-injection input correctly
    never reaches Synthesis or the Decision Gate, so
    "evidence.synthesis_summary"/"verdict.result_present" being unavailable
    there is architecturally correct, not a verification gap). Any other
    unavailable critical check - one that SHOULD have been measurable for a
    case that passed pre-flight - still fails the gate; only the specific,
    provably-expected absence is excluded.

    A non-critical area whose measured score (excluding critical checks,
    which are judged separately above) falls below its configured threshold
    is a non-critical failure. Areas with no material (non-None) checks in
    a given case are skipped for that case rather than treated as 0.
    """
    thresholds = non_critical_thresholds or NON_CRITICAL_AREA_THRESHOLDS

    critical_failures: list[CriticalFailure] = []
    # area -> (passed, failed) counts, non-critical checks only
    non_critical_tally: dict[str, list[int]] = {area: [0, 0] for area in thresholds}

    for case in case_results:
        preflight_area = case.areas.get("preflight")
        case_correctly_stopped_downstream = bool(preflight_area) and any(
            check.name == "preflight.stops_downstream" and check.passed is True
            for check in preflight_area.checks
        )

        for area_name, area_score in case.areas.items():
            for check in area_score.checks:
                if _is_critical(check.name):
                    if check.passed is False:
                        critical_failures.append(CriticalFailure(case.case_id, check.name, check.detail, "failed"))
                    elif check.passed is None and not case_correctly_stopped_downstream:
                        critical_failures.append(CriticalFailure(case.case_id, check.name, check.detail, "unavailable"))
                    continue
                if area_name not in non_critical_tally or check.passed is None:
                    continue
                tally = non_critical_tally[area_name]
                tally[0 if check.passed else 1] += 1

    non_critical_failures: list[NonCriticalFailure] = []
    for area_name, (passed, failed) in non_critical_tally.items():
        total = passed + failed
        if total == 0:
            continue  # nothing measurable for this area -> not a failure, just unavailable
        score = round(passed / total, 4)
        threshold = thresholds[area_name]
        if score < threshold:
            non_critical_failures.append(NonCriticalFailure(area_name, score, threshold))

    passed = not critical_failures and not non_critical_failures
    return QualityGateResult(
        passed=passed,
        critical_failures=tuple(critical_failures),
        non_critical_failures=tuple(non_critical_failures),
    )