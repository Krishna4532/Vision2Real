"""Agent services providing LLM-powered reasoning for Vision2Real validation agents."""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, get_origin

from pydantic.fields import PydanticUndefined

from pydantic import BaseModel, Field

from app.core.logging import logger
from app.schemas.evidence import Claim, Evidence, Source
from app.services.intelligence_framework import (
    ConfidenceEngine,
    DecisionImpactTracker,
    EvidenceSufficiencyEngine,
)
from app.services.llm_provider import BaseLLMProvider


# ============================================================================
# Market Analysis Output Schema
# ============================================================================

class MarketAnalysisOutput(BaseModel):
    """LLM output schema for market analysis."""
    market_exists: bool = Field(description="Whether a market exists for this idea")
    market_category: str = Field(description="The category or type of market")
    market_maturity: str = Field(description="Market maturity level (nascent, growing, mature, declining)")
    geography: str = Field(description="Primary geographic focus")
    demand_signals: list[str] = Field(description="Evidence of customer demand")
    growth_opportunities: list[str] = Field(description="Growth opportunities in this market")
    market_constraints: list[str] = Field(description="Constraints or barriers in this market")
    regulatory_considerations: list[str] = Field(description="Regulatory considerations")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Competition Analysis Output Schema
# ============================================================================

class CompetitorProfile(BaseModel):
    """Schema for a single competitor profile."""
    name: str = Field(description="Competitor name")
    website: str = Field(description="Competitor website URL")
    pricing: str = Field(description="Competitor pricing model")
    strengths: list[str] = Field(description="Competitor strengths")
    weaknesses: list[str] = Field(description="Competitor weaknesses")
    market_position: str = Field(description="Competitor's market position")
    differentiation_opportunity: str = Field(description="How to differentiate from this competitor")


class CompetitionAnalysisOutput(BaseModel):
    """LLM output schema for competition analysis."""
    direct_competitors: list[CompetitorProfile] = Field(description="Direct competitors")
    indirect_competitors: list[str] = Field(description="Indirect competitors or substitutes")
    competitive_landscape: str = Field(description="Overall competitive landscape assessment")
    differentiation_strategy: str = Field(description="Recommended differentiation strategy")
    market_gaps: list[str] = Field(description="Identified market gaps")
    competitive_risks: list[str] = Field(description="Competitive risks to address")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Customer Analysis Output Schema
# ============================================================================

class CustomerPersona(BaseModel):
    """Schema for a customer persona."""
    title: str = Field(description="Persona title/role")
    pain_points: list[str] = Field(description="Key pain points")
    goals: list[str] = Field(description="Primary goals")
    buying_motivation: str = Field(description="What motivates purchase decision")
    willingness_to_pay: str = Field(description="Price sensitivity and ability to pay")
    adoption_friction: list[str] = Field(description="Barriers to adoption")
    channel_preference: str = Field(description="Preferred communication channel")


class CustomerAnalysisOutput(BaseModel):
    """LLM output schema for customer analysis."""
    ideal_customer_profile: str = Field(description="Description of ideal customer profile")
    customer_personas: list[CustomerPersona] = Field(description="Detailed customer personas")
    market_segments: list[str] = Field(description="Addressable market segments")
    customer_acquisition_strategy: str = Field(description="Strategy for customer acquisition")
    retention_drivers: list[str] = Field(description="What will drive customer retention")
    customer_needs_evidence: list[str] = Field(description="Evidence of customer needs")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Business Model Analysis Output Schema
# ============================================================================

class BusinessModelAnalysisOutput(BaseModel):
    """LLM output schema for business model analysis."""
    revenue_model: str = Field(description="Description of revenue model")
    pricing_strategy: str = Field(description="Recommended pricing strategy")
    cost_structure: str = Field(description="Key cost drivers")
    unit_economics_estimate: str = Field(description="Unit economics estimate")
    customer_lifetime_value: str = Field(description="Estimated customer lifetime value")
    customer_acquisition_cost: str = Field(description="Estimated customer acquisition cost")
    monetization_options: list[str] = Field(description="Alternative monetization options")
    scalability: str = Field(description="Scalability assessment")
    business_viability: str = Field(description="Overall business viability assessment")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Feasibility Analysis Output Schema
# ============================================================================

class FeasibilityAnalysisOutput(BaseModel):
    """LLM output schema for technical feasibility analysis."""
    core_product: str = Field(description="Core product description")
    mvp_scope: list[str] = Field(description="MVP scope and features")
    technical_complexity: str = Field(description="Technical complexity assessment")
    technology_stack_recommendation: str = Field(description="Recommended technology stack")
    infrastructure_requirements: str = Field(description="Infrastructure requirements")
    development_timeline: str = Field(description="Estimated development timeline to MVP")
    key_technical_risks: list[str] = Field(description="Key technical risks")
    integrations_needed: list[str] = Field(description="Required integrations")
    feasibility_level: str = Field(description="Overall feasibility level (low, medium, high)")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Financial Analysis Output Schema
# ============================================================================

class FinancialAnalysisOutput(BaseModel):
    """LLM output schema for financial analysis."""
    startup_costs: str = Field(description="Estimated startup costs")
    year1_revenue_estimate: str = Field(description="Year 1 revenue estimate")
    year3_revenue_estimate: str = Field(description="Year 3 revenue estimate")
    gross_margin_estimate: str = Field(description="Estimated gross margins")
    burn_rate_estimate: str = Field(description="Monthly burn rate estimate")
    runway_months: str = Field(description="Estimated runway with typical funding")
    funding_requirement: str = Field(description="Estimated funding requirement")
    break_even_timeline: str = Field(description="Timeline to break-even")
    key_assumptions: list[str] = Field(description="Key financial assumptions")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


class FinancialOverviewSection(BaseModel):
    """Small schema for the overview portion of financial analysis."""
    startup_costs: str = Field(description="Estimated startup costs")
    year1_revenue_estimate: str = Field(description="Year 1 revenue estimate")
    year3_revenue_estimate: str = Field(description="Year 3 revenue estimate")
    gross_margin_estimate: str = Field(description="Estimated gross margins")


