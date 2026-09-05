"""Business Model / Economics Agent (Phase 3).

Now uses LLM reasoning to analyze revenue models, pricing strategies,
cost drivers, and business viability. Produces hypothesis-level business
model claims grounded in the founder's idea and target market.

Wave 2 Enhancement: Consumes shared reasoning context from all upstream agents.
Reasons collaboratively using:
- Customer profile and segments
- Competition pricing and positioning
- Market size and maturity
- Feasibility constraints
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim
from app.schemas.phase3 import BusinessModelResult, ValuedField
from app.services.collaborative_reasoning import (
    SharedReasoningContext,
    build_shared_reasoning_context,
    collect_upstream_claims,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
)
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_business_model_with_llm


def _basis_for_claim_status(status: str) -> str:
    """Convert claim status to EvidenceBasis."""
    return {
        "supported": "VERIFIED",
        "inference": "INFERRED",
        "hypothesis": "ASSUMED",
    }.get(status, "UNKNOWN")


def _collect_business_model_claims(state: GraphState) -> list[Claim]:
    """Collect business model evidence from upstream agents."""
    claims: list[Claim] = []
    if state.research_result is not None:
        for claim in state.research_result.claims:
            if claim.claim_type in ("pricing", "revenue", "cost", "business_model", "market_size"):
                claims.append(claim)
    return claims


async def business_model_agent(state: GraphState) -> dict[str, Any]:
    """
    Business Model Agent with collaborative reasoning.
    
    Reasons over:
    - Customer profile (who is paying?)
    - Competition (what do similar solutions charge?)
    - Market signals (how large is the opportunity?)
    - Feasibility constraints (technical costs?)
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "business_model_status": "failed",
                "business_model_errors": ["No structured idea available"],
            }

        # Build shared reasoning context for collaborative intelligence
        context = build_shared_reasoning_context(state)
        
        # Check for unknowns that impact business model
        unknowns = collect_unknowns_for_agent(context, "business_model_agent")
        if unknowns:
            logger.debug(f"Business model agent: {len(unknowns)} unknowns to account for")

        # Check for contradictions
        contradictions = get_relevant_contradictions(context, "business_model_agent")
        if contradictions:
            logger.debug(f"Business model agent: {len(contradictions)} contradictions detected")

        # Start with deterministic base from idea
        result = BusinessModelResult(status="partial")

        # Use idea's business model as base
        if idea.business_model and idea.business_model.lower() != "unknown":
            result.revenue_model = ValuedField(
                label="revenue_model",
                value=idea.business_model,
                basis="ASSUMED",
                notes="Founder-stated revenue model",
            )

        # Collect business model evidence from research
        business_model_claims = _collect_business_model_claims(state)

        # Also collect from shared reasoning context for contradiction awareness
        context_claims = collect_upstream_claims(
            context,
            claim_types=["pricing", "revenue", "cost", "competitive_advantage"]
        )

        all_business_claims = business_model_claims + [
            c for c in context_claims 
            if c not in business_model_claims
        ]

        # Process claims to build pricing assumptions and cost drivers
        # Account for contradictions when reasoning
        for claim in all_business_claims:
            basis = _basis_for_claim_status(claim.status)
            evidence_ids = [e.id for e in claim.evidence_items if e.id]

            if claim.claim_type == "pricing":
                # Check if contradicted by customer profile
                has_contradiction = any(
                    "pricing" in c.title.lower() or "price" in c.description.lower()
                    for c in contradictions
                )
                
                result.pricing_assumptions.append(ValuedField(
                    label="pricing_strategy",
                    value=claim.claim_text,
                    basis=basis,
                    evidence_ids=evidence_ids,
                    notes=f"Based on {claim.status} evidence" + 
                          (" (contradicted)" if has_contradiction else ""),
                ))

            elif claim.claim_type == "cost":
                result.cost_drivers.append(ValuedField(
                    label="cost_driver",
                    value=claim.claim_text,
                    basis=basis,
                    evidence_ids=evidence_ids,
                ))

            elif claim.claim_type == "revenue":
                if not result.revenue_model.value:
                    result.revenue_model = ValuedField(
                        label="revenue_model",
                        value=claim.claim_text,
                        basis=basis,
                        evidence_ids=evidence_ids,
                    )

        # Add reasoning context to LLM call
        context_prompt = _build_reasoning_context_prompt(context, contradictions, unknowns)

        # Use LLM to enrich analysis with full context
        llm_provider = get_llm_provider()
        try:
            llm_analysis = await analyze_business_model_with_llm(
                idea_text=state.raw_idea or "",
                target_customer=idea.target_customer or context.customer_profile.get("primary_customer", "unknown"),
                value_proposition=idea.solution or "unknown",
                llm_provider=llm_provider,
            )

            if llm_analysis.get("status") == "success":
                result.claims.extend(llm_analysis.get("claims", []))
                result.status = "success"
                
                # Add LLM-derived insights if we don't have them from evidence
                if not result.revenue_model.value:
                    result.revenue_model = ValuedField(
                        label="revenue_model",
                        value=llm_analysis.get("revenue_model"),
                        basis="ASSUMED",
                        notes="LLM-recommended based on target customer and value proposition",
                    )
        except Exception as exc:
            logger.warning(f"Business model LLM enrichment failed: {exc}; using evidence-only")
            result.status = "partial" if all_business_claims else "failed"

        # Mark status as success if we have reasonable content
        if result.revenue_model.value or result.pricing_assumptions:
            if result.status == "partial":
                result.status = "success"

        logger.info(
            f"Business model analysis completed: {result.status} "
            f"(confidence={context.business_confidence:.2f}, "
            f"unknowns={len(unknowns)}, "
            f"contradictions={len(contradictions)})"
        )

        return {
            "business_model_result": result,
            "business_model_status": result.status,
            "business_model_errors": result.errors,
        }

    except Exception as exc:
        logger.exception("Business model agent failed")
        return {
            "business_model_status": "failed",
            "business_model_errors": [f"Business model agent failed: {exc}"],
        }


def _build_reasoning_context_prompt(
    context: SharedReasoningContext,
    contradictions: list,
    unknowns: list,
) -> str:
    """
    Build a prompt segment with reasoning context for LLM.
    
    Helps LLM understand constraints and conflicts for better analysis.
    """
    parts = []
    
    if context.customer_profile:
        parts.append(f"Customer profile: {context.customer_profile}")
    
    if context.competitors:
        parts.append(f"Known competitors: {len(context.competitors)}")
    
    if context.market_confidence > 0:
        parts.append(f"Market confidence: {context.market_confidence:.2%}")
    
    if contradictions:
        parts.append(f"Known contradictions: {len(contradictions)} ({', '.join(c.title for c in contradictions[:2])})")
    
    if unknowns:
        parts.append(f"Key unknowns: {', '.join(u.category for u in unknowns[:3])}")
    
    return " | ".join(parts)
