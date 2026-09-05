"""
Collaborative Reasoning Layer for Vision2Real Wave 2.

Provides shared intelligence infrastructure enabling multi-agent collaboration.
- SharedReasoningContext: Unified view of all agent outputs
- Contradiction detection: Cross-agent inconsistencies
- Unknown propagation: Cascade unknowns downstream
- Confidence propagation: Quality-based confidence through graph
- Evidence merging: De-duplication and consolidation
"""
from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim, Source
from app.services.intelligence_framework import (
    ContradictionEngine,
    DecisionImpactTracker,
    EvidenceSufficiencyEngine,
    UnknownManager,
)


# ============================================================================
# Contradiction Detection
# ============================================================================


class Contradiction(BaseModel):
    """Represents an inconsistency across agents."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(description="Short title of the contradiction")
    description: str = Field(description="Detailed description of the conflict")
    conflicting_claim_ids: list[str] = Field(
        default_factory=list,
        description="IDs of claims that contradict each other"
    )
    sources: list[tuple[str, str]] = Field(
        default_factory=list,
        description="List of (agent, claim_id) tuples contributing to contradiction"
    )
    severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Severity of the contradiction"
    )
    recommendation: str = Field(
        description="Recommended action to resolve"
    )
    
    class Config:
        extra = "allow"


# ============================================================================
# Unknown & Assumption Tracking
# ============================================================================


class Unknown(BaseModel):
    """Represents an unknown or UNKNOWN-valued finding."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str = Field(description="Category (customer, market, pricing, technical, etc.)")
    description: str = Field(description="What is unknown")
    agent_source: str = Field(description="Which agent identified this unknown")
    claimed_at: str = Field(description="When was this unknown identified (agent name)")
    downstream_impact: list[str] = Field(
        default_factory=list,
        description="List of downstream impacts (e.g., ['pricing', 'revenue', 'burn_rate'])"
    )
    
    class Config:
        extra = "allow"