class FinancialFundingSection(BaseModel):
    """Small schema for capital and runway questions."""
    burn_rate_estimate: str = Field(description="Monthly burn rate estimate")
    runway_months: str = Field(description="Estimated runway with typical funding")
    funding_requirement: str = Field(description="Estimated funding requirement")
    break_even_timeline: str = Field(description="Timeline to break-even")


class FinancialAssumptionSection(BaseModel):
    """Small schema for the financial assumptions portion."""
    key_assumptions: list[str] = Field(description="Key financial assumptions")


# ============================================================================
# Risk Analysis Output Schema
# ============================================================================

class RiskItemOutput(BaseModel):
    """Schema for a single risk item."""
    risk_statement: str = Field(description="Clear statement of the risk")
    category: str = Field(description="Risk category (market, technical, financial, etc.)")
    severity: str = Field(description="Risk severity (low, medium, high, critical)")
    likelihood: str = Field(description="Likelihood of occurrence")
    impact: str = Field(description="Impact if risk materializes")
    mitigation_strategy: str = Field(description="Proposed mitigation strategy")


class RiskAnalysisOutput(BaseModel):
    """LLM output schema for risk analysis."""
    risks: list[RiskItemOutput] = Field(description="List of identified risks")
    most_critical_risk: str = Field(description="Most critical risk to address")
    risk_mitigation_priorities: list[str] = Field(description="Prioritized risk mitigation plan")
    overall_risk_profile: str = Field(description="Overall risk profile assessment")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


# ============================================================================
# Red Team Analysis Output Schema
# ============================================================================

class RedTeamObjection(BaseModel):
    """Schema for a red team objection."""
    assumption_challenged: str = Field(description="Founder assumption being challenged")
    objection: str = Field(description="The red team's objection to this assumption")
    evidence_supporting_objection: str = Field(description="Evidence or logic supporting objection")
    how_to_disprove: str = Field(description="How the founder could disprove this objection")
    severity: str = Field(description="Severity if objection is valid (low, medium, high, critical)")


class RedTeamAnalysisOutput(BaseModel):
    """LLM output schema for red team analysis."""
    objections: list[RedTeamObjection] = Field(description="Key objections to the idea")
    strongest_objection: str | None = Field(default=None, description="The strongest objection to the idea")
    weakest_link: str | None = Field(default=None, description="Weakest part of the idea or business plan")
    fatal_flaws_identified: bool = Field(default=False, description="Whether any fatal flaws were identified")
    reasons_startup_could_fail: list[str] = Field(description="Top reasons this startup could fail")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the analysis")


class RedTeamObjectionsSection(BaseModel):
    """Small schema for the objection list."""
    objections: list[RedTeamObjection] = Field(description="Key objections to the idea")


class RedTeamSummarySection(BaseModel):
    """Small schema for the overarching red-team summary."""
    strongest_objection: str | None = Field(default=None, description="The strongest objection to the idea")
    weakest_link: str | None = Field(default=None, description="Weakest part of the idea or business plan")
    fatal_flaws_identified: bool = Field(default=False, description="Whether any fatal flaws were identified")
    reasons_startup_could_fail: list[str] = Field(description="Top reasons this startup could fail")


class RedTeamRecommendationsSection(BaseModel):
    """Small schema for the red-team recommendations."""
    recommendations: list[str] = Field(default_factory=list, description="Concrete recommendations to challenge the idea")


# ============================================================================
# Validation Plan Output Schema
# ============================================================================

class ValidationExperiment(BaseModel):
    """Schema for a validation experiment."""
    question: str = Field(description="What we want to learn/validate")
    why_matters: str = Field(description="Why this matters for the business")
    method: str = Field(description="Proposed validation method")
    timeline: str = Field(description="Estimated timeline to complete")
    success_criteria: str = Field(description="What success looks like")
    resources_needed: str = Field(description="Resources needed to run this validation")
    priority: str = Field(description="Priority (high, medium, low)")


class ValidationPlanOutput(BaseModel):
    """LLM output schema for validation plan."""
    critical_unknowns: list[str] = Field(description="Most critical unknowns to validate")
    experiments: list[ValidationExperiment] = Field(description="Recommended experiments")
    validation_roadmap: str = Field(description="Overall validation roadmap and timeline")
    decision_criteria: str = Field(description="Criteria for go/no-go decision at each stage")
    reasoning: str | None = Field(default=None, description="Detailed reasoning behind the plan")


class DecisionAnalysisOutput(BaseModel):
    """Advisory LLM decision output. The deterministic gate remains final authority."""
    proposed_decision: str = Field(description="Advisory recommendation: BUILD, VALIDATE, PIVOT, or REJECT")
    rationale: list[str] = Field(default_factory=list, description="Why this decision is appropriate")
    confidence: float = Field(default=0.0, description="Advisory confidence score between 0 and 1")
    missing_evidence: list[str] = Field(default_factory=list, description="What still needs evidence")
    assumptions: list[str] = Field(default_factory=list, description="What assumptions remain")
    tradeoffs: list[str] = Field(default_factory=list, description="Key tradeoffs")
    milestones: list[str] = Field(default_factory=list, description="Milestones before reassessment")
    reasoning: str | None = Field(default=None, description="Narrative explanation for the advisory recommendation")


class DecisionScoringOutput(BaseModel):
    """Small schema for the decision score and recommendation."""
    proposed_decision: str = Field(description="Advisory recommendation: BUILD, VALIDATE, PIVOT, or REJECT")
    rationale: list[str] = Field(default_factory=list, description="Why this decision is appropriate")
    confidence: float = Field(default=0.0, description="Advisory confidence score between 0 and 1")
    missing_evidence: list[str] = Field(default_factory=list, description="What still needs evidence")
    assumptions: list[str] = Field(default_factory=list, description="What assumptions remain")
    tradeoffs: list[str] = Field(default_factory=list, description="Key tradeoffs")
    milestones: list[str] = Field(default_factory=list, description="Milestones before reassessment")


class DecisionReasoningOutput(BaseModel):
    """Small schema for the narrative reasoning behind the advisory decision."""
    reasoning: str | None = Field(default=None, description="Narrative explanation for the advisory recommendation")


# ============================================================================
# Service Functions
# ============================================================================


SECTION_METRICS = ContextVar("section_metrics", default=None)


