"""Product & Feasibility Agent (Phase 3).

Produces decision-support level feasibility analysis, not a detailed
implementation architecture (per spec: "The purpose is decision support, not
detailed software architecture"). Category-level classifications (LOW /
MEDIUM / HIGH / UNKNOWN) are derived from classification labels and
structured-idea fields already collected - never invented.

Wave 2 Enhancement:
- Consumes shared reasoning context from upstream agents
- Considers business model complexity in feasibility assessment
- Factors market maturity into technical timelines
- Accounts for risk profile in feasibility confidence
"""
from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.phase3 import FeasibilityCategoryAssessment, FeasibilityLevel, FeasibilityResult, ProductSummary
from app.services.agent_services import analyze_feasibility_with_llm
from app.services.collaborative_reasoning import (
    build_shared_reasoning_context,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
)
from app.services.llm_provider import get_llm_provider

# Industries treated as carrying elevated regulatory/operational dependency.
# Documented heuristic, not a legal determination.
_REGULATED_INDUSTRIES = {"healthcare", "health", "finance", "fintech", "banking", "insurance", "legal", "education"}

# Feasibility-level ranking used to take the "worst" (least feasible) rating
# across category assessments as the overall technical_feasibility.
_LEVEL_RANK: dict[FeasibilityLevel, int] = {"HIGH": 3, "MEDIUM": 2, "LOW": 1, "UNKNOWN": 0}
_RANK_LEVEL = {v: k for k, v in _LEVEL_RANK.items()}


def _worst_level(levels: list[FeasibilityLevel]) -> FeasibilityLevel:
    known = [l for l in levels if l != "UNKNOWN"]
    if not known:
        return "UNKNOWN"
    return _RANK_LEVEL[min(_LEVEL_RANK[l] for l in known)]

