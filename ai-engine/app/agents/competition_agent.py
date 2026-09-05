"""
Competition Agent: Analyze direct competitors, indirect competitors, substitutes, alternatives.

Now uses LLM reasoning enriched with research evidence to identify and analyze competitors.
Produces hypothesis-level claims about the competitive landscape grounded in evidence
and industry knowledge.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim, CompetitionResult
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_competition_with_llm


def _basis_for_claim_status(status: str) -> str:
    """Convert claim status to EvidenceBasis."""
    return {
        "supported": "VERIFIED",
        "inference": "INFERRED",
        "hypothesis": "ASSUMED",
    }.get(status, "UNKNOWN")


def _collect_competition_claims(state: GraphState) -> list[Claim]:
    """Collect competition-related evidence from upstream agents."""
    claims: list[Claim] = []
    if state.research_result is not None:
        for claim in state.research_result.claims:
            if claim.claim_type in (
                "competitor",
                "competitive_advantage",
                "market_saturation",
                "differentiation",
                "pricing",
            ):
                claims.append(claim)
    return claims


async def competition_agent(state: GraphState) -> dict[str, Any]:
    """
    Competition Agent: Analyze direct competitors, indirect competitors, substitutes, alternatives.

    Uses LLM to generate realistic competitive landscape analysis enriched with research
    evidence. Based on the founder's idea, industry category, and target customer.
    Produces hypothesis-level claims grounded in industry knowledge and evidence.
    """
    try:
        if not state.structured_idea:
            return {
                "competition_status": "failed",
                "competition_errors": ["No structured idea available"],
            }

        idea = state.structured_idea
        
        # Collect competition evidence from upstream agents
        competition_claims = _collect_competition_claims(state)

        # Start with deterministic base
        result = CompetitionResult(status="partial")
        result.claims.extend(competition_claims)

        # Add competitors from evidence
        for claim in competition_claims:
            basis = _basis_for_claim_status(claim.status)
            evidence_ids = [e.id for e in claim.evidence_items if e.id]

            if claim.claim_type == "competitor":
                result.competitors.append({
                    "name": claim.claim_text,
                    "type": "direct",
                    "basis": basis,
                    "evidence_ids": evidence_ids,
                })

            elif claim.claim_type == "competitive_advantage":
                if "competitive_advantages" not in result.competitive_analysis:
                    result.competitive_analysis["competitive_advantages"] = []
                result.competitive_analysis["competitive_advantages"].append({
                    "advantage": claim.claim_text,
                    "basis": basis,
                    "evidence_ids": evidence_ids,
                })

        # Use LLM to enrich competition analysis
        llm_provider = get_llm_provider()
        try:
            llm_analysis = await analyze_competition_with_llm(
                idea_text=state.raw_idea or "",
                industry=idea.industry_category or "technology",
                target_customer=idea.target_customer or "unknown",
                llm_provider=llm_provider,
            )

            if llm_analysis.get("status") == "success":
                result.claims.extend(llm_analysis.get("claims", []))
                result.status = "success"

                # Add competitors from LLM analysis if not already in evidence
                if llm_analysis.get("competitors"):
                    existing_names = {c.get("name") for c in result.competitors}
                    for c in llm_analysis.get("competitors", []):
                        if c.name not in existing_names:
                            result.competitors.append({
                                "name": c.name,
                                "website": c.website,
                                "pricing": c.pricing,
                                "strengths": c.strengths,
                                "weaknesses": c.weaknesses,
                                "type": "direct",
                                "basis": "ASSUMED",
                            })

                # Add market saturation analysis
                if llm_analysis.get("market_saturation"):
                    result.competitive_analysis["market_saturation"] = llm_analysis["market_saturation"]

                # Add differentiation strategy
                if llm_analysis.get("differentiation"):
                    result.competitive_analysis["differentiation_strategy"] = llm_analysis["differentiation"]

        except Exception as exc:
            logger.warning(f"Competition LLM enrichment failed: {exc}; using evidence-only")
            result.status = "partial" if competition_claims else "failed"

        # Mark status as success if we have reasonable content
        if result.competitors or competition_claims:
            if result.status == "partial":
                result.status = "success"

        logger.info(f"Competition analysis completed: {result.status}")

        return {
            "competition_result": result,
            "competition_status": result.status,
            "competition_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Competition agent failed")
        return {
            "competition_status": "failed",
            "competition_errors": [f"Competition agent failed: {exc}"],
        }