def _set_section_metrics(metrics: dict[str, Any]) -> object:
    return SECTION_METRICS.set(metrics)


def _get_section_metrics() -> dict[str, Any] | None:
    return SECTION_METRICS.get()


def _new_section_metrics() -> dict[str, Any]:
    return {
        "provider_latency_ms": 0.0,
        "retry_count": 0,
        "fallback_count": 0,
        "validation_failures": 0,
        "repair_count": 0,
        "status": "pending",
    }


def _schema_default_for(annotation: Any) -> Any:
    origin = get_origin(annotation)
    if origin is list:
        return []
    if origin is dict:
        return {}
    if origin in {set, tuple}:
        return []
    if annotation is bool:
        return False
    if annotation is int:
        return 0
    if annotation is float:
        return 0.0
    if annotation is str:
        return ""
    if annotation is None:
        return None
    return None


def _empty_schema_instance(schema: type[BaseModel]) -> BaseModel:
    defaults: dict[str, Any] = {}
    for field_name, field in getattr(schema, "model_fields", {}).items():
        if field.default_factory is not None:
            try:
                defaults[field_name] = field.default_factory()
            except TypeError:
                defaults[field_name] = field.default if field.default is not PydanticUndefined else _schema_default_for(field.annotation)
        elif field.default is not PydanticUndefined:
            defaults[field_name] = field.default
        else:
            defaults[field_name] = _schema_default_for(field.annotation)
    try:
        return schema.model_validate(defaults)
    except Exception:  # pragma: no cover - fallback for partially defined models
        return schema.model_construct(**defaults)


async def _run_structured_section(
    section_name: str,
    prompt: str,
    schema: type[BaseModel],
    llm_provider: BaseLLMProvider,
    *,
    system_prompt: str | None = None,
) -> tuple[str, BaseModel | None, dict[str, Any]]:
    metrics = _new_section_metrics()
    token = _set_section_metrics(metrics)
    started = time.monotonic()
    try:
        result = await asyncio.wait_for(
            asyncio.shield(llm_provider.generate_structured(prompt, schema, system_prompt=system_prompt)),
            timeout=max(20.0, llm_provider.timeout_seconds if hasattr(llm_provider, "timeout_seconds") else 45.0),
        )
        metrics["provider_latency_ms"] = round((time.monotonic() - started) * 1000, 2)
        metrics["status"] = "success"
        return "success", result, metrics
    except asyncio.TimeoutError:
        metrics["provider_latency_ms"] = round((time.monotonic() - started) * 1000, 2)
        metrics["status"] = "failed"
        logger.warning("Structured section timed out", extra={"section": section_name, "schema": schema.__name__, "metrics": metrics})
        return "failed", _empty_schema_instance(schema), metrics
    except asyncio.CancelledError:
        metrics["provider_latency_ms"] = round((time.monotonic() - started) * 1000, 2)
        metrics["status"] = "failed"
        logger.warning("Structured section cancelled", extra={"section": section_name, "schema": schema.__name__, "metrics": metrics})
        return "failed", _empty_schema_instance(schema), metrics
    except Exception as exc:  # noqa: BLE001
        metrics["provider_latency_ms"] = round((time.monotonic() - started) * 1000, 2)
        metrics["status"] = "failed"
        logger.warning("Structured section degraded", extra={"section": section_name, "schema": schema.__name__, "error": str(exc), "metrics": metrics})
        return "failed", _empty_schema_instance(schema), metrics
    finally:
        SECTION_METRICS.reset(token)


def _derive_confidence(status: str, evidence_items: list[Evidence] | None = None, upstream_confidence: float | None = None) -> float:
    """Infer confidence from evidence quality and upstream signal, without hardcoded status-only values."""
    evidence_items = evidence_items or []
    evidence_conf = 0.0
    if evidence_items:
        evidence_conf = min(1.0, sum((item.confidence or 0.5) for item in evidence_items) / max(1, len(evidence_items)))

    upstream = upstream_confidence or 0.5
    if status == "supported":
        return round(min(0.99, max(0.55, 0.5 * evidence_conf + 0.5 * upstream + 0.1)), 3)
    if status == "inference":
        return round(min(0.9, max(0.25, 0.45 * evidence_conf + 0.4 * upstream + 0.05)), 3)
    if status == "hypothesis":
        return round(min(0.8, max(0.1, 0.35 * evidence_conf + 0.25 * upstream + 0.05)), 3)
    return round(min(0.55, max(0.05, 0.2 * evidence_conf + 0.15 * upstream)), 3)


def _create_claim(
    text: str,
    claim_type: str,
    status: str,
    sources: list[Source] | None = None,
    evidence: Evidence | None = None,
    agent: str = "agent",
    upstream_confidence: float | None = None,
) -> Claim:
    """Helper to create a claim with evidence and derived confidence.

    Every claim must pass through the production intelligence framework before it
    is accepted into canonical analysis state. This prevents unsupported agent
    conclusions from being silently treated as valid findings.
    """
    sources = sources or []
    evidence_items = []
    if evidence:
        evidence_items.append(evidence)
    if sources:
        for source in sources:
            evidence_items.append(Evidence(id=str(uuid.uuid4()), excerpt=text, confidence=1.0, sources=[source]))

    confidence = _derive_confidence(status, evidence_items, upstream_confidence)
    claim = Claim(
        id=str(uuid.uuid4()),
        claim_text=text,
        claim_type=claim_type,
        status=status,
        confidence=confidence,
        confidence_reason="",
        evidence_basis="INSUFFICIENT_EVIDENCE",
        provenance={"agent": agent},
        evidence_items=evidence_items,
        sources=sources,
        unknowns=[],
        missing_evidence=[],
        contradictions=[],
        decision_impact=[],
        reasoning_summary="",
    )

    if not evidence_items:
        claim.missing_evidence.append(f"Evidence missing for {claim_type} claim produced by {agent}.")

    claim.evidence_basis = EvidenceSufficiencyEngine.classify_claim(claim)
    claim.confidence = ConfidenceEngine.evaluate(claim)
    claim.confidence_reason = ConfidenceEngine.explain(claim)
    claim.decision_impact = [
        impact.model_dump(mode="json") for impact in DecisionImpactTracker.from_claim(claim)
    ]
    if not claim.unknowns:
        claim.unknowns = [{
            "description": f"Unresolved {claim_type} evidence gap",
            "why_it_matters": "This claim depends on evidence that has not yet been validated.",
            "affected_agents": [agent],
            "blocking": not bool(evidence_items),
            "status": "open",
        }] if not evidence_items else []

    return claim