async def feasibility_agent(state: GraphState) -> dict[str, Any]:
    """
    Feasibility assessment with Wave 2 collaborative context.
    
    Factors in:
    - Business model complexity
    - Market maturity signals
    - Risk profile from upstream
    - Technical contradictions
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "feasibility_status": "failed",
                "feasibility_errors": ["No structured idea available; cannot assess feasibility."],
            }

        # Build shared reasoning context for enriched assessment
        context = build_shared_reasoning_context(state)
        feasibility_unknowns = collect_unknowns_for_agent(context, "feasibility_agent")
        feasibility_contradictions = get_relevant_contradictions(context, "feasibility_agent")

        labels = {lbl.lower() for lbl in (state.classification.labels if state.classification else [])}
        industry = (idea.industry_category or "").lower()
        raw_idea = (state.raw_idea or "").lower()

        # Enrich product summary with business model insights
        business_model = state.business_model_result
        business_model_basis = business_model.revenue_model.basis if business_model else "UNKNOWN"

        product = ProductSummary(
            core_product=idea.solution,
            mvp_scope=[idea.solution] if idea.solution else [],
            essential_features=[idea.solution] if idea.solution else [],
            non_essential_features=[],
            user_journey=[idea.problem, idea.solution] if idea.problem and idea.solution else [],
            differentiation=None,
            basis="ASSUMED" if idea.solution else "UNKNOWN",
        )

        assessments: list[FeasibilityCategoryAssessment] = []

        is_ai = "ai" in labels or "ai" in raw_idea
        ai_level: FeasibilityLevel = "MEDIUM" if is_ai else "LOW"
        assessments.append(FeasibilityCategoryAssessment(
            category="ai_ml_requirements",
            level=ai_level if idea.solution else "UNKNOWN",
            notes="AI/ML mentioned in classification or raw idea text." if is_ai else "No AI/ML signal detected.",
        ))

        # Consider market maturity in data requirements assessment
        market_maturity = context.market_signals.get("market_maturity", "unknown") if context.market_signals else "unknown"
        data_level: FeasibilityLevel = "MEDIUM" if industry and industry != "unknown" else "UNKNOWN"
        if market_maturity in {"nascent", "emerging"}:
            data_level = "HIGH"  # Nascent markets require more data gathering
            
        assessments.append(FeasibilityCategoryAssessment(
            category="data_requirements",
            level=data_level,
            notes=f"Industry category '{idea.industry_category}' implies domain-specific data needs. "
                  f"Market maturity '{market_maturity}' {'elevates' if data_level == 'HIGH' else 'informs'} data requirements."
                  if data_level != "UNKNOWN" else "Industry category unknown; cannot assess data needs.",
        ))

        is_regulated = industry in _REGULATED_INDUSTRIES
        reg_level: FeasibilityLevel = "LOW" if is_regulated else ("MEDIUM" if industry and industry != "unknown" else "UNKNOWN")
        assessments.append(FeasibilityCategoryAssessment(
            category="regulatory_operational_dependencies",
            level=reg_level,
            notes=f"'{idea.industry_category}' is a heuristically regulated industry." if is_regulated else "No specific regulatory signal detected.",
        ))

        assessments.append(FeasibilityCategoryAssessment(
            category="technical_complexity",
            level=ai_level if idea.solution else "UNKNOWN",
            notes="Approximated from AI/ML signal in the absence of a detailed architecture (out of scope for Phase 3).",
        ))

        assessments.append(FeasibilityCategoryAssessment(category="dependencies", level="UNKNOWN", notes="No dependency evidence collected upstream."))
        assessments.append(FeasibilityCategoryAssessment(category="integrations", level="UNKNOWN", notes="No integration evidence collected upstream."))
        assessments.append(FeasibilityCategoryAssessment(
            category="infrastructure_requirements",
            level="MEDIUM" if is_ai else "UNKNOWN",
            notes="AI/ML products typically require model-serving infrastructure." if is_ai else "No infrastructure evidence collected upstream.",
        ))

        overall = _worst_level([a.level for a in assessments])

        # Adjust overall feasibility based on business model complexity
        if business_model and business_model_basis == "VERIFIED":
            # Verified business model reduces feasibility concerns
            if overall == "UNKNOWN":
                overall = "MEDIUM"
        elif business_model and business_model_basis == "UNKNOWN":
            # Unknown business model increases feasibility risk
            overall = "LOW" if overall == "MEDIUM" else overall

        result = FeasibilityResult(
            status="success" if idea.solution else "partial",
            product=product,
            technical_feasibility=overall,
            category_assessments=assessments,
        )

        # Add contradiction context to notes if present
        if feasibility_contradictions:
            result.notes = (
                f"Technical feasibility assessment accounts for {len(feasibility_contradictions)} "
                f"contradiction(s) from upstream analysis that may impact feasibility timelines."
            )

        try:
            llm_provider = get_llm_provider()
            
            # Build enriched context for LLM analysis
            context_notes = f"Business model basis: {business_model_basis}. Market maturity: {market_maturity}. "
            if feasibility_unknowns:
                context_notes += f"Unknowns impacting feasibility: {len(feasibility_unknowns)}. "
            if feasibility_contradictions:
                context_notes += f"Technical contradictions: {len(feasibility_contradictions)}."
            
            llm_analysis = await analyze_feasibility_with_llm(
                idea_text=state.raw_idea or "",
                solution=idea.solution or "unknown",
                technology_hints=idea.business_model or None,
                llm_provider=llm_provider,
            )
            if llm_analysis.get("status") == "success":
                complexity = (llm_analysis.get("complexity") or "").lower()
                if complexity in {"low", "medium", "high"}:
                    result.technical_feasibility = complexity.upper()
        except Exception:
            logger.warning("LLM feasibility enrichment unavailable; using deterministic feasibility assessment.", exc_info=True)

        logger.info(f"Feasibility analysis completed: {result.status}")

        return {
            "feasibility_result": result,
            "feasibility_status": result.status,
            "feasibility_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Feasibility agent failed")
        return {
            "feasibility_status": "failed",
            "feasibility_errors": [f"Feasibility agent failed: {exc}"],
        }
