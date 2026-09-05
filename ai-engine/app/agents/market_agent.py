"""Market / Industry Analysis Agent (Phase 3).

Now uses LLM reasoning in addition to evidence-based claims analysis.
Analyzes market existence, category, dynamics, demand/growth signals,
geography, constraints, regulatory context, maturity, and segments.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim
from app.schemas.phase3 import MarketMaturity, MarketResult, MarketSignal
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_market_with_llm


# Claim types mapping
_CLAIM_TYPE_TO_SIGNAL_CATEGORY: dict[str, str] = {
    "market_size": "demand_signal",
    "market_trend": "trend",
    "technology_trend": "growth_signal",
    "demand_signal": "demand_signal",
    "regulatory": "regulatory_context",
}

_REGULATED_INDUSTRIES = {"healthcare", "health", "finance", "fintech", "banking", "insurance", "legal", "education"}


def _basis_for_claim_status(status: str) -> str:
    return {
        "supported": "VERIFIED",
        "inference": "INFERRED",
        "hypothesis": "ASSUMED",
    }.get(status, "UNKNOWN")


def _collect_market_claims(state: GraphState) -> list[Claim]:
    claims: list[Claim] = []
    for result in (state.research_result, state.competition_result, state.customer_result):
        if result is not None:
            claims.extend(c for c in result.claims if c.claim_type in _CLAIM_TYPE_TO_SIGNAL_CATEGORY)
    return claims


def _market_exists_basis(claims: list[Claim]) -> str:
    if not claims:
        return "UNKNOWN"
    order = {"VERIFIED": 3, "INFERRED": 2, "ASSUMED": 1, "UNKNOWN": 0}
    best = max((_basis_for_claim_status(c.status) for c in claims), key=lambda b: order[b])
    return best


def _maturity_heuristic(claims: list[Claim]) -> MarketMaturity:
    """Heuristic: if there is at least one INFERRED-or-better trend/growth signal,
    call the market GROWING; otherwise UNKNOWN."""
    trend_claims = [c for c in claims if c.claim_type in {"market_trend", "technology_trend", "demand_signal"}]
    if any(c.status in {"supported", "inference"} for c in trend_claims):
        return "GROWING"
    return "UNKNOWN"


async def market_agent(state: GraphState) -> dict[str, Any]:
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "market_status": "failed",
                "market_errors": ["No structured idea available; cannot assess market."],
            }

        # Collect evidence-based claims from upstream agents
        market_claims = _collect_market_claims(state)

        # Use LLM to analyze market aspects
        llm_provider = get_llm_provider()
        llm_analysis = await analyze_market_with_llm(
            idea_text=state.raw_idea or "",
            industry=idea.industry_category or "unknown",
            research_claims=market_claims,
            llm_provider=llm_provider,
        )

        # Combine LLM analysis claims with evidence-based claims
        all_claims = market_claims.copy()
        if llm_analysis.get("status") == "success":
            all_claims.extend(llm_analysis.get("claims", []))

        # Build signals from all claims
        signals: list[MarketSignal] = []
        for claim in all_claims:
            category = _CLAIM_TYPE_TO_SIGNAL_CATEGORY.get(claim.claim_type, "trend")
            signals.append(MarketSignal(
                category=category,
                statement=claim.claim_text,
                basis=_basis_for_claim_status(claim.status),
                evidence_ids=[e.id for e in claim.evidence_items if e.id],
                claim_ids=[claim.id] if claim.id else [],
            ))

        # Add LLM-derived insights
        if idea.industry_category and idea.industry_category.lower() != "unknown":
            signals.append(MarketSignal(
                category="market_category",
                statement=f"Industry category: {idea.industry_category}",
                basis="ASSUMED",
                claim_ids=[],
            ))

        if idea.geography and idea.geography.lower() != "unknown":
            signals.append(MarketSignal(
                category="geography",
                statement=f"Primary geography: {idea.geography}",
                basis="ASSUMED",
                claim_ids=[],
            ))

        # Add regulated industry signal if applicable
        industry_lower = (idea.industry_category or "").lower()
        if any(regulated in industry_lower for regulated in _REGULATED_INDUSTRIES):
            signals.append(MarketSignal(
                category="regulatory_context",
                statement=f"{idea.industry_category} is a regulated industry",
                basis="VERIFIED",
                claim_ids=[],
            ))

        # Build result
        result = MarketResult(
            status="success" if all_claims else "partial",
            claims=all_claims,
            market_exists=_market_exists_basis(all_claims),
            market_category=idea.industry_category or llm_analysis.get("market_category"),
            market_maturity=_maturity_heuristic(all_claims),
            geography=idea.geography or llm_analysis.get("geography"),
            signals=signals,
            segments=llm_analysis.get("segments", []),
        )

        return {
            "market_result": result,
            "market_status": "success",
            "market_errors": llm_analysis.get("errors", []) if llm_analysis.get("status") == "failed" else [],
        }

    except Exception as exc:
        logger.exception("Market agent failed")
        return {
            "market_status": "failed",
            "market_errors": [f"Market agent failed: {exc}"],
        }