async def analyze_market_with_llm(
    idea_text: str,
    industry: str,
    research_claims: list[Claim],
    llm_provider: BaseLLMProvider,
) -> dict[str, Any]:
    """Use LLM to analyze market aspects and generate market claims.
    
    Args:
        idea_text: The founder's idea
        industry: Industry category
        research_claims: Claims from research phase
        llm_provider: LLM provider to use
        
    Returns:
        Dictionary with market claims and analysis
    """
    prompt = f"""Analyze the market for this startup idea:

Idea: {idea_text}
Industry: {industry}

Research Evidence Available:
{json.dumps([{"text": c.claim_text, "type": c.claim_type} for c in research_claims[:5]], indent=2)}

Provide a thorough market analysis including:
- Whether a market exists for this solution
- Market size category and maturity
- Primary geographic markets
- Demand signals and growth drivers
- Market constraints and barriers
- Regulatory landscape"""
    
    system_prompt = """You are an expert market analyst. Provide a structured market analysis that is grounded in evidence and logical reasoning. Be specific about market dynamics, segment sizes, and growth drivers. Only claim what can be reasonably inferred from the founder's description and research context provided."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            MarketAnalysisOutput,
            system_prompt=system_prompt,
        )
        
        claims = []
        
        # Create claims from market analysis
        if result.market_exists:
            claims.append(_create_claim(
                f"Market exists for {industry}: {result.market_category}",
                "market_size",
                "inference",
                agent="market",
            ))
        
        for demand in result.demand_signals:
            claims.append(_create_claim(
                f"Demand signal identified: {demand}",
                "demand_signal",
                "hypothesis",
                agent="market",
            ))
        
        for opportunity in result.growth_opportunities:
            claims.append(_create_claim(
                f"Growth opportunity: {opportunity}",
                "market_trend",
                "hypothesis",
                agent="market",
            ))
        
        if result.regulatory_considerations:
            for reg in result.regulatory_considerations:
                claims.append(_create_claim(
                    f"Regulatory consideration: {reg}",
                    "regulatory",
                    "hypothesis",
                    agent="market",
                ))
        
        return {
            "status": "success",
            "claims": claims,
            "market_maturity": result.market_maturity,
            "market_category": result.market_category,
            "geography": result.geography,
        }
    except Exception as exc:
        logger.exception("Market analysis LLM call failed")
        return {
            "status": "failed",
            "claims": [],
            "error": f"Market analysis failed: {exc}",
        }


async def analyze_competition_with_llm(
    idea_text: str,
    industry: str,
    target_customer: str,
    llm_provider: BaseLLMProvider,
) -> dict[str, Any]:
    """Use LLM to analyze competitive landscape.
    
    Args:
        idea_text: The founder's idea
        industry: Industry category
        target_customer: Target customer segment
        llm_provider: LLM provider to use
        
    Returns:
        Dictionary with competition claims and analysis
    """
    prompt = f"""Analyze the competitive landscape for this startup:

Idea: {idea_text}
Industry: {industry}
Target Customer: {target_customer}

Identify and analyze:
- Direct competitors (companies solving the same problem)
- Indirect competitors and substitutes
- Competitive positioning opportunities
- Market gaps where this idea could succeed
- Competitive risks to address
- How to differentiate effectively"""
    
    system_prompt = """You are a competitive intelligence analyst. Identify real or highly plausible competitors based on the industry and customer segment. Provide realistic competitive analysis focused on positioning, differentiation, and market gaps. Base competitor analysis on general industry knowledge and logical deduction from the described market."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            CompetitionAnalysisOutput,
            system_prompt=system_prompt,
        )
        
        claims = []
        
        # Create claims from competition analysis
        for competitor in result.direct_competitors:
            claims.append(_create_claim(
                f"Direct competitor identified: {competitor.name} at {competitor.website}",
                "competitive_advantage",
                "hypothesis",
                agent="competition",
            ))

            if competitor.pricing:
                pricing_claim = _create_claim(
                    f"Pricing for {competitor.name}: {competitor.pricing}",
                    "pricing",
                    "hypothesis",
                    agent="competition",
                )
                pricing_claim.provenance.update({
                    "reasoning_type": "llm_competitor_profile",
                    "basis": "ASSUMED",
                    "source_ids": [],
                })
                claims.append(pricing_claim)
        
        for gap in result.market_gaps:
            claims.append(_create_claim(
                f"Market gap identified: {gap}",
                "market_trend",
                "hypothesis",
                agent="competition",
            ))
        
        claims.append(_create_claim(
            f"Differentiation strategy: {result.differentiation_strategy}",
            "competitive_advantage",
            "hypothesis",
            agent="competition",
        ))
        
        return {
            "status": "success",
            "claims": claims,
            "competitors": result.direct_competitors,
            "differentiation": result.differentiation_strategy,
        }
    except Exception as exc:
        logger.exception("Competition analysis LLM call failed")
        return {
            "status": "failed",
            "claims": [],
            "error": f"Competition analysis failed: {exc}",
        }