class Assumption(BaseModel):
    """Represents an assumption (ASSUMED basis)."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    statement: str = Field(description="The assumption")
    agent_source: str = Field(description="Which agent or founder stated this")
    basis_justification: str = Field(description="Why we assume this")
    risk_if_wrong: str = Field(description="Risk if assumption is false")
    validation_method: str = Field(default="", description="How to validate")
    
    class Config:
        extra = "allow"


# ============================================================================
# Shared Reasoning Context
# ============================================================================


class SharedReasoningContext(BaseModel):
    """
    Unified view of all analysis across all agents.
    
    Used by downstream agents to reason collaboratively instead of independently.
    Built once, reused everywhere.
    """
    
    # ========================================================================
    # Metadata
    # ========================================================================
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    idea_description: str = Field(default="", description="The founder's idea")
    structured_idea: dict[str, Any] | None = Field(
        default=None,
        description="Structured idea from Phase 1"
    )
    
    # ========================================================================
    # Phase 2 Intelligence (Research, Competition, Customer)
    # ========================================================================
    research_claims: list[Claim] = Field(
        default_factory=list,
        description="All claims from research agent"
    )
    research_confidence: float = Field(
        default=0.0,
        description="Overall confidence in research findings"
    )
    
    competition_landscape: dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregated competition findings"
    )
    competitors: list[dict[str, Any]] = Field(
        default_factory=list,
        description="All identified competitors with details"
    )
    competition_confidence: float = Field(
        default=0.0,
        description="Overall confidence in competition analysis"
    )
    
    customer_profile: dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregated customer analysis"
    )
    customer_confidence: float = Field(
        default=0.0,
        description="Overall confidence in customer understanding"
    )
    
    # ========================================================================
    # Cross-Phase Intelligence (Market, Business Model)
    # ========================================================================
    market_signals: list[dict[str, Any]] = Field(
        default_factory=list,
        description="All market signal evidence"
    )
    market_exists: Literal["VERIFIED", "INFERRED", "ASSUMED", "UNKNOWN"] = Field(
        default="UNKNOWN",
        description="Whether market exists"
    )
    market_maturity: Literal["NASCENT", "GROWING", "MATURE", "DECLINING", "UNKNOWN"] = Field(
        default="UNKNOWN",
        description="Market maturity level"
    )
    market_confidence: float = Field(
        default=0.0,
        description="Overall confidence in market analysis"
    )
    
    business_model: dict[str, Any] = Field(
        default_factory=dict,
        description="Revenue model, pricing, unit economics"
    )
    revenue_basis: Literal["VERIFIED", "INFERRED", "ASSUMED", "UNKNOWN"] = Field(
        default="UNKNOWN",
        description="Basis for revenue model"
    )
    business_confidence: float = Field(
        default=0.0,
        description="Overall confidence in business model"
    )
    
    # ========================================================================
    # Phase 3 Intelligence (Feasibility, Financial, Risk)
    # ========================================================================
    feasibility_assessment: dict[str, Any] = Field(
        default_factory=dict,
        description="Technical feasibility findings"
    )
    feasibility_confidence: float = Field(
        default=0.0,
        description="Overall confidence in feasibility assessment"
    )
    
    financial_analysis: dict[str, Any] = Field(
        default_factory=dict,
        description="Financial projections and constraints"
    )
    financial_confidence: float = Field(
        default=0.0,
        description="Overall confidence in financial analysis"
    )
    
    risks: list[dict[str, Any]] = Field(
        default_factory=list,
        description="All identified risks across categories"
    )
    critical_risks: list[dict[str, Any]] = Field(
        default_factory=list,
        description="High/critical severity risks"
    )
    risk_confidence: float = Field(
        default=0.0,
        description="Overall confidence in risk assessment"
    )
    
    red_team_findings: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Red team objections and challenges"
    )
    
    # ========================================================================
    # Unified Evidence & Provenance
    # ========================================================================
    all_claims: list[Claim] = Field(
        default_factory=list,
        description="De-duplicated claims from all agents"
    )
    all_sources: list[Source] = Field(
        default_factory=list,
        description="De-duplicated sources from all agents"
    )
    evidence_quality_summary: dict[str, float] = Field(
        default_factory=dict,
        description="Deterministic evidence quality summary keyed by claim id"
    )
    evidence_sufficiency: dict[str, str] = Field(
        default_factory=dict,
        description="Claim-to-evidence classification map" 
    )
    decision_impact_map: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Maps each claim id to a list of downstream decision components"
    )
    
    # ========================================================================
    # Cross-Agent Reasoning
    # ========================================================================
    unknowns: list[Unknown] = Field(
        default_factory=list,
        description="All UNKNOWN values tracked for propagation"
    )
    assumptions: list[Assumption] = Field(
        default_factory=list,
        description="All ASSUMED values requiring validation"
    )
    contradictions: list[Contradiction] = Field(
        default_factory=list,
        description="Inconsistencies across agents"
    )
    
    # ========================================================================
    # Aggregated Confidence
    # ========================================================================
    overall_confidence: float = Field(
        default=0.0,
        description="Overall system confidence (0.0-1.0)"
    )
    confidence_breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Per-component confidence scores"
    )
    unknown_percentage: float = Field(
        default=1.0,
        description="Percentage of critical fields that are UNKNOWN (0.0-1.0)"
    )
    
    # ========================================================================
    # Decision Support
    # ========================================================================
    summary: str = Field(
        default="",
        description="Natural language summary of all findings"
    )
    reasoning_chain: list[str] = Field(
        default_factory=list,
        description="Chain of reasoning across agents"
    )
    evidence_summary: dict[str, list[str] | str | float] = Field(
        default_factory=dict,
        description="Concise, agent-focused evidence summary used downstream"
    )
    top_unknowns: list[Unknown] = Field(
        default_factory=list,
        description="Highest-impact unknowns that should challenge later reasoning"
    )
    top_contradictions: list[Contradiction] = Field(
        default_factory=list,
        description="Highest-impact contradictions to challenge later reasoning"
    )
    highest_risk_assumptions: list[Assumption] = Field(
        default_factory=list,
        description="Highest-risk assumptions to stress test next"
    )
    previous_recommendations: list[str] = Field(
        default_factory=list,
        description="Prior recommendations that later agents must consider"
    )
    
    class Config:
        extra = "allow"


# ============================================================================
# Context Builder
# ============================================================================


def _state_get(state: GraphState | dict[str, Any] | None, key: str, default: Any = None) -> Any:
    """Safely read a field from either a GraphState model or a loose dict."""
    if state is None:
        return default
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def build_shared_reasoning_context(state: GraphState | dict[str, Any] | None) -> SharedReasoningContext:
    """
    Build unified reasoning context from all agent outputs.
    
    This is called once per workflow execution.
    Downstream agents reuse this context instead of re-analyzing.
    
    Args:
        state: Current GraphState with all agent results
        
    Returns:
        SharedReasoningContext with aggregated intelligence
    """
    raw_idea = _state_get(state, "raw_idea") or _state_get(state, "idea_description") or ""
    context = SharedReasoningContext(idea_description=str(raw_idea or ""))

    structured_idea = _state_get(state, "structured_idea")
    if structured_idea is not None:
        if hasattr(structured_idea, "model_dump"):
            context.structured_idea = structured_idea.model_dump()
        elif isinstance(structured_idea, dict):
            context.structured_idea = structured_idea

    # Store raw idea
    if raw_idea:
        context.idea_description = str(raw_idea)
    
    # ========================================================================
    # Phase 2: Research, Competition, Customer
    # ========================================================================
    if state.research_result:
        context.research_claims = state.research_result.claims
        context.research_confidence = _calculate_confidence(state.research_result)
        if state.research_result.sources:
            context.all_sources.extend(state.research_result.sources)
    
    if state.competition_result:
        context.competition_landscape = state.competition_result.findings or {}
        context.competitors = state.competition_result.competitors
        context.competition_confidence = _calculate_confidence(state.competition_result)
        if state.competition_result.claims:
            context.research_claims.extend(state.competition_result.claims)
        if state.competition_result.sources:
            context.all_sources.extend(state.competition_result.sources)
    
    if state.customer_result:
        context.customer_profile = state.customer_result.customer_analysis or {}
        context.customer_confidence = _calculate_confidence(state.customer_result)
        if state.customer_result.claims:
            context.research_claims.extend(state.customer_result.claims)
        if state.customer_result.sources:
            context.all_sources.extend(state.customer_result.sources)
    
    # ========================================================================
    # Phase 3: Market, Business, Feasibility, Financial, Risk
    # ========================================================================
    if state.market_result:
        context.market_signals = state.market_result.market_signals if hasattr(state.market_result, 'market_signals') else []
        if hasattr(state.market_result, 'market_exists'):
            context.market_exists = state.market_result.market_exists
        if hasattr(state.market_result, 'market_maturity'):
            context.market_maturity = state.market_result.market_maturity
        context.market_confidence = _calculate_confidence(state.market_result)
        if state.market_result.claims:
            context.all_claims.extend(state.market_result.claims)
    
    if state.business_model_result:
        context.business_model = state.business_model_result.model_dump()
        context.business_confidence = _calculate_confidence(state.business_model_result)
        if state.business_model_result.claims:
            context.all_claims.extend(state.business_model_result.claims)
    
    if state.feasibility_result:
        context.feasibility_assessment = state.feasibility_result.model_dump()
        context.feasibility_confidence = _calculate_confidence(state.feasibility_result)
        if state.feasibility_result.claims:
            context.all_claims.extend(state.feasibility_result.claims)
    
    if state.financial_result:
        context.financial_analysis = state.financial_result.model_dump()
        context.financial_confidence = _calculate_confidence(state.financial_result)
        if state.financial_result.claims:
            context.all_claims.extend(state.financial_result.claims)
    
    if state.risk_result:
        context.risks = state.risk_result.risks if hasattr(state.risk_result, 'risks') else []
        context.critical_risks = _extract_critical_risks(state.risk_result)
        context.risk_confidence = _calculate_confidence(state.risk_result)
        if state.risk_result.claims:
            context.all_claims.extend(state.risk_result.claims)
    
    if state.red_team_result:
        context.red_team_findings = state.red_team_result.objections if hasattr(state.red_team_result, 'objections') else []
    
    # ========================================================================
    # Consolidation
    # ========================================================================
    
    # De-duplicate claims
    context.all_claims = _deduplicate_claims(context.all_claims)
    
    # De-duplicate sources
    context.all_sources = _deduplicate_sources(context.all_sources)

    # Production Intelligence Framework integration
    for claim in context.all_claims:
        claim_id = getattr(claim, "id", None) or str(id(claim))
        quality = EvidenceSufficiencyEngine.evaluate_quality(claim)
        context.evidence_quality_summary[claim_id] = quality.confidence_score
        context.evidence_sufficiency[claim_id] = EvidenceSufficiencyEngine.classify_claim(claim)
        context.decision_impact_map[claim_id] = [impact.component for impact in DecisionImpactTracker.from_claim(claim)]
    
    # Extract unknowns
    context.unknowns = _extract_unknowns(context)
    
    # Extract assumptions
    context.assumptions = _extract_assumptions(context)
    
    # Detect contradictions
    context.contradictions = detect_contradictions(context)
    context.contradictions.extend(ContradictionEngine.detect_from_claims(context.all_claims))

    # Build collaborative intelligence summaries used by downstream agents
    context.evidence_summary = _build_evidence_summary(context)
    context.top_unknowns = sorted(context.unknowns, key=lambda u: len(u.downstream_impact), reverse=True)[:5]
    context.top_contradictions = sorted(context.contradictions, key=lambda c: {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(c.severity, 0), reverse=True)[:5]
    context.highest_risk_assumptions = sorted(context.assumptions, key=lambda a: len(a.statement), reverse=True)[:5]
    context.previous_recommendations = [
        f"Challenge the current {item.category} assumption with direct evidence before committing resources."
        for item in context.top_unknowns[:3]
    ]
    context.reasoning_chain = [
        "Research established the known facts and strongest evidence.",
        "Competition and customer analysis challenged the default assumptions.",
        "Market and business model logic stress-tested viability and pricing.",
        "Risk and red-team reasoning attacked the remaining blind spots.",
        "Validation translates unresolved uncertainty into experiments."
    ]
    
    # Calculate aggregated confidence
    context.overall_confidence = _calculate_overall_confidence(context)
    context.confidence_breakdown = _calculate_confidence_breakdown(context)
    context.unknown_percentage = len(context.unknowns) / max(1, len(context.all_claims))
    
    logger.info(
        f"Built shared reasoning context: "
        f"claims={len(context.all_claims)}, "
        f"sources={len(context.all_sources)}, "
        f"unknowns={len(context.unknowns)}, "
        f"contradictions={len(context.contradictions)}, "
        f"confidence={context.overall_confidence:.2f}"
    )
    
    return context


# ============================================================================
# Contradiction Detection
# ============================================================================


def detect_contradictions(context: SharedReasoningContext) -> list[Contradiction]:
    """
    Detect inconsistencies across agent findings.
    
    Examples:
    - Customer: Enterprise | Business: $5/month
    - Market: Small niche | Financial: $500M ARR Y2
    - Competition: Enterprise tools | Pricing: $5/month
    """
    contradictions: list[Contradiction] = []
    
    # Check 1: Customer vs Business Model
    if context.customer_profile and context.business_model:
        customer_type = context.customer_profile.get("primary_customer", "").lower()
        pricing = context.business_model.get("pricing_assumptions", [])
        
        if "enterprise" in customer_type and pricing:
            for price_item in pricing:
                price_str = str(price_item).lower()
                if any(low in price_str for low in ["free", "$5", "$10", "$20"]):
                    contradictions.append(Contradiction(
                        title="Customer vs Pricing Model Mismatch",
                        description=f"Enterprise customers ({customer_type}) typically pay $50k-500k/year, but pricing model shows {price_item}",
                        conflicting_claim_ids=[],
                        sources=[("customer_agent", "primary_customer"), ("business_model_agent", "pricing")],
                        severity="high",
                        recommendation="Align pricing with customer type: either shift to SMB/startup market or increase pricing to enterprise levels"
                    ))
    
    # Check 2: Market size vs Financial projections
    if context.market_signals and context.financial_analysis:
        market_desc = str(context.market_signals).lower()
        revenue = context.financial_analysis.get("year1_revenue", {})
        
        if "niche" in market_desc or "small" in market_desc:
            revenue_value = str(revenue).lower()
            if any(large in revenue_value for large in ["million", "billion", "$500m", "$1b"]):
                contradictions.append(Contradiction(
                    title="Market Size vs Revenue Projection Mismatch",
                    description=f"Market described as small/niche but revenue projections show large figures",
                    conflicting_claim_ids=[],
                    sources=[("market_agent", "signals"), ("financial_agent", "revenue")],
                    severity="high",
                    recommendation="Clarify: either market is larger than characterized, or revenue projections are too optimistic"
                ))
    
    # Check 3: Unknowns in critical fields
    unknown_categories = {u.category for u in context.unknowns}
    if "customer" in unknown_categories and "pricing" not in unknown_categories:
        contradictions.append(Contradiction(
            title="Unknown Customer but Known Pricing",
            description="Cannot determine pricing strategy without understanding who the customer is",
            conflicting_claim_ids=[],
            sources=[("customer_agent", "unknown"), ("business_model_agent", "known")],
            severity="medium",
            recommendation="Resolve customer profile before finalizing pricing"
        ))
    
    return contradictions


# ============================================================================
# Unknown & Assumption Extraction
# ============================================================================


def _build_evidence_summary(context: SharedReasoningContext) -> dict[str, list[str] | str | float]:
    """Agent-facing evidence summary for downstream challenge logic."""
    strongest = []
    weakest = []
    for claim in context.all_claims:
        statement = claim.claim_text.strip()
        if not statement:
            continue
        if claim.confidence is not None and claim.confidence >= 0.7:
            strongest.append(statement)
        elif claim.confidence is not None and claim.confidence < 0.4:
            weakest.append(statement)

    return {
        "strongest_claims": strongest[:5],
        "weakest_claims": weakest[:5],
        "gaps": [u.description for u in context.top_unknowns[:5]] if hasattr(context, "top_unknowns") else [u.description for u in context.unknowns[:5]],
        "overall_confidence": context.overall_confidence if context.all_claims else 0.0,
    }


def build_agent_brief(context: SharedReasoningContext, agent_name: str) -> dict[str, Any]:
    """Get the evidence, uncertainty, contradiction, and challenge brief for a specific downstream agent."""
    unknowns = collect_unknowns_for_agent(context, agent_name)
    contradictions = get_relevant_contradictions(context, agent_name)
    assumptions = [
        item for item in context.assumptions
        if item.agent_source in {agent_name, "founder", "unknown"}
    ] or context.assumptions[:3]

    challenge = []
    if unknowns:
        challenge.append(f"The biggest unresolved question is: {unknowns[0].description}.")
    if contradictions:
        challenge.append(f"The clearest challenge is: {contradictions[0].title}.")
    if not challenge:
        challenge.append("No critical contradiction or unknown remains; the remaining work is validation and execution discipline.")

    decision_impact = []
    for claim in context.all_claims:
        impact = claim.decision_impact if hasattr(claim, "decision_impact") else []
        for item in impact:
            if isinstance(item, dict):
                decision_impact.append(item.get("component", "Decision"))
            else:
                decision_impact.append(getattr(item, "component", "Decision"))

    return {
        "evidence_summary": context.evidence_summary,
        "top_unknowns": unknowns[:5],
        "top_contradictions": contradictions[:5],
        "highest_risk_assumptions": assumptions[:5],
        "decision_impact": sorted(set(decision_impact))[:10],
        "challenge": " ".join(challenge),
        "previous_recommendations": context.previous_recommendations[:5],
    }


def _extract_unknowns(context: SharedReasoningContext) -> list[Unknown]:
    """Extract all UNKNOWN values that may impact downstream decisions."""
    unknowns: list[Unknown] = []
    
    # Market
    if context.market_exists == "UNKNOWN":
        unknowns.append(Unknown(
            category="market",
            description="Market existence unconfirmed",
            agent_source="market_agent",
            claimed_at="market_exists",
            downstream_impact=["business_model", "financial", "decision"]
        ))
    
    # Revenue
    if context.business_model.get("revenue_basis") == "UNKNOWN":
        unknowns.append(Unknown(
            category="pricing",
            description="Revenue model unclear",
            agent_source="business_model_agent",
            claimed_at="revenue_model",
            downstream_impact=["financial", "risk", "decision"]
        ))
    
    # Customer
    if not context.customer_profile or context.customer_profile.get("primary_customer") == "unknown":
        unknowns.append(Unknown(
            category="customer",
            description="Primary customer not identified",
            agent_source="customer_agent",
            claimed_at="primary_customer",
            downstream_impact=["business_model", "market", "financial", "decision"]
        ))
    
    # Check claims for UNKNOWN status
    for claim in context.all_claims:
        if claim.status == "unknown":
            unknowns.append(Unknown(
                category=claim.claim_type,
                description=claim.claim_text,
                agent_source=claim.provenance.get("agent", "unknown"),
                claimed_at=claim.id or "unknown",
                downstream_impact=[]
            ))
    
    return unknowns


def _extract_assumptions(context: SharedReasoningContext) -> list[Assumption]:
    """Extract all ASSUMED values requiring validation."""
    assumptions: list[Assumption] = []
    
    # From structured idea
    if context.structured_idea:
        idea = context.structured_idea
        if idea.get("business_model"):
            assumptions.append(Assumption(
                statement=f"Business model is {idea['business_model']}",
                agent_source="founder",
                basis_justification="Stated by founder",
                risk_if_wrong="Wrong revenue model could invalidate entire business plan",
                validation_method="Customer discovery and competitive analysis"
            ))
    
    # From claims with ASSUMED basis
    for claim in context.all_claims:
        if claim.status == "hypothesis" or claim.confidence and claim.confidence < 0.5:
            assumptions.append(Assumption(
                statement=claim.claim_text,
                agent_source=claim.provenance.get("agent", "unknown"),
                basis_justification=f"Inference with confidence {claim.confidence}",
                risk_if_wrong=f"If {claim.claim_text} is false, analysis must be reconsidered",
                validation_method="Primary research"
            ))
    
    return assumptions


# ============================================================================
# Confidence Calculation
# ============================================================================


def _calculate_confidence(result: Any) -> float:
    """
    Calculate confidence in a result based on status and claims.
    
    success + many claims + verified = high confidence
    partial + few claims + inferred = low confidence
    failed = very low confidence
    """
    if not hasattr(result, 'status'):
        return 0.0
    
    base_score = {
        "success": 0.8,
        "partial": 0.5,
        "failed": 0.1,
    }.get(result.status, 0.0)
    
    # Boost for verified claims
    if hasattr(result, 'claims') and result.claims:
        verified_count = sum(1 for c in result.claims if c.status == "supported")
        inference_count = sum(1 for c in result.claims if c.status == "inference")
        
        adjustment = (verified_count / len(result.claims)) * 0.3
        base_score += adjustment
        
        # Slight reduction for many inferences
        if inference_count > verified_count:
            base_score -= 0.1
    
    return min(1.0, max(0.0, base_score))


def _calculate_overall_confidence(context: SharedReasoningContext) -> float:
    """
    Calculate system-wide confidence.
    
    Weighted average of component confidences:
    - Market existence: 15%
    - Customer: 15%
    - Business model: 15%
    - Financial: 15%
    - Feasibility: 10%
    - Risk: 10%
    - No contradictions: 10%
    - Few unknowns: 10%
    """
    weights = {
        "market": (context.market_confidence, 0.15),
        "customer": (context.customer_confidence, 0.15),
        "business": (context.business_confidence, 0.15),
        "financial": (context.financial_confidence, 0.15),
        "feasibility": (context.feasibility_confidence, 0.10),
        "risk": (context.risk_confidence, 0.10),
    }
    
    total = sum(conf * weight for conf, weight in weights.values())
    
    # Penalty for contradictions
    contradiction_penalty = len(context.contradictions) * 0.05
    total -= contradiction_penalty
    
    # Penalty for unknowns
    unknown_penalty = context.unknown_percentage * 0.10
    total -= unknown_penalty
    
    return min(1.0, max(0.0, total))


def _calculate_confidence_breakdown(context: SharedReasoningContext) -> dict[str, float]:
    """Return per-component confidence scores."""
    return {
        "research": context.research_confidence,
        "competition": context.competition_confidence,
        "customer": context.customer_confidence,
        "market": context.market_confidence,
        "business_model": context.business_confidence,
        "feasibility": context.feasibility_confidence,
        "financial": context.financial_confidence,
        "risk": context.risk_confidence,
        "overall": context.overall_confidence,
    }


# ============================================================================
# Claim & Source Management
# ============================================================================


def _deduplicate_claims(claims: list[Claim]) -> list[Claim]:
    """Remove duplicate claims, preferring VERIFIED over INFERRED."""
    seen: dict[str, Claim] = {}
    
    for claim in claims:
        key = claim.claim_text.lower().strip()
        
        if key not in seen:
            seen[key] = claim
        else:
            # Prefer verified over inference
            existing = seen[key]
            if claim.status == "supported" and existing.status != "supported":
                seen[key] = claim
            # Prefer higher confidence
            elif claim.confidence and existing.confidence:
                if claim.confidence > existing.confidence:
                    seen[key] = claim
    
    return list(seen.values())


def _deduplicate_sources(sources: list[Source]) -> list[Source]:
    """Remove duplicate sources by URL."""
    seen: dict[str, Source] = {}
    
    for source in sources:
        url = (source.url or "").strip()
        
        if url and url not in seen:
            seen[url] = source
        elif not url and len(seen) < 100:  # Keep some unnamed sources
            seen[str(uuid.uuid4())] = source
    
    return list(seen.values())


def _extract_critical_risks(risk_result: Any) -> list[dict[str, Any]]:
    """Extract high/critical severity risks."""
    if not hasattr(risk_result, 'risks'):
        return []
    
    critical = []
    for risk in risk_result.risks:
        if isinstance(risk, dict):
            severity = risk.get("severity", "").lower()
        else:
            severity = getattr(risk, "severity", "").lower()
        
        if severity in ("critical", "high"):
            critical.append(risk if isinstance(risk, dict) else risk.model_dump())
    
    return critical


# ============================================================================
# Helpers for Downstream Agents
# ============================================================================


def collect_upstream_claims(
    context: SharedReasoningContext,
    claim_types: list[str] | None = None,
) -> list[Claim]:
    """
    Collect relevant upstream claims for an agent.
    
    Args:
        context: SharedReasoningContext
        claim_types: List of claim types to filter (e.g., ["customer_need", "pricing"])
        
    Returns:
        Filtered claims
    """
    if not claim_types:
        return context.all_claims
    
    return [c for c in context.all_claims if c.claim_type in claim_types]


def collect_unknowns_for_agent(
    context: SharedReasoningContext,
    agent_name: str,
) -> list[Unknown]:
    """
    Get unknowns relevant to a specific agent.
    
    Args:
        context: SharedReasoningContext
        agent_name: Name of agent (e.g., "financial_agent")
        
    Returns:
        Unknowns that impact this agent
    """
    unknowns = []
    
    for unknown in context.unknowns:
        # Check if this agent is downstream of the unknown's source
        if agent_name in unknown.downstream_impact or not unknown.downstream_impact:
            unknowns.append(unknown)
    
    return unknowns


def get_relevant_contradictions(
    context: SharedReasoningContext,
    agent_name: str,
) -> list[Contradiction]:
    """
    Get contradictions relevant to a specific agent.
    
    Args:
        context: SharedReasoningContext
        agent_name: Name of agent
        
    Returns:
        Relevant contradictions
    """
    relevant = []
    
    for contra in context.contradictions:
        # Check if this agent is involved
        agent_sources = [src[0] for src in contra.sources]
        if agent_name in agent_sources or agent_name.replace("_agent", "") in str(contra.description).lower():
            relevant.append(contra)
    
    return relevant


def should_validate_more(context: SharedReasoningContext) -> bool:
    """
    Determine if more validation is needed based on reasoning quality.
    
    Returns True if:
    - High unknown percentage
    - Critical contradictions
    - Low overall confidence
    - Many assumptions
    """
    if context.unknown_percentage > 0.3:
        return True
    
    if any(c.severity in ("critical", "high") for c in context.contradictions):
        return True
    
    if context.overall_confidence < 0.5:
        return True
    
    if len(context.assumptions) > 5:
        return True
    
    return False
