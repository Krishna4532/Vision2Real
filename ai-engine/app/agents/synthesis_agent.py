"""Synthesis Agent (Phase 3): combines structured idea, classification, and
Research/Competition/Customer findings into an evidence-grounded synthesis.

Deliberately does NOT call the LLM provider: every statement it produces is
built by template from data already present in claims/evidence/sources, so
"never present unsupported assumptions as verified facts" is enforced simply
by never inventing text not traceable to those inputs. This mirrors the
existing competition_agent.py / customer_agent.py style (deterministic
templates) rather than research_agent.py's external-provider style, since
there is no external synthesis provider to call.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim
from app.schemas.phase3 import EvidenceBasis, EvidenceConfidenceSummary, KeyInsight, SynthesisResult

# Weights used for the deterministic overall_confidence_score. Documented
# here since they double as the "configurable numerical thresholds" the spec
# asks to avoid inventing silently.
_STATUS_WEIGHTS: dict[str, float] = {
    "supported": 1.0,
    "inference": 0.6,
    "hypothesis": 0.3,
    "unsupported": 0.0,
    "unknown": 0.0,
}


def _collect_claims(state: GraphState) -> tuple[list[Claim], list[str], list[str]]:
    claims: list[Claim] = []
    inputs_used: list[str] = []
    inputs_missing: list[str] = []

    for name, result, status in (
        ("research", state.research_result, state.research_status),
        ("competition", state.competition_result, state.competition_status),
        ("customer", state.customer_result, state.customer_status),
    ):
        if result is not None and status in {"success", "partial"}:
            claims.extend(result.claims)
            inputs_used.append(name)
        else:
            inputs_missing.append(name)

    return claims, inputs_used, inputs_missing


def _evidence_confidence(claims: list[Claim]) -> EvidenceConfidenceSummary:
    summary = EvidenceConfidenceSummary()
    total_evidence = 0
    total_sources = 0
    seen_source_ids: set[str] = set()
    weighted_sum = 0.0

    for claim in claims:
        status = claim.status if claim.status in _STATUS_WEIGHTS else "unknown"
        setattr(summary, status, getattr(summary, status) + 1)
        weighted_sum += _STATUS_WEIGHTS[status]
        for evidence in claim.evidence_items:
            total_evidence += 1
            for source in evidence.sources:
                sid = source.id or source.url or ""
                if sid and sid not in seen_source_ids:
                    seen_source_ids.add(sid)
                    total_sources += 1

    summary.total_claims = len(claims)
    summary.total_evidence_items = total_evidence
    summary.total_sources = total_sources
    summary.overall_confidence_score = round(weighted_sum / len(claims), 4) if claims else 0.0
    return summary


def _strength_basis(score: float, total_claims: int) -> EvidenceBasis:
    if total_claims == 0:
        return "UNKNOWN"
    if score >= 0.7:
        return "VERIFIED"
    if score >= 0.4:
        return "INFERRED"
    return "ASSUMED"


def _basis_for_claim_status(status: str) -> EvidenceBasis:
    return {
        "supported": "VERIFIED",
        "inference": "INFERRED",
        "hypothesis": "ASSUMED",
    }.get(status, "UNKNOWN")


def _build_key_insights(claims: list[Claim], unknowns: list[str]) -> list[KeyInsight]:
    insights: list[KeyInsight] = []

    scored = [c for c in claims if c.confidence is not None]
    if scored:
        strongest = max(scored, key=lambda c: c.confidence)
        insights.append(KeyInsight(
            category="strongest_evidence",
            statement=strongest.claim_text,
            evidence_ids=[e.id for e in strongest.evidence_items if e.id],
            claim_ids=[strongest.id] if strongest.id else [],
            basis=_basis_for_claim_status(strongest.status),
        ))
        weakest = min(scored, key=lambda c: c.confidence)
        if weakest.id != strongest.id:
            insights.append(KeyInsight(
                category="weakest_evidence",
                statement=weakest.claim_text,
                evidence_ids=[e.id for e in weakest.evidence_items if e.id],
                claim_ids=[weakest.id] if weakest.id else [],
                basis=_basis_for_claim_status(weakest.status),
            ))

    for unknown in unknowns[:5]:
        insights.append(KeyInsight(
            category="important_unknown",
            statement=f"Unresolved unknown: {unknown}",
            basis="UNKNOWN",
        ))

    type_to_category = {
        "market_trend": "market_signal",
        "market_size": "market_signal",
        "technology_trend": "market_signal",
        "demand_signal": "customer_signal",
        "customer_need": "customer_signal",
        "competitive_advantage": "competitive_signal",
    }
    for claim in claims:
        category = type_to_category.get(claim.claim_type)
        if not category:
            continue
        insights.append(KeyInsight(
            category=category,
            statement=claim.claim_text,
            evidence_ids=[e.id for e in claim.evidence_items if e.id],
            claim_ids=[claim.id] if claim.id else [],
            basis=_basis_for_claim_status(claim.status),
        ))

    return insights


async def synthesis_agent(state: GraphState) -> dict[str, Any]:
    """Synthesis: combine idea/classification/Research/Competition/Customer
    into an executive summary, key insights, and an evidence-confidence
    summary. Never fabricates data; every insight is traceable to a claim or
    to an explicitly-declared unknown.
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "synthesis_status": "failed",
                "synthesis_errors": ["No structured idea available; cannot synthesize."],
            }

        claims, inputs_used, inputs_missing = _collect_claims(state)
        confidence = _evidence_confidence(claims)

        what_it_is = idea.solution or "unknown"
        who_it_serves = idea.target_customer or "unknown"
        problem_solved = idea.problem or "unknown"
        value_creation = (
            f"By delivering '{idea.solution}' to address '{idea.problem}'."
            if idea.solution and idea.problem
            else "unknown - insufficient structured idea detail to describe value creation."
        )

        strength = _strength_basis(confidence.overall_confidence_score, confidence.total_claims)

        executive_summary = (
            f"The idea proposes: {what_it_is}. It targets: {who_it_serves}. "
            f"It aims to solve: {problem_solved}. Current evidence strength is {strength} "
            f"(overall_confidence_score={confidence.overall_confidence_score:.2f} across "
            f"{confidence.total_claims} claim(s) from {', '.join(inputs_used) if inputs_used else 'no'} "
            f"agent(s); {len(inputs_missing)} agent(s) missing or degraded: "
            f"{', '.join(inputs_missing) if inputs_missing else 'none'})."
        )

        key_insights = _build_key_insights(claims, idea.unknowns)

        if inputs_used and (idea is not None):
            status = "success" if not inputs_missing else "partial"
        else:
            status = "partial" if idea is not None else "failed"

        result = SynthesisResult(
            status=status,
            executive_summary=executive_summary,
            what_it_is=what_it_is,
            who_it_serves=who_it_serves,
            problem_solved=problem_solved,
            value_creation=value_creation,
            current_evidence_strength=strength,
            key_insights=key_insights,
            evidence_confidence=confidence,
            inputs_used=inputs_used,
            inputs_missing=inputs_missing,
        )

        logger.info(f"Synthesis completed: {result.status}")

        return {
            "synthesis_result": result,
            "synthesis_status": result.status,
            "synthesis_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Synthesis agent failed")
        return {
            "synthesis_status": "failed",
            "synthesis_errors": [f"Synthesis agent failed: {exc}"],
        }