async def analyze_customer_with_llm(
    idea_text: str,
    target_customer: str,
    problem_statement: str,
    llm_provider: BaseLLMProvider,
) -> dict[str, Any]:
    """Use LLM to analyze customer profiles and needs.
    
    Args:
        idea_text: The founder's idea
        target_customer: Target customer segment
        problem_statement: Problem being solved
        llm_provider: LLM provider to use
        
    Returns:
        Dictionary with customer claims and personas
    """
    prompt = f"""Create detailed customer profiles for this startup:

Idea: {idea_text}
Target Customer: {target_customer}
Problem: {problem_statement}

Develop:
- Ideal customer profile (ICP)
- Multiple customer personas with roles and pain points
- Customer buying motivation and decision criteria
- Willingness to pay and price sensitivity
- Adoption barriers and how to overcome them
- Customer acquisition and retention strategies"""
    
    system_prompt = """You are a customer insights specialist. Create realistic, detailed customer personas based on the target market and problem statement. Focus on pain points, buying motivation, and willingness to pay. Personas should be specific and actionable for go-to-market planning."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            CustomerAnalysisOutput,
            system_prompt=system_prompt,
        )
        
        claims = []
        
        claims.append(_create_claim(
            f"Ideal customer profile: {result.ideal_customer_profile}",
            "customer_need",
            "hypothesis",
            agent="customer",
        ))

        willingness_to_pay = (
            result.customer_personas[0].willingness_to_pay
            if result.customer_personas
            else "UNKNOWN"
        )
        claims.append(_create_claim(
            f"Willingness to pay hypothesis: {willingness_to_pay}",
            "pricing",
            "hypothesis",
            agent="customer",
        ))

        for need in result.customer_needs_evidence:
            claims.append(_create_claim(
                f"Customer demand signal: {need}",
                "demand_signal",
                "hypothesis",
                agent="customer",
            ))
        
        for persona in result.customer_personas:
            claims.append(_create_claim(
                f"Customer persona: {persona.title} with pain points: {', '.join(persona.pain_points[:2])}",
                "customer_need",
                "hypothesis",
                agent="customer",
            ))
        
        for segment in result.market_segments:
            claims.append(_create_claim(
                f"Addressable market segment: {segment}",
                "market_size",
                "hypothesis",
                agent="customer",
            ))
        
        return {
            "status": "success",
            "claims": claims,
            "personas": result.customer_personas,
            "segments": result.market_segments,
            "pain_points": [
                pain_point
                for persona in result.customer_personas
                for pain_point in persona.pain_points
            ],
            "willingness_to_pay_hypothesis": willingness_to_pay,
            "icp": result.ideal_customer_profile,
        }
    except Exception as exc:
        logger.exception("Customer analysis LLM call failed")
        return {
            "status": "failed",
            "claims": [],
            "error": f"Customer analysis failed: {exc}",
        }


async def analyze_business_model_with_llm(
    idea_text: str,
    target_customer: str,
    value_proposition: str,
    llm_provider: BaseLLMProvider,
) -> dict[str, Any]:
    """Use LLM to analyze business model viability.
    
    Args:
        idea_text: The founder's idea
        target_customer: Target customer
        value_proposition: Value proposition
        llm_provider: LLM provider to use
        
    Returns:
        Dictionary with business model claims and analysis
    """
    prompt = f"""Analyze the business model viability for this startup:

Idea: {idea_text}
Target Customer: {target_customer}
Value Proposition: {value_proposition}

Evaluate:
- Revenue model and pricing strategy
- Cost structure and unit economics
- Customer lifetime value potential
- Customer acquisition cost and payback period
- Monetization options and expansion revenue
- Scalability and business model sustainability
- Overall viability assessment"""
    
    system_prompt = """You are a business model analyst. Evaluate the business model based on the target customer, value proposition, and typical SaaS economics. Provide realistic estimates for CAC, LTV, unit economics, and scalability. Focus on what's sustainable and defensible."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            BusinessModelAnalysisOutput,
            system_prompt=system_prompt,
        )
        
        claims = []
        
        claims.append(_create_claim(
            f"Revenue model: {result.revenue_model}",
            "pricing",
            "hypothesis",
            agent="business_model",
        ))
        
        claims.append(_create_claim(
            f"Unit economics: {result.unit_economics_estimate}",
            "market_trend",
            "hypothesis",
            agent="business_model",
        ))
        
        claims.append(_create_claim(
            f"Business viability: {result.business_viability}",
            "market_trend",
            "hypothesis",
            agent="business_model",
        ))
        
        return {
            "status": "success",
            "claims": claims,
            "revenue_model": result.revenue_model,
            "pricing": result.pricing_strategy,
            "unit_economics": result.unit_economics_estimate,
        }
    except Exception as exc:
        logger.exception("Business model analysis LLM call failed")
        return {
            "status": "failed",
            "claims": [],
            "error": f"Business model analysis failed: {exc}",
        }


async def analyze_feasibility_with_llm(
    idea_text: str,
    solution: str,
    technology_hints: str | None = None,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]:
    """Use LLM to analyze technical feasibility.
    
    Args:
        idea_text: The founder's idea
        solution: Solution description
        technology_hints: Any technology hints from idea description
        llm_provider: LLM provider to use
        
    Returns:
        Dictionary with feasibility claims and analysis
    """
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()
    
    prompt = f"""Analyze technical feasibility for this startup:

Idea: {idea_text}
Solution: {solution}
Technology Context: {technology_hints or 'General software/web application'}

Evaluate:
- Core product and MVP scope
- Technical complexity level
- Recommended technology stack
- Infrastructure requirements
- Development timeline to MVP
- Key technical risks and dependencies
- Integrations needed
- Overall feasibility assessment"""
    
    system_prompt = """You are a technical feasibility expert. Assess what it would realistically take to build this MVP. Consider technology choices, infrastructure, integrations, and realistic timelines. Be specific about complexity drivers and technical risks."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            FeasibilityAnalysisOutput,
            system_prompt=system_prompt,
        )
        
        claims = []
        
        claims.append(_create_claim(
            f"Technical complexity: {result.technical_complexity}",
            "technology_trend",
            "hypothesis",
            agent="feasibility",
        ))
        
        claims.append(_create_claim(
            f"Development timeline to MVP: {result.development_timeline}",
            "technology_trend",
            "hypothesis",
            agent="feasibility",
        ))
        
        return {
            "status": "success",
            "claims": claims,
            "complexity": result.technical_complexity,
            "timeline": result.development_timeline,
            "tech_stack": result.technology_stack_recommendation,
        }
    except Exception as exc:
        logger.exception("Feasibility analysis LLM call failed")
        return {
            "status": "failed",
            "claims": [],
            "error": f"Feasibility analysis failed: {exc}",
        }


async def analyze_financial_with_llm(
    idea_text: str,
    market_context: str,
    revenue_model: str,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]:
    """Generate a conservative financial assessment without inventing numeric values."""
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()

    overview_prompt = f"""Analyze the startup financial overview.

Idea: {idea_text}
Market context: {market_context}
Revenue model: {revenue_model}

