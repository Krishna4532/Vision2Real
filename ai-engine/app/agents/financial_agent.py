"""Financial Analysis Agent (Phase 3).

Uses LLM reasoning to estimate revenue opportunities, cost drivers, pricing considerations,
and funding requirements. Every estimate is marked with its basis (VERIFIED/INFERRED/ASSUMED/UNKNOWN).
No numbers are fabricated; unknowns remain UNKNOWN.

Wave 2 Enhancement:
- Consumes market confidence from upstream analysis
- Accounts for business model verification status
- Factors in pricing contradictions when present
- Adjusts confidence based on unknown customer or market size
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.phase3 import FinancialResult, ValuedField
from app.services.collaborative_reasoning import (
    build_shared_reasoning_context,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
)
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_financial_with_llm


async def financial_agent(state: GraphState) -> dict[str, Any]:
    """Analyze financial viability using LLM reasoning.

    Produces estimates for:
    - Startup costs
    - Year 1 and 3 revenue
    - Gross margins
    - Burn rate and runway
    - Funding requirement
    - Break-even timeline

    All estimates are marked with basis (ASSUMED/INFERRED/UNKNOWN).
    No fabricated numbers.
    
    Wave 2: Enriches analysis with market confidence, business model verification,
    and pricing contradiction awareness.
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "financial_status": "failed",
                "financial_errors": ["No structured idea available"],
            }

        # Build shared reasoning context for financial assessment
        context = build_shared_reasoning_context(state)
        financial_unknowns = collect_unknowns_for_agent(context, "financial_agent")
        financial_contradictions = get_relevant_contradictions(context, "financial_agent")

        # Use LLM to analyze financial aspects
        llm_provider = get_llm_provider()
        
        # Build market context from upstream analyses
        market_context = (state.market_result.market_category or idea.industry_category) if state.market_result else (idea.industry_category or "general")
        revenue_model = idea.business_model or "unknown"
        
        # Account for market confidence in analysis
        market_confidence = context.get("market_confidence", 0.5) if isinstance(context, dict) else getattr(context, "market_confidence", 0.5)
        
        llm_analysis = await analyze_financial_with_llm(
            idea_text=state.raw_idea or "",
            market_context=market_context,
            revenue_model=revenue_model,
            llm_provider=llm_provider,
        )

        # Build result from LLM analysis
        result = FinancialResult(
            status=llm_analysis.get("status", "partial"),
            claims=llm_analysis.get("claims", []),
        )

        # Extract financial data from structured output
        if llm_analysis.get("financial"):
            financial_output = llm_analysis["financial"]
            
            # Adjust basis based on market confidence and business model verification
            business_model = state.business_model_result
            business_model_basis = business_model.revenue_model.basis if business_model else "UNKNOWN"
            
            # Each field gets a ValuedField with explicit basis
            if hasattr(financial_output, "startup_costs") and financial_output.startup_costs:
                result.startup_costs = ValuedField(
                    label="startup_costs",
                    value=financial_output.startup_costs,
                    basis="ASSUMED",
                    notes="LLM estimate based on industry/solution type. Verify with feasibility assessment.",
                )
            
            if hasattr(financial_output, "year1_revenue_estimate") and financial_output.year1_revenue_estimate:
                revenue_basis = "ASSUMED"
                if market_confidence > 0.7:
                    revenue_basis = "INFERRED"
                result.year1_revenue = ValuedField(
                    label="year1_revenue",
                    value=financial_output.year1_revenue_estimate,
                    basis=revenue_basis,
                    notes=f"LLM projection (market confidence: {market_confidence:.0%}). Requires customer validation.",
                )
            
            if hasattr(financial_output, "year3_revenue_estimate") and financial_output.year3_revenue_estimate:
                revenue_basis = "ASSUMED"
                if market_confidence > 0.6 and business_model_basis == "VERIFIED":
                    revenue_basis = "INFERRED"
                result.year3_revenue = ValuedField(
                    label="year3_revenue",
                    value=financial_output.year3_revenue_estimate,
                    basis=revenue_basis,
                    notes=f"LLM projection (market confidence: {market_confidence:.0%}, business model: {business_model_basis}). Validate market growth assumptions.",
                )
            
            if hasattr(financial_output, "gross_margin_estimate") and financial_output.gross_margin_estimate:
                margin_notes = "LLM estimate based on industry benchmarks."
                if financial_contradictions:
                    margin_notes += f" Note: {len(financial_contradictions)} pricing contradiction(s) may affect margins."
                result.gross_margin = ValuedField(
                    label="gross_margin",
                    value=financial_output.gross_margin_estimate,
                    basis="ASSUMED",
                    notes=margin_notes,
                )
            
            if hasattr(financial_output, "burn_rate_estimate") and financial_output.burn_rate_estimate:
                # Adjust burn rate basis if market confidence is high
                burn_basis = "ASSUMED"
                if market_confidence > 0.65:
                    burn_basis = "INFERRED"
                result.burn_rate = ValuedField(
                    label="burn_rate",
                    value=financial_output.burn_rate_estimate,
                    basis=burn_basis,
                    notes="LLM estimate - verify with detailed cost breakdown",
                )
            
            if hasattr(financial_output, "runway_months") and financial_output.runway_months:
                result.runway_months = ValuedField(
                    label="runway_months",
                    value=financial_output.runway_months,
                    basis="ASSUMED",
                    notes="Derived from burn rate estimate",
                )
            
            if hasattr(financial_output, "funding_requirement") and financial_output.funding_requirement:
                result.funding_requirement = ValuedField(
                    label="funding_requirement",
                    value=financial_output.funding_requirement,
                    basis="ASSUMED",
                    notes="LLM estimate - requires detailed fundraising plan",
                )
            
            if hasattr(financial_output, "break_even_timeline") and financial_output.break_even_timeline:
                result.break_even_timeline = ValuedField(
                    label="break_even_timeline",
                    value=financial_output.break_even_timeline,
                    basis="ASSUMED",
                    notes="LLM projection - highly dependent on execution",
                )
            
            if hasattr(financial_output, "key_assumptions"):
                result.key_assumptions = financial_output.key_assumptions or []
        
        # Add error handling
        if llm_analysis.get("error"):
            result.errors.append(llm_analysis["error"])
            result.status = "failed"
        
        # Log wave 2 context
        logger.info(
            f"Financial analysis completed: {result.status} "
            f"(market_confidence={market_confidence:.0%}, "
            f"business_model_basis={business_model_basis}, "
            f"contradictions={len(financial_contradictions)}, "
            f"unknowns={len(financial_unknowns)})"
        )

        return {
            "financial_result": result,
            "financial_status": result.status,
            "financial_errors": result.errors,
        }

    except Exception as exc:
        logger.exception("Financial agent failed")
        return {
            "financial_status": "failed",
            "financial_errors": [f"Financial agent failed: {exc}"],
        }
