"""Risk Analysis Agent (Phase 3).

Every evidence-backed risk carries evidence_ids. Risks with no evidence are
always classified INFERENCE or HYPOTHESIS - never presented as FACT.

Wave 2 Enhancement: 
- Consumes shared reasoning context from all agents
- Converts contradictions to risks
- Propagates unknowns as validation risks
- Accounts for low confidence as execution risk
"""
from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.evidence import Claim
from app.schemas.phase3 import RiskItem, RiskResult
from app.services.agent_services import analyze_risk_with_llm
from app.services.collaborative_reasoning import (
    build_shared_reasoning_context,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
)
from app.services.llm_provider import get_llm_provider


def _classification_for_claim_status(status: str) -> str:
    return {
        "supported": "FACT",
        "inference": "INFERENCE",
    }.get(status, "HYPOTHESIS")


def _collect_relevant_claims(state: GraphState) -> list[Claim]:
    claims: list[Claim] = []
    for result in (
        state.research_result,
        state.competition_result,
        state.customer_result,
        state.market_result,
        state.business_model_result,
        state.feasibility_result,
        state.financial_result,
    ):
        if result is not None:
            claims.extend(getattr(result, "claims", []))
    return claims


def _match_claim_evidence(risk_text: str, claims: list[Claim]) -> tuple[list[str], list[str], str]:
    matched: list[Claim] = []
    risk_lower = (risk_text or "").lower()
    for claim in claims:
        claim_text = (claim.claim_text or "").lower()
        if not claim_text:
            continue
        if claim_text in risk_lower or risk_lower in claim_text or claim.claim_type.lower() in risk_lower:
            matched.append(claim)
    evidence_ids = [e.id for claim in matched for e in claim.evidence_items if e.id]
    claim_ids = [claim.id for claim in matched if claim.id]
    if matched and any(c.status == "supported" for c in matched):
        return evidence_ids, claim_ids, "FACT"
    if evidence_ids:
        return evidence_ids, claim_ids, "INFERENCE"
    return evidence_ids, claim_ids, "HYPOTHESIS"


def _risk_from_negative_claim(claim: Claim) -> RiskItem | None:
    """Turn a hypothesis/inference-status claim into a corresponding risk:
    the claim itself represents an unresolved uncertainty."""
    category_map = {
        "market_size": "MARKET",
        "market_trend": "MARKET",
        "technology_trend": "TECHNICAL",
        "demand_signal": "CUSTOMER",
        "customer_need": "CUSTOMER",
        "competitive_advantage": "COMPETITION",
        "pricing": "FINANCIAL",
        "regulatory": "REGULATORY",
        "other": "OPERATIONAL",
    }
    category = category_map.get(claim.claim_type, "OPERATIONAL")
    classification = _classification_for_claim_status(claim.status)
    if classification == "FACT":
        # A "supported" claim is not itself a risk - nothing negative to flag.
        return None

    severity = "MEDIUM" if classification == "INFERENCE" else "LOW"
    likelihood = "MEDIUM" if classification == "INFERENCE" else "UNKNOWN"

    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"Unresolved/unverified: {claim.claim_text}",
        category=category,
        severity=severity,
        likelihood=likelihood,
        impact="Could materially affect the underlying assumption if the claim proves false.",
        classification=classification,
        evidence_ids=[e.id for e in claim.evidence_items if e.id],
        claim_ids=[claim.id] if claim.id else [],
        mitigation="Run a targeted validation step to confirm or refute this claim before committing further resources.",
        falsification_criteria=f"This risk is resolved if independent evidence contradicts or confirms: '{claim.claim_text}'",
    )


def _risk_for_missing_component(name: str, errors: list[str]) -> RiskItem:
    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"The {name} analysis component failed or is unavailable, leaving a decision-relevant gap.",
        category="OPERATIONAL",
        severity="HIGH" if name in {"research", "customer"} else "MEDIUM",
        likelihood="HIGH",
        impact=f"Founder Decision Brief cannot be fully evidence-grounded without {name} findings.",
        classification="HYPOTHESIS",
        evidence_ids=[],
        claim_ids=[],
        mitigation=f"Re-run or manually supply {name} findings before proceeding to BUILD.",
        falsification_criteria=f"Resolved once the {name} agent completes successfully.",
    )