Provide only the startup cost, year 1 revenue, year 3 revenue, and gross margin estimate.
Keep this to minimal directional values and explicit assumptions."""
    overview_system = """You are a cautious financial analyst. Provide a small directional overview with clear assumptions. Avoid invented precision; use ranges or qualitative estimates when confidence is low."""

    funding_prompt = f"""Analyze the capital and runway needs.

Idea: {idea_text}
Market context: {market_context}
Revenue model: {revenue_model}

Provide only: burn rate, runway, funding requirement, and break-even timeline."""
    funding_system = """You are a cautious financial analyst. Give only the cash-burn and runway metrics, and keep the output minimal and structured."""

    assumptions_prompt = f"""List the key assumptions behind the financial model.

Idea: {idea_text}
Market context: {market_context}
Revenue model: {revenue_model}

Return only the assumptions list that explain the financial outlook."""
    assumptions_system = """You are a cautious financial analyst. Keep the assumptions concise, realistic, and directly relevant to the model."""

    section_specs = [
        ("overview", overview_prompt, FinancialOverviewSection, overview_system),
        ("funding", funding_prompt, FinancialFundingSection, funding_system),
        ("runway", funding_prompt, FinancialFundingSection, funding_system),
        ("assumptions", assumptions_prompt, FinancialAssumptionSection, assumptions_system),
    ]

    section_tasks = [
        asyncio.create_task(_run_structured_section(name, prompt, schema, llm_provider, system_prompt=system_prompt))
        for name, prompt, schema, system_prompt in section_specs
    ]

    section_results: dict[str, BaseModel | None] = {}
    section_status: dict[str, str] = {}
    section_metrics: dict[str, dict[str, Any]] = {}

    raw_results = await asyncio.gather(*section_tasks, return_exceptions=True)
    for section_spec, raw_result in zip(section_specs, raw_results):
        section_name = section_spec[0]
        if isinstance(raw_result, Exception):
            section_status[section_name] = "failed"
            section_metrics[section_name] = _new_section_metrics()
            section_results[section_name] = _empty_schema_instance({
                "overview": FinancialOverviewSection,
                "funding": FinancialFundingSection,
                "runway": FinancialFundingSection,
                "assumptions": FinancialAssumptionSection,
            }.get(section_name, FinancialOverviewSection))
            continue

        status, result, metrics = raw_result
        if status is None or not isinstance(result, BaseModel):
            section_status[section_name] = "failed"
            section_results[section_name] = _empty_schema_instance({
                "overview": FinancialOverviewSection,
                "funding": FinancialFundingSection,
                "runway": FinancialFundingSection,
                "assumptions": FinancialAssumptionSection,
            }.get(section_name, FinancialOverviewSection))
            section_metrics[section_name] = metrics or _new_section_metrics()
            continue

        section_status[section_name] = status
        section_results[section_name] = result
        section_metrics[section_name] = metrics or _new_section_metrics()

    if "overview" not in section_results:
        section_results["overview"] = _empty_schema_instance(FinancialOverviewSection)
    if "funding" not in section_results:
        section_results["funding"] = _empty_schema_instance(FinancialFundingSection)
    if "runway" not in section_results:
        section_results["runway"] = _empty_schema_instance(FinancialFundingSection)
    if "assumptions" not in section_results:
        section_results["assumptions"] = _empty_schema_instance(FinancialAssumptionSection)

    overview = section_results["overview"]
    funding = section_results["funding"]
    runway = section_results["runway"] if isinstance(section_results["runway"], FinancialFundingSection) else funding
    assumptions = section_results["assumptions"]

    merged = FinancialAnalysisOutput(
        startup_costs=getattr(overview, "startup_costs", ""),
        year1_revenue_estimate=getattr(overview, "year1_revenue_estimate", ""),
        year3_revenue_estimate=getattr(overview, "year3_revenue_estimate", ""),
        gross_margin_estimate=getattr(overview, "gross_margin_estimate", ""),
        burn_rate_estimate=getattr(funding, "burn_rate_estimate", "") or getattr(runway, "burn_rate_estimate", ""),
        runway_months=getattr(funding, "runway_months", "") or getattr(runway, "runway_months", ""),
        funding_requirement=getattr(funding, "funding_requirement", "") or getattr(runway, "funding_requirement", ""),
        break_even_timeline=getattr(funding, "break_even_timeline", "") or getattr(runway, "break_even_timeline", ""),
        key_assumptions=getattr(assumptions, "key_assumptions", []),
    )

    claims = []
    for field_name, value in (
        ("startup_costs", merged.startup_costs),
        ("year1_revenue_estimate", merged.year1_revenue_estimate),
        ("year3_revenue_estimate", merged.year3_revenue_estimate),
        ("gross_margin_estimate", merged.gross_margin_estimate),
        ("burn_rate_estimate", merged.burn_rate_estimate),
        ("runway_months", merged.runway_months),
        ("funding_requirement", merged.funding_requirement),
        ("break_even_timeline", merged.break_even_timeline),
    ):
        if value:
            claims.append(_create_claim(f"Financial signal: {field_name} = {value}", "pricing", "hypothesis", agent="financial"))
    for assumption in merged.key_assumptions:
        claims.append(_create_claim(f"Financial assumption: {assumption}", "pricing", "hypothesis", agent="financial"))

    return {
        "status": "success" if any(status == "success" for status in section_status.values()) else "failed",
        "claims": claims,
        "financial": merged,
        "section_status": {
            "overview": section_status.get("overview", "failed"),
            "funding": section_status.get("funding", "failed"),
            "runway": section_status.get("runway", "failed"),
            "assumptions": section_status.get("assumptions", "failed"),
        },
        "metrics": {
            "overview": section_metrics.get("overview", _new_section_metrics()),
            "funding": section_metrics.get("funding", _new_section_metrics()),
            "runway": section_metrics.get("runway", _new_section_metrics()),
            "assumptions": section_metrics.get("assumptions", _new_section_metrics()),
        },
    }


async def analyze_risk_with_llm(
    idea_text: str,
    market_context: str,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]:
    """Generate a risk assessment in the same structured style as the other agents."""
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()

    prompt = f"""Assess execution risk for this startup idea.

Idea: {idea_text}
Market context: {market_context}

