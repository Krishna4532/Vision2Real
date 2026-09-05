"""Deterministic decision-gate rules.

Per the Phase 3 spec: "The decision must NOT be determined solely by an LLM
prompt... Implement deterministic decision rules in code... Do not invent
arbitrary numerical thresholds without documenting them. Keep the rules
configurable."

All thresholds live at module level as documented constants so they can be
tuned/overridden (e.g. via monkeypatch in tests, or promoted to Settings
later) without touching the rule logic itself.

`decide()` is a pure function: given the Phase 3 analysis artifacts it
returns a DecisionResult with a full rule trace. It never calls an LLM. An
LLM MAY be used upstream to *propose* a decision (see
`propose_llm_decision_hint`, itself a deterministic heuristic here since this
codebase's LLM layer is mock-only) but that proposal is advisory only and is
recorded in `llm_proposed_decision` - it can never change `decision`.
"""
from __future__ import annotations

from app.schemas.phase3 import (
    BusinessModelResult,
    Decision,
    DecisionResult,
    DecisionRuleTrace,
    FeasibilityResult,
    RedTeamResult,
    RiskResult,
    SynthesisResult,
)

# ---------------------------------------------------------------------------
# Configurable thresholds (documented rationale below each)
# ---------------------------------------------------------------------------

# Minimum weighted evidence-confidence score (see
# EvidenceConfidenceSummary.overall_confidence_score, computed in
# synthesis_agent.py as a 0..1 weighted average across claim statuses) to be
# eligible for BUILD. Chosen conservatively high (0.65) because a false
# positive BUILD recommendation is worse than an extra validation round.
BUILD_CONFIDENCE_THRESHOLD = 0.65

# Below this score, combined with a CRITICAL risk, the gate will REJECT
# rather than merely ask to validate more - i.e. the idea already looks
# actively unsupported, not just under-evidenced.
REJECT_CONFIDENCE_THRESHOLD = 0.15

# If BusinessModelResult.weaknesses outnumber strengths by at least this
# margin AND technical feasibility is LOW, the gate considers PIVOT rather
# than VALIDATE_MORE - i.e. the current shape of the idea, not just the
# evidence for it, looks structurally weak.
PIVOT_WEAKNESS_MARGIN = 2


def _rule(rule_id: str, description: str, triggered: bool, detail: str | None = None) -> DecisionRuleTrace:
    return DecisionRuleTrace(rule_id=rule_id, description=description, triggered=triggered, detail=detail)


def propose_llm_decision_hint(
    synthesis: SynthesisResult,
    feasibility: FeasibilityResult,
    risk: RiskResult,
    red_team: RedTeamResult | None = None,
) -> Decision:
    """A lightweight, deterministic stand-in for an LLM's *proposed* (i.e.
    advisory, non-binding) decision. This codebase's LLM provider is
    mock-only (see llm_provider.py); this function occupies the same
    architectural slot a real LLM call would, so that swapping in a real
    provider later only requires changing this function, not decide()'s
    contract or the fact that its output never controls the final decision.
    """
    score = synthesis.evidence_confidence.overall_confidence_score
    red_team_critical = bool(red_team and any(
        f.severity == "CRITICAL" or f.is_potentially_fatal for f in red_team.findings
    ))
    if red_team_critical or any(r.severity == "CRITICAL" for r in risk.risks):
        return "PIVOT" if score >= 0.4 else "REJECT"
    if score >= BUILD_CONFIDENCE_THRESHOLD:
        return "BUILD"
    if score < REJECT_CONFIDENCE_THRESHOLD:
        return "REJECT"
    return "VALIDATE_MORE"