def _risk_for_unknown(unknown: str) -> RiskItem:
    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"Unresolved unknown from idea structuring: {unknown}",
        category="PRODUCT",
        severity="MEDIUM",
        likelihood="UNKNOWN",
        impact="Blocks a fully-informed BUILD decision until clarified.",
        classification="HYPOTHESIS",
        evidence_ids=[],
        claim_ids=[],
        mitigation="Clarify with the founder or validate directly with prospective customers.",
        falsification_criteria=f"Resolved once '{unknown}' is explicitly answered.",
    )


def _risk_from_contradiction(contradiction: Any) -> RiskItem:
    """Convert a contradiction into an operational/execution risk."""
    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"Contradiction: {contradiction.title} - {contradiction.description}",
        category="OPERATIONAL",
        severity=contradiction.severity.upper() if contradiction.severity else "MEDIUM",
        likelihood="HIGH",
        impact=f"Conflicting claims could invalidate downstream analysis and decisions.",
        classification="INFERENCE",
        evidence_ids=[],
        claim_ids=contradiction.conflicting_claim_ids,
        mitigation=contradiction.recommendation if contradiction.recommendation else "Investigate and resolve the contradiction before proceeding.",
        falsification_criteria=f"Resolved once: {contradiction.recommendation}",
    )


def _risk_from_unknown_propagation(unknown: Any) -> RiskItem:
    """Convert an unknown into a validation risk."""
    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"Unknown {unknown.category}: {unknown.description}",
        category="PRODUCT" if unknown.category == "customer" else "OPERATIONAL",
        severity="HIGH" if unknown.downstream_impact else "MEDIUM",
        likelihood="HIGH",
        impact=f"Missing {unknown.category} information impacts: {', '.join(unknown.downstream_impact[:3])}",
        classification="HYPOTHESIS",
        evidence_ids=[],
        claim_ids=[],
        mitigation=f"Validate {unknown.category} through targeted experiments before downstream decisions.",
        falsification_criteria=f"Resolved once {unknown.category} is known.",
    )


def _risk_from_low_confidence(component: str, confidence: float) -> RiskItem | None:
    """Convert low confidence in a component into an execution risk."""
    if confidence >= 0.6:
        return None
    
    severity = "CRITICAL" if confidence < 0.3 else "HIGH" if confidence < 0.5 else "MEDIUM"
    
    return RiskItem(
        id=str(uuid.uuid4()),
        risk_statement=f"Low confidence in {component} analysis ({confidence:.0%})",
        category="OPERATIONAL",
        severity=severity,
        likelihood="HIGH",
        impact=f"Low confidence in {component} could lead to strategic mis-steps.",
        classification="INFERENCE",
        evidence_ids=[],
        claim_ids=[],
        mitigation=f"Gather additional evidence for {component} before major commitments.",
        falsification_criteria=f"Resolved once {component} confidence exceeds 60%.",
    )