Identify the largest risks across:
- market adoption
- customer demand
- competition
- technical feasibility
- financial viability
- regulatory/compliance
- operations

For each risk, give a clear statement, category, severity, likelihood, impact,
mitigation strategy, and overall risk profile.

Requirements:
- behave like an experienced startup investor
- preserve uncertainty; never present an unsupported claim as a fact
- do not fabricate evidence, numeric market sizes, or customer counts
- output JSON only matching the expected schema
- if the risk is not evidence-backed, classify it as INFERENCE or HYPOTHESIS
- keep any missing information as UNKNOWN when needed
- preserve evidence_ids and source_ids when available in the upstream record"""

    system_prompt = """You are a prudent startup risk analyst. State risks as hypotheses or inferences, not as verified facts. Be direct about the likelihood, impact, and mitigation priorities without inventing unsupported certainty. Output strict JSON matching the schema, never markdown, and never invent evidence or source provenance."""

    try:
        result = await llm_provider.generate_structured(prompt, RiskAnalysisOutput, system_prompt=system_prompt)
        claims = []
        for risk in result.risks:
            claim_type = {
                "market": "market_trend",
                "customer": "customer_need",
                "competition": "competitive_advantage",
                "technical": "technology_trend",
                "financial": "pricing",
                "regulatory": "regulatory",
            }.get((risk.category or "").lower(), "other")
            claims.append(_create_claim(
                f"Risk: {risk.risk_statement} (severity={risk.severity}; likelihood={risk.likelihood})",
                claim_type,
                "hypothesis",
                agent="risk",
            ))
        return {"status": "success", "claims": claims, "risks": result.risks}
    except Exception as exc:
        logger.exception("Risk analysis LLM call failed")
        return {"status": "failed", "claims": [], "error": f"Risk analysis failed: {exc}"}


async def analyze_red_team_with_llm(
    idea_text: str,
    market_context: str,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]:
    """Generate adversarial objections to the idea and its assumptions."""
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()

    objections_prompt = f"""Act as a red team for this startup idea.

Idea: {idea_text}
Market context: {market_context}

List the strongest objections to the idea, including severity, the challenged assumption, supporting logic, and how to disprove them.
Do not fabricate evidence or precise customer numbers."""
    objections_system = """You are a skeptical but fair red-team analyst. Return only a short object list of objections with their severity and falsification steps."""

    summary_prompt = f"""Summarize the strongest red-team conclusion.

Idea: {idea_text}
Market context: {market_context}

Identify the strongest objection, the weakest link in the plan, whether a fatal flaw exists, and the top reasons the startup could fail."""
    summary_system = """You are a skeptical investor. Provide a concise summary of the core flaws without inventing evidence."""

    recommendations_prompt = f"""Give the top red-team recommendations.

Idea: {idea_text}
Market context: {market_context}

Provide only the most actionable recommendations to test or improve the idea before building."""
    recommendations_system = """Return a brief list of concrete, low-cost recommendations to reduce the risk of a bad startup decision."""

    section_specs = [
        ("objections", objections_prompt, RedTeamObjectionsSection, objections_system),
        ("summary", summary_prompt, RedTeamSummarySection, summary_system),
        ("recommendations", recommendations_prompt, RedTeamRecommendationsSection, recommendations_system),
    ]
    tasks = [
        asyncio.create_task(_run_structured_section(name, prompt, schema, llm_provider, system_prompt=system_prompt))
        for name, prompt, schema, system_prompt in section_specs
    ]

    section_results: dict[str, BaseModel | None] = {}
    section_status: dict[str, str] = {}
    section_metrics: dict[str, dict[str, Any]] = {}

    raw_results = await asyncio.gather(*tasks, return_exceptions=True)
    for section_spec, raw_result in zip(section_specs, raw_results):
        section_name = section_spec[0]
        if isinstance(raw_result, Exception):
            section_status[section_name] = "failed"
            section_metrics[section_name] = _new_section_metrics()
            section_results[section_name] = _empty_schema_instance({
                "objections": RedTeamObjectionsSection,
                "summary": RedTeamSummarySection,
                "recommendations": RedTeamRecommendationsSection,
            }.get(section_name, RedTeamObjectionsSection))
            continue

        status, result, metrics = raw_result
        if status is None or not isinstance(result, BaseModel):
            section_status[section_name] = "failed"
            section_results[section_name] = _empty_schema_instance({
                "objections": RedTeamObjectionsSection,
                "summary": RedTeamSummarySection,
                "recommendations": RedTeamRecommendationsSection,
            }.get(section_name, RedTeamObjectionsSection))
            section_metrics[section_name] = metrics or _new_section_metrics()
            continue

        section_status[section_name] = status
        section_results[section_name] = result
        section_metrics[section_name] = metrics or _new_section_metrics()

    objections = section_results.get("objections") or _empty_schema_instance(RedTeamObjectionsSection)
    summary = section_results.get("summary") or _empty_schema_instance(RedTeamSummarySection)
    recommendations = section_results.get("recommendations") or _empty_schema_instance(RedTeamRecommendationsSection)

    merged = RedTeamAnalysisOutput(
        objections=getattr(objections, "objections", []),
        strongest_objection=getattr(summary, "strongest_objection", None),
        weakest_link=getattr(summary, "weakest_link", None),
        fatal_flaws_identified=getattr(summary, "fatal_flaws_identified", False),
        reasons_startup_could_fail=list(getattr(summary, "reasons_startup_could_fail", []) or []) + list(getattr(recommendations, "recommendations", []) or []),
    )

    claims = []
    for objection in merged.objections:
        claims.append(_create_claim(
            f"Red-team objection: {objection.objection}",
            "customer_need",
            "hypothesis",
            agent="red_team",
        ))
    return {
        "status": "success" if any(v == "success" for v in section_status.values()) else "failed",
        "claims": claims,
        "objections": merged.objections,
        "section_status": {
            "objections": section_status.get("objections", "failed"),
            "summary": section_status.get("summary", "failed"),
            "recommendations": section_status.get("recommendations", "failed"),
        },
        "metrics": {
            "objections": section_metrics.get("objections", _new_section_metrics()),
            "summary": section_metrics.get("summary", _new_section_metrics()),
            "recommendations": section_metrics.get("recommendations", _new_section_metrics()),
        },
    }


async def analyze_validation_with_llm(
    idea_text: str,
    unknowns: list[str] | None = None,
    llm_provider: BaseLLMProvider | None = None,
    upstream_summary: str | None = None,
) -> dict[str, Any]:
    """Generate a founder validation plan that resolves high-uncertainty areas using evidence and unknowns."""
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()

    unknowns = unknowns or []
    upstream_summary = upstream_summary or "No additional evidence summary provided."
    prompt = f"""Design a founder validation plan.

