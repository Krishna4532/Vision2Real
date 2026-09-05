"""
Customer Agent: Analyze primary customer, pain points, jobs-to-be-done, alternatives.

Now uses LLM reasoning to create detailed customer personas and market segment analysis,
enriched with research evidence. Produces hypothesis-level claims grounded in evidence
and industry knowledge.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim, CustomerResult
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_customer_with_llm


def _basis_for_claim_status(status: str) -> str:
    """Convert claim status to EvidenceBasis."""
    return {
        "supported": "VERIFIED",
        "inference": "INFERRED",
        "hypothesis": "ASSUMED",
    }.get(status, "UNKNOWN")


def _collect_customer_claims(state: GraphState) -> list[Claim]:
    """Collect customer-related evidence from upstream agents."""
    claims: list[Claim] = []
    if state.research_result is not None:
        for claim in state.research_result.claims:
            if claim.claim_type in ("customer_need", "customer_segment", "adoption_barrier", "buying_trigger"):
                claims.append(claim)
    return claims


async def customer_agent(state: GraphState) -> dict[str, Any]:
    """
    Customer Agent: Analyze primary customer, pain points, jobs-to-be-done, alternatives.

    Uses LLM to generate detailed customer personas, ICP analysis, and market segment
    understanding based on the founder's target customer, value proposition, and upstream
    research evidence.
    """
    try:
        if not state.structured_idea:
            return {
                "customer_status": "failed",
                "customer_errors": ["No structured idea available"],
            }

        idea = state.structured_idea

        # Collect customer evidence from upstream agents
        customer_claims = _collect_customer_claims(state)

        # Start with deterministic base from idea
        result = CustomerResult(status="partial")
        result.customer_analysis["primary_customer"] = idea.target_customer or "unknown"

        # Add customer insights from evidence
        for claim in customer_claims:
            basis = _basis_for_claim_status(claim.status)
            evidence_ids = [e.id for e in claim.evidence_items if e.id]

            if claim.claim_type == "customer_segment":
                if "segments" not in result.customer_analysis:
                    result.customer_analysis["segments"] = []
                result.customer_analysis["segments"].append({
                    "segment": claim.claim_text,
                    "basis": basis,
                    "evidence_ids": evidence_ids,
                })

            elif claim.claim_type == "customer_need":
                if "pain_points" not in result.customer_analysis:
                    result.customer_analysis["pain_points"] = []
                result.customer_analysis["pain_points"].append({
                    "pain_point": claim.claim_text,
                    "basis": basis,
                    "evidence_ids": evidence_ids,
                })

        # Use LLM to enrich customer analysis
        llm_provider = get_llm_provider()
        try:
            llm_analysis = await analyze_customer_with_llm(
                idea_text=state.raw_idea or "",
                target_customer=idea.target_customer or "unknown",
                problem_statement=idea.problem or "unknown",
                llm_provider=llm_provider,
            )

            if llm_analysis.get("status") == "success":
                result.claims.extend(llm_analysis.get("claims", []))
                result.status = "success"

                # Add LLM-derived personas
                if llm_analysis.get("personas"):
                    if "personas" not in result.customer_analysis:
                        result.customer_analysis["personas"] = []
                    result.customer_analysis["personas"].extend([
                        {
                            "title": p.title,
                            "pain_points": p.pain_points,
                            "goals": p.goals,
                            "buying_motivation": p.buying_motivation,
                            "willingness_to_pay": p.willingness_to_pay,
                            "adoption_friction": p.adoption_friction,
                        }
                        for p in llm_analysis.get("personas", [])
                    ])

                # Add ICP from LLM
                if llm_analysis.get("icp"):
                    result.customer_analysis["ideal_customer_profile"] = llm_analysis["icp"]

                result.customer_analysis["personas"] = [
                    {
                        "title": persona.title,
                        "pain_points": persona.pain_points,
                        "goals": persona.goals,
                        "buying_motivation": persona.buying_motivation,
                        "willingness_to_pay": persona.willingness_to_pay,
                        "adoption_friction": persona.adoption_friction,
                    }
                    for persona in llm_analysis.get("personas", [])
                ]
                result.customer_analysis["segments"] = llm_analysis.get("segments", [])
                result.customer_analysis["pain_points"] = llm_analysis.get("pain_points", [])
                result.customer_analysis["willingness_to_pay_hypothesis"] = llm_analysis.get(
                    "willingness_to_pay_hypothesis", "UNKNOWN"
                )

                if idea.target_customer and idea.target_customer.lower() == "unknown":
                    result.status = "partial"

        except Exception as exc:
            logger.warning(f"Customer LLM enrichment failed: {exc}; using evidence-only")
            result.status = "partial" if customer_claims else "failed"

        # Mark status as success if we have reasonable content
        if result.customer_analysis.get("primary_customer") != "unknown":
            if result.status == "partial":
                result.status = "success"

        logger.info(f"Customer analysis completed: {result.status}")

        return {
            "customer_result": result,
            "customer_status": result.status,
            "customer_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Customer agent failed")
        return {
            "customer_status": "failed",
            "customer_errors": [f"Customer agent failed: {exc}"],
        }
        logger.exception("Customer agent failed")
        return {
            "customer_status": "failed",
            "customer_errors": [f"Customer agent failed: {exc}"],
        }