async def risk_agent(state: GraphState) -> dict[str, Any]:
    """
    Risk Analysis Agent with collaborative reasoning.
    
    Identifies risks from:
    - Missing or failed upstream analysis
    - Unverified claims (INFERENCE/HYPOTHESIS)
    - Contradictions across agents
    - Unknown values propagating downstream
    - Low confidence in critical components
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "risk_status": "failed",
                "risk_errors": ["No structured idea available; cannot assess risk."],
            }

        # Build shared reasoning context for full system view
        context = build_shared_reasoning_context(state)

        risks: list[RiskItem] = []

        # ====================================================================
        # 1. Risks from missing upstream components
        # ====================================================================
        for name, result, status, errors in (
            ("research", state.research_result, state.research_status, state.research_errors),
            ("competition", state.competition_result, state.competition_status, state.competition_errors),
            ("customer", state.customer_result, state.customer_status, state.customer_errors),
        ):
            if status == "failed" or result is None:
                risks.append(_risk_for_missing_component(name, errors))
                continue
            for claim in result.claims:
                risk = _risk_from_negative_claim(claim)
                if risk is not None:
                    risks.append(risk)

        # ====================================================================
        # 2. Risks from structured idea unknowns
        # ====================================================================
        for unknown in idea.unknowns:
            risks.append(_risk_for_unknown(unknown))

        # ====================================================================
        # 3. Risks from contradictions and unknown propagation
        # ====================================================================
        for contradiction in context.contradictions:
            risks.append(_risk_from_contradiction(contradiction))
            logger.debug(f"Risk from contradiction: {contradiction.title} (severity={contradiction.severity})")

        context_unknowns = collect_unknowns_for_agent(context, "risk_agent")
        for unknown in context_unknowns:
            risks.append(_risk_from_unknown_propagation(unknown))
            logger.debug(f"Risk from unknown propagation: {unknown.category}")

        # ====================================================================
        # 4. Risks from low confidence
        # ====================================================================
        for component, confidence in context.confidence_breakdown.items():
            if component != "overall" and confidence < 0.6:
                risk = _risk_from_low_confidence(component, confidence)
                if risk:
                    risks.append(risk)
                    logger.debug(f"Risk from low confidence: {component} ({confidence:.0%})")

        # Use the LLM as the primary source of additional risk reasoning; keep deterministic
        # findings only as a conservative baseline when the provider is unavailable.
        relevant_claims = _collect_relevant_claims(state)
        try:
            llm_analysis = await analyze_risk_with_llm(
                idea_text=state.raw_idea or "",
                market_context=(idea.industry_category or "general market") + (f"; customer={idea.target_customer}" if idea.target_customer else ""),
                llm_provider=get_llm_provider(),
            )
            if llm_analysis.get("status") == "success":
                for raw_risk in llm_analysis.get("risks", []):
                    raw_category = (raw_risk.category or "operational").lower()
                    category_map = {
                        "market": "MARKET",
                        "customer": "CUSTOMER",
                        "competition": "COMPETITION",
                        "technical": "TECHNICAL",
                        "financial": "FINANCIAL",
                        "regulatory": "REGULATORY",
                        "operational": "OPERATIONAL",
                        "product": "PRODUCT",
                    }
                    evidence_ids, claim_ids, classification = _match_claim_evidence(raw_risk.risk_statement, relevant_claims)
                    if not evidence_ids and raw_risk.category:
                        evidence_ids = []
                    risks.append(RiskItem(
                        risk_statement=raw_risk.risk_statement,
                        category=category_map.get(raw_category, "OPERATIONAL"),
                        severity=(raw_risk.severity or "MEDIUM").upper(),
                        likelihood=(raw_risk.likelihood or "UNKNOWN").upper(),
                        impact=raw_risk.impact or "Could materially affect execution.",
                        classification=classification,
                        evidence_ids=evidence_ids,
                        claim_ids=claim_ids,
                        mitigation=raw_risk.mitigation_strategy or "Validate before scaling.",
                        falsification_criteria=f"This risk is resolved once the relevant condition is proven or disproven: {raw_risk.risk_statement}",
                    ))
        except Exception:
            logger.warning("LLM risk enrichment unavailable; using deterministic risk assessment.", exc_info=True)

        critical_ids = [r.id for r in risks if r.severity == "CRITICAL" and r.id]
        status = "success" if risks else "partial"
        result_obj = RiskResult(
            status=status,
            risks=risks,
            critical_unresolved_risk_ids=critical_ids,
        )

        logger.info(
            f"Risk analysis completed: {result_obj.status} ({len(risks)} risk(s)) "
            f"(contradictions={len(context.contradictions)}, "
            f"unknowns={len(context_unknowns)}, "
            f"avg_confidence={context.overall_confidence:.2f})"
        )

        return {
            "risk_result": result_obj,
            "risk_status": result_obj.status,
            "risk_errors": result_obj.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Risk agent failed")
        return {
            "risk_status": "failed",
            "risk_errors": [f"Risk agent failed: {exc}"],
        }