Idea: {idea_text}
Critical unknowns to resolve: {', '.join(unknowns) if unknowns else 'Customer need, willingness to pay, market demand, business model'}
Upstream evidence summary:
{upstream_summary}

Create a practical validation roadmap with experiments, success criteria, resources,
and prioritization. Focus on learning what must be true before investing more into the startup.

Requirements:
- act like an experienced startup investor and founder advisor
- never fabricate customer segments, competitors, or precise market numbers
- preserve unknown values and uncertainty explicitly
- recommend only experiments that resolve real uncertainty
- prefer low-cost, evidence-generating steps before large spend
- output JSON only matching the expected schema"""

    system_prompt = """You are a startup validation advisor. Recommend specific, actionable experiments and decision criteria. Do not invent market sizes, competitors, or customer counts. Focus on learning and falsification while preserving explicit uncertainty. Output strict JSON matching the schema, never markdown."""

    try:
        result = await llm_provider.generate_structured(prompt, ValidationPlanOutput, system_prompt=system_prompt)
        claims = []
        for unknown in result.critical_unknowns:
            claims.append(_create_claim(f"Critical unknown to validate: {unknown}", "other", "hypothesis", agent="validation"))
        for experiment in result.experiments:
            claims.append(_create_claim(f"Validation experiment: {experiment.question}", "other", "hypothesis", agent="validation"))
        return {"status": "success", "claims": claims, "plan": result}
    except Exception as exc:
        logger.exception("Validation plan LLM call failed")
        return {"status": "failed", "claims": [], "error": f"Validation plan analysis failed: {exc}"}


async def analyze_decision_with_llm(
    idea_text: str,
    context_summary: str,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]:
    """Provide an advisory decision explanation while keeping deterministic rules authoritative."""
    if llm_provider is None:
        from app.services.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()

    scoring_prompt = f"""Give an advisory decision for this startup idea.

Idea: {idea_text}

Decision context:
{context_summary}

Return only:
- proposed_decision
- rationale
- confidence
- missing_evidence
- assumptions
- tradeoffs
- milestones

Keep it short and conservative; do not fabricate evidence."""
    scoring_system = """You are a conservative startup advisor. Return only a small JSON object for the decision score and recommendation."""

    reasoning_prompt = f"""Write the 1-2 paragraph reasoning behind the decision.

Idea: {idea_text}

Decision context:
{context_summary}

Explain the evidence, unknowns, and why the recommendation is cautious."""
    reasoning_system = """Write only the narrative reasoning for the recommendation, no markdown and no extra structure."""

    section_specs = [
        ("scoring", scoring_prompt, DecisionScoringOutput, scoring_system),
        ("reasoning", reasoning_prompt, DecisionReasoningOutput, reasoning_system),
    ]
    tasks = [
        asyncio.create_task(_run_structured_section(name, prompt, schema, llm_provider, system_prompt=system_prompt))
        for name, prompt, schema, system_prompt in section_specs
    ]

    section_status: dict[str, str] = {}
    section_metrics: dict[str, dict[str, Any]] = {}
    section_results: dict[str, BaseModel | None] = {}

    raw_results = await asyncio.gather(*tasks, return_exceptions=True)
    for section_spec, raw_result in zip(section_specs, raw_results):
        section_name = section_spec[0]
        if isinstance(raw_result, Exception):
            section_status[section_name] = "failed"
            section_results[section_name] = _empty_schema_instance({
                "scoring": DecisionScoringOutput,
                "reasoning": DecisionReasoningOutput,
            }.get(section_name, DecisionScoringOutput))
            section_metrics[section_name] = _new_section_metrics()
            continue

        status, result, metrics = raw_result
        if status is None or not isinstance(result, BaseModel):
            section_status[section_name] = "failed"
            section_results[section_name] = _empty_schema_instance({
                "scoring": DecisionScoringOutput,
                "reasoning": DecisionReasoningOutput,
            }.get(section_name, DecisionScoringOutput))
            section_metrics[section_name] = metrics or _new_section_metrics()
            continue
        section_status[section_name] = status
        section_results[section_name] = result
        section_metrics[section_name] = metrics or _new_section_metrics()

    scoring = section_results.get("scoring") or _empty_schema_instance(DecisionScoringOutput)
    reasoning_section = section_results.get("reasoning") or _empty_schema_instance(DecisionReasoningOutput)

    result = DecisionAnalysisOutput(
        proposed_decision=getattr(scoring, "proposed_decision", "VALIDATE"),
        rationale=getattr(scoring, "rationale", []),
        confidence=float(getattr(scoring, "confidence", 0.0) or 0.0),
        missing_evidence=getattr(scoring, "missing_evidence", []),
        assumptions=getattr(scoring, "assumptions", []),
        tradeoffs=getattr(scoring, "tradeoffs", []),
        milestones=getattr(scoring, "milestones", []),
        reasoning=getattr(reasoning_section, "reasoning", None),
    )
    return {
        "status": "success" if any(v == "success" for v in section_status.values()) else "failed",
        "decision": result.proposed_decision,
        "rationale": result.rationale,
        "confidence": float(result.confidence),
        "missing_evidence": result.missing_evidence,
        "assumptions": result.assumptions,
        "tradeoffs": result.tradeoffs,
        "milestones": result.milestones,
        "reasoning": result.reasoning,
        "plan": result,
        "section_status": {
            "scoring": section_status.get("scoring", "failed"),
            "reasoning": section_status.get("reasoning", "failed"),
        },
        "metrics": {
            "scoring": section_metrics.get("scoring", _new_section_metrics()),
            "reasoning": section_metrics.get("reasoning", _new_section_metrics()),
        },
    }