def decide(
    synthesis: SynthesisResult,
    business_model: BusinessModelResult,
    feasibility: FeasibilityResult,
    risk: RiskResult,
    red_team: RedTeamResult | None,
    pipeline_status: str,
) -> DecisionResult:
    trace: list[DecisionRuleTrace] = []
    rationale: list[str] = []

    critical_risks = [r for r in risk.risks if r.severity == "CRITICAL"]
    high_unresolved = [
        r for r in risk.risks if r.severity == "HIGH" and r.classification in ("FACT", "INFERENCE")
    ]
    score = synthesis.evidence_confidence.overall_confidence_score

    llm_hint = propose_llm_decision_hint(synthesis, feasibility, risk, red_team)

    can_build = True
    conservative_override = False

    # Rule 0a: a CRITICAL-severity or potentially-fatal Red Team finding
    # blocks BUILD outright. This is the mechanism by which Red Team
    # participates in the decision gate rather than being decorative output
    # (per spec section 5) - it is evaluated first/independently of the risk
    # rules below since a Red Team finding is a distinct artifact from a Risk.
    red_team_findings = red_team.findings if red_team is not None else []
    critical_or_fatal_red_team = [
        f for f in red_team_findings if f.severity == "CRITICAL" or f.is_potentially_fatal
    ]
    r8_triggered = bool(critical_or_fatal_red_team)
    trace.append(_rule(
        "R8_RED_TEAM_CRITICAL_OR_FATAL_BLOCKS_BUILD",
        "A CRITICAL-severity or potentially-fatal Red Team finding makes BUILD ineligible.",
        r8_triggered,
        f"{len(critical_or_fatal_red_team)} critical/fatal finding(s): "
        f"{[f.objection for f in critical_or_fatal_red_team]}" if r8_triggered else None,
    ))
    if r8_triggered:
        can_build = False
        rationale.append("The Red Team raised a critical or potentially-fatal objection.")

    # Rule 0b: missing/failed Red Team output is itself decision-critical
    # missing evidence - the gate cannot certify BUILD without an adversarial
    # pass having actually run, so it forces a conservative decision.
    r9_triggered = red_team is None or red_team.status == "failed"
    trace.append(_rule(
        "R9_MISSING_RED_TEAM_CONSERVATIVE",
        "Red Team analysis must have run (not missing/failed) to be eligible for BUILD.",
        r9_triggered,
        f"red_team={'missing' if red_team is None else red_team.status}" if r9_triggered else None,
    ))
    if r9_triggered:
        can_build = False
        conservative_override = True
        rationale.append("Red Team analysis is missing or failed; being conservative.")

    # Rule 1: any CRITICAL risk blocks BUILD outright.
    r1_triggered = bool(critical_risks)
    trace.append(_rule(
        "R1_CRITICAL_RISK_BLOCKS_BUILD",
        "A CRITICAL-severity risk makes BUILD ineligible.",
        r1_triggered,
        f"{len(critical_risks)} critical risk(s): {[r.risk_statement for r in critical_risks]}" if r1_triggered else None,
    ))
    if r1_triggered:
        can_build = False
        rationale.append("At least one critical, unresolved risk was identified.")

    # Rule 2: decision-critical evidence missing blocks BUILD.
    r2_triggered = synthesis.status != "success" or synthesis.evidence_confidence.total_claims == 0
    trace.append(_rule(
        "R2_MISSING_DECISION_CRITICAL_EVIDENCE",
        "Synthesis must have succeeded with at least one grounded claim to be eligible for BUILD.",
        r2_triggered,
        f"synthesis.status={synthesis.status}, total_claims={synthesis.evidence_confidence.total_claims}",
    ))
    if r2_triggered:
        can_build = False
        rationale.append("Decision-critical evidence is missing or synthesis did not fully succeed.")

    # Rule 3: degraded upstream pipeline forces a conservative decision.
    r3_triggered = pipeline_status == "degraded"
    trace.append(_rule(
        "R3_DEGRADED_PIPELINE_CONSERVATIVE",
        "A degraded upstream pipeline (one or more failed agents) forces a conservative decision.",
        r3_triggered,
        f"pipeline_status={pipeline_status}" if r3_triggered else None,
    ))
    if r3_triggered:
        can_build = False
        conservative_override = True
        rationale.append("One or more upstream analysis components failed or degraded; being conservative.")

    # Rule 4: unresolved HIGH risks also block BUILD (but not as severely as CRITICAL).
    r4_triggered = bool(high_unresolved)
    trace.append(_rule(
        "R4_HIGH_RISK_BLOCKS_BUILD",
        "An unresolved HIGH-severity, evidence-backed risk makes BUILD ineligible.",
        r4_triggered,
        f"{len(high_unresolved)} high risk(s)" if r4_triggered else None,
    ))
    if r4_triggered:
        can_build = False
        rationale.append("At least one high-severity, evidence-backed risk remains unresolved.")

    # Rule 5: strong evidence + feasible product + no blockers -> BUILD.
    r5_triggered = (
        can_build
        and score >= BUILD_CONFIDENCE_THRESHOLD
        and feasibility.technical_feasibility in ("MEDIUM", "HIGH")
    )
    trace.append(_rule(
        "R5_STRONG_EVIDENCE_BUILD",
        f"Evidence-confidence score >= {BUILD_CONFIDENCE_THRESHOLD} and feasibility is MEDIUM/HIGH with no blockers.",
        r5_triggered,
        f"score={score:.2f}, feasibility={feasibility.technical_feasibility}",
    ))

    # Rule 6: weak business model + low feasibility -> consider PIVOT.
    weakness_margin = len(business_model.weaknesses) - len(business_model.strengths)
    r6_triggered = (
        not r5_triggered
        and feasibility.technical_feasibility == "LOW"
        and weakness_margin >= PIVOT_WEAKNESS_MARGIN
    )
    trace.append(_rule(
        "R6_WEAK_MODEL_LOW_FEASIBILITY_PIVOT",
        f"Business-model weaknesses outnumber strengths by >= {PIVOT_WEAKNESS_MARGIN} AND feasibility is LOW.",
        r6_triggered,
        f"weakness_margin={weakness_margin}, feasibility={feasibility.technical_feasibility}",
    ))

    # Rule 7: very low score + critical/high risk -> REJECT.
    r7_triggered = score < REJECT_CONFIDENCE_THRESHOLD and (bool(critical_risks) or bool(high_unresolved))
    trace.append(_rule(
        "R7_VERY_LOW_EVIDENCE_WITH_RISK_REJECT",
        f"Evidence-confidence score < {REJECT_CONFIDENCE_THRESHOLD} combined with a critical/high risk.",
        r7_triggered,
        f"score={score:.2f}",
    ))

    if r5_triggered:
        decision: Decision = "BUILD"
        rationale.append("Evidence is strong, the product is feasible, and no blocking risks remain.")
    elif r7_triggered:
        decision = "REJECT"
        rationale.append("Evidence confidence is very low alongside a critical/high risk.")
    elif r6_triggered:
        decision = "PIVOT"
        rationale.append("The current business model shape looks structurally weak given low feasibility.")
    else:
        decision = "VALIDATE_MORE"
        rationale.append("Evidence is not yet strong enough, or blockers remain, to justify BUILD.")

    return DecisionResult(
        decision=decision,
        llm_proposed_decision=llm_hint,
        rationale=rationale,
        rule_trace=trace,
        confidence=score,
        is_conservative_override=conservative_override,
    )
