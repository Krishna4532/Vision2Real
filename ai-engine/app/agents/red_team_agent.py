"""Red Team Agent (Phase 3).

Actively attempts to disprove the idea by interrogating assumptions across
customer adoption, market, competition, product, technical, business-model,
operational, regulatory, and execution dimensions - consuming the outputs of
Synthesis, Business Model, Feasibility, Market, and Risk (so it must run
AFTER those, unlike them it is not merely another parallel data-gathering
step; it is a deliberately adversarial second pass over their conclusions).

Every finding is classified FACT/INFERENCE/HYPOTHESIS (reusing
RiskClassification - see schemas/phase3.py) and never presented as fact
without evidence_ids. This agent is deterministic/template-based like the
other Phase 3 agents, specifically so its adversarial reasoning can never be
softened by an LLM - it always raises the objection warranted by the data.

Wave 2 Enhancement:
- Consumes shared reasoning context for full system awareness
- Attacks business model contradictions detected automatically
- Challenges unknowns as validation risks
- Uses confidence scores to intensity red teaming
"""
from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.phase3 import BusinessModelResult, FeasibilityResult, MarketResult, RedTeamFinding, RedTeamResult, RiskResult, SynthesisResult
from app.services.agent_services import analyze_red_team_with_llm
from app.services.collaborative_reasoning import (
    build_shared_reasoning_context,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
)
from app.services.llm_provider import get_llm_provider


def _classification_for_basis(basis: str) -> str:
    return {"VERIFIED": "FACT", "INFERRED": "INFERENCE", "ASSUMED": "HYPOTHESIS"}.get(basis, "HYPOTHESIS")


def _finding(
    assumption: str,
    objection: str,
    category: str,
    severity: str,
    classification: str,
    falsification: str,
    evidence_ids: list[str] | None = None,
    claim_ids: list[str] | None = None,
    fatal: bool = False,
) -> RedTeamFinding:
    return RedTeamFinding(
        id=str(uuid.uuid4()),
        assumption_challenged=assumption,
        objection=objection,
        category=category,
        severity=severity,
        classification=classification,
        evidence_ids=evidence_ids or [],
        claim_ids=claim_ids or [],
        falsification_criteria=falsification,
        is_potentially_fatal=fatal,
    )


def _challenge_customer_adoption(state: GraphState, missing: list[str]) -> list[RedTeamFinding]:
    findings: list[RedTeamFinding] = []
    idea = state.structured_idea

    if not idea.target_customer or idea.target_customer.lower() == "unknown":
        missing.append("identity of the target customer")
        findings.append(_finding(
            assumption="A specific target customer exists and can be reached.",
            objection="The target customer is unknown; adoption cannot be assessed for an undefined audience.",
            category="CUSTOMER_ADOPTION",
            severity="CRITICAL",
            classification="HYPOTHESIS",
            falsification="Resolved once a specific, named target customer segment is identified.",
            fatal=True,
        ))
        return findings

    if state.customer_result is None or state.customer_status == "failed":
        missing.append("customer adoption evidence")
        findings.append(_finding(
            assumption=f"'{idea.target_customer}' will adopt this product.",
            objection="No customer analysis is available at all to support the adoption assumption.",
            category="CUSTOMER_ADOPTION",
            severity="CRITICAL",
            classification="HYPOTHESIS",
            falsification="Resolved once customer analysis runs successfully and produces adoption signal.",
            fatal=True,
        ))
        return findings

    adoption_claims = [c for c in state.customer_result.claims if c.claim_type in {"demand_signal", "customer_need"}]
    if not adoption_claims:
        missing.append("evidence of customer willingness to adopt")
        findings.append(_finding(
            assumption=f"'{idea.target_customer}' will adopt this product.",
            objection="No demand-signal or customer-need claims were produced; adoption is entirely unsupported.",
            category="CUSTOMER_ADOPTION",
            severity="HIGH",
            classification="HYPOTHESIS",
            falsification="Resolved via real customer interviews/surveys showing willingness to adopt.",
            fatal=False,
        ))
    else:
        best_status = max((c.status for c in adoption_claims), key=lambda s: {"supported": 2, "inference": 1}.get(s, 0))
        classification = {"supported": "FACT", "inference": "INFERENCE"}.get(best_status, "HYPOTHESIS")
        if classification != "FACT":
            evidence_ids = [e.id for c in adoption_claims for e in c.evidence_items if e.id]
            claim_ids = [c.id for c in adoption_claims if c.id]
            findings.append(_finding(
                assumption=f"'{idea.target_customer}' will adopt this product.",
                objection="Adoption is currently supported only by hypothesis/inference-grade claims, not verified demand.",
                category="CUSTOMER_ADOPTION",
                severity="MEDIUM" if classification == "INFERENCE" else "HIGH",
                classification=classification,
                evidence_ids=evidence_ids,
                claim_ids=claim_ids,
                falsification="Resolved via a real pilot, letter of intent, or paid signup from the target customer.",
            ))

    return findings


def _match_finding_evidence(finding_text: str, claims: list[Any]) -> tuple[list[str], list[str], str]:
    text = (finding_text or "").lower()
    matched = []
    for claim in claims:
        ctext = (getattr(claim, "claim_text", "") or "").lower()
        if ctext and (ctext in text or text in ctext or getattr(claim, "claim_type", "").lower() in text):
            matched.append(claim)
    evidence_ids = [e.id for claim in matched for e in getattr(claim, "evidence_items", []) if e.id]
    claim_ids = [claim.id for claim in matched if claim.id]
    statuses = [getattr(claim, "status", "hypothesis") for claim in matched]
    if any(status == "supported" for status in statuses):
        return evidence_ids, claim_ids, "FACT"
    if evidence_ids:
        return evidence_ids, claim_ids, "INFERENCE"
    return evidence_ids, claim_ids, "HYPOTHESIS"


def _challenge_market(market: MarketResult | None, missing: list[str]) -> list[RedTeamFinding]:
    if market is None:
        missing.append("market/industry analysis")
        return [_finding(
            assumption="A viable market exists for this idea.",
            objection="No market/industry analysis is available to support that a market exists at all.",
            category="MARKET",
            severity="CRITICAL",
            classification="HYPOTHESIS",
            falsification="Resolved once market analysis runs successfully.",
            fatal=True,
        )]
    if market.market_exists in {"UNKNOWN", "ASSUMED"}:
        missing.append("verified evidence that a distinct market exists")
        supporting = [s for s in market.signals if s.basis in {"VERIFIED", "INFERRED"}]
        evidence_ids = [eid for s in supporting for eid in s.evidence_ids]
        claim_ids = [cid for s in supporting for cid in s.claim_ids]
        return [_finding(
            assumption="A distinct, addressable market exists for this idea.",
            objection=f"Market existence is only {market.market_exists.lower()}, not independently verified.",
            category="MARKET",
            severity="HIGH" if market.market_exists == "UNKNOWN" else "MEDIUM",
            classification=_classification_for_basis(market.market_exists) if market.market_exists != "UNKNOWN" else "HYPOTHESIS",
            evidence_ids=evidence_ids,
            claim_ids=claim_ids,
            falsification="Resolved via independent market research confirming demand at scale.",
        )]
    return []


def _challenge_competition(state: GraphState) -> list[RedTeamFinding]:
    if state.competition_result is None:
        return []
    comp_claims = [c for c in state.competition_result.claims if c.claim_type == "competitive_advantage"]
    if not comp_claims:
        return []
    if all(c.status == "hypothesis" for c in comp_claims):
        return [_finding(
            assumption="This idea has a durable competitive advantage over existing alternatives.",
            objection="Claimed competitive advantages are hypothesis-grade illustrative claims, not verified differentiation.",
            category="COMPETITION",
            severity="MEDIUM",
            classification="HYPOTHESIS",
            claim_ids=[c.id for c in comp_claims if c.id],
            falsification="Resolved via head-to-head evaluation or customer preference testing against named competitors.",
        )]
    return []


def _challenge_product_and_technical(feasibility: FeasibilityResult | None, missing: list[str]) -> list[RedTeamFinding]:
    findings: list[RedTeamFinding] = []
    if feasibility is None:
        missing.append("product & feasibility analysis")
        findings.append(_finding(
            assumption="The product is well-defined and technically feasible.",
            objection="No feasibility analysis is available at all.",
            category="PRODUCT",
            severity="CRITICAL",
            classification="HYPOTHESIS",
            falsification="Resolved once feasibility analysis runs successfully.",
            fatal=True,
        ))
        return findings

    if feasibility.product.basis in {"ASSUMED", "UNKNOWN"}:
        findings.append(_finding(
            assumption="The proposed core product genuinely solves the stated problem.",
            objection="The product definition is founder-asserted and has not been validated with real users.",
            category="PRODUCT",
            severity="MEDIUM",
            classification="HYPOTHESIS",
            falsification="Resolved via usability testing or a working prototype validated with target users.",
        ))

    unresolved = [a for a in feasibility.category_assessments if a.level == "UNKNOWN"]
    if unresolved:
        missing.append("technical feasibility evidence for: " + ", ".join(a.category for a in unresolved))
        findings.append(_finding(
            assumption="All major technical dependencies are understood and feasible.",
            objection=f"{len(unresolved)} feasibility categor(y/ies) remain UNKNOWN: {', '.join(a.category for a in unresolved)}.",
            category="TECHNICAL",
            severity="MEDIUM",
            classification="HYPOTHESIS",
            falsification="Resolved once each UNKNOWN category has a documented, evidence-backed assessment.",
        ))

    if feasibility.technical_feasibility == "LOW":
        findings.append(_finding(
            assumption="The product can be built with reasonable technical effort.",
            objection="Aggregate technical feasibility assessment is LOW - the hardest constraint dominates.",
            category="TECHNICAL",
            severity="HIGH",
            # No specific claim/evidence backs this meta-conclusion (it is
            # derived from the aggregate feasibility rating, not a cited
            # claim), so it must be HYPOTHESIS, not INFERENCE - INFERENCE is
            # reserved for findings that actually carry evidence_ids.
            classification="HYPOTHESIS",
            falsification="Resolved via a technical spike that de-risks the lowest-rated feasibility category.",
        ))

    return findings


def _challenge_business_model(business_model: BusinessModelResult | None, missing: list[str]) -> list[RedTeamFinding]:
    findings: list[RedTeamFinding] = []
    if business_model is None:
        missing.append("business model analysis")
        findings.append(_finding(
            assumption="The business model is sound and can generate revenue.",
            objection="No business model analysis is available at all.",
            category="BUSINESS_MODEL",
            severity="CRITICAL",
            classification="HYPOTHESIS",
            falsification="Resolved once business model analysis runs successfully.",
            fatal=True,
        ))
        return findings

    if business_model.revenue_model.basis in {"ASSUMED", "UNKNOWN"}:
        missing.append("verified revenue model")
        findings.append(_finding(
            assumption="The stated revenue model will actually generate sustainable revenue.",
            objection="The revenue model is founder-stated, not externally validated by any paying customer.",
            category="BUSINESS_MODEL",
            severity="HIGH",
            classification="HYPOTHESIS",
            falsification="Resolved once at least one real customer pays under this revenue model.",
        ))

    no_unit_econ = all(f.basis == "UNKNOWN" for f in business_model.unit_economics)
    if no_unit_econ:
        missing.append("unit economics (CAC/LTV/margin) evidence")
        findings.append(_finding(
            assumption="Unit economics will be viable at scale.",
            objection="No unit economics (CAC, LTV, margin) evidence exists whatsoever; profitability is entirely unproven.",
            category="BUSINESS_MODEL",
            severity="HIGH",
            classification="HYPOTHESIS",
            falsification="Resolved once real CAC/LTV/margin data is collected from actual paying usage.",
            fatal=True,
        ))

    return findings


def _challenge_operational(risk: RiskResult | None) -> list[RedTeamFinding]:
    if risk is None:
        return []
    operational_high = [r for r in risk.risks if r.category == "OPERATIONAL" and r.severity in {"HIGH", "CRITICAL"}]
    if not operational_high:
        return []
    return [_finding(
        assumption="The team can operationally execute and support this idea end to end.",
        objection=f"{len(operational_high)} high/critical operational gap(s) already identified: "
                   + "; ".join(r.risk_statement for r in operational_high[:3]),
        category="OPERATIONAL",
        severity="HIGH" if any(r.severity == "CRITICAL" for r in operational_high) else "MEDIUM",
        classification="HYPOTHESIS",
        falsification="Resolved once each cited operational gap is independently closed.",
    )]


def _challenge_regulatory(market: MarketResult | None) -> list[RedTeamFinding]:
    if market is None:
        return []
    reg_signals = [s for s in market.signals if s.category == "regulatory_context"]
    if not reg_signals:
        return []
    return [_finding(
        assumption="Regulatory/compliance overhead has been fully accounted for.",
        objection="Regulatory context is only an assumed heuristic signal, not a verified compliance review.",
        category="REGULATORY",
        severity="MEDIUM",
        classification="HYPOTHESIS",
        falsification="Resolved via an actual legal/compliance review for the target industry and geography.",
    )]


def _challenge_execution(state: GraphState) -> list[RedTeamFinding]:
    idea = state.structured_idea
    if not idea.unknowns:
        return []
    return [_finding(
        assumption="The founder can resolve all open unknowns during execution.",
        objection=f"{len(idea.unknowns)} unresolved unknown(s) remain from idea structuring: {', '.join(idea.unknowns)}.",
        category="EXECUTION",
        severity="MEDIUM",
        classification="HYPOTHESIS",
        falsification="Resolved once each listed unknown is explicitly answered with evidence.",
    )]


def _challenge_contradictions(context: Any) -> list[RedTeamFinding]:
    """
    Wave 2: Attack contradictions detected by collaborative reasoning.
    Convert contradictions into red team findings challenging the underlying assumptions.
    """
    findings: list[RedTeamFinding] = []
    
    if not hasattr(context, 'contradictions') or not context.contradictions:
        return findings
    
    # Severity mapping: contradiction severity -> finding severity
    severity_map = {
        "critical": "CRITICAL",
        "high": "HIGH",
        "medium": "MEDIUM",
        "low": "MEDIUM",
    }
    
    for contradiction in context.contradictions:
        severity = severity_map.get(contradiction.severity, "MEDIUM")
        is_fatal = contradiction.severity in ("critical", "high")
        
        finding = _finding(
            assumption=f"Both claims in contradiction are true: {contradiction.title}",
            objection=f"Contradiction detected: {contradiction.description}",
            category="BUSINESS_MODEL",  # Most contradictions affect business assumptions
            severity=severity,
            classification="INFERENCE",  # Derived from upstream analysis
            falsification=contradiction.recommendation or f"Resolve by gathering additional evidence to support one position over the other.",
            claim_ids=contradiction.conflicting_claim_ids,
            fatal=is_fatal,
        )
        findings.append(finding)
    
    return findings


def _challenge_unknowns(context: Any) -> list[RedTeamFinding]:
    """
    Wave 2: Attack unknowns that have downstream impact.
    Each unknown becomes an execution risk finding.
    """
    findings: list[RedTeamFinding] = []
    
    if not hasattr(context, 'unknowns') or not context.unknowns:
        return findings
    
    # Focus on unknowns with high downstream impact
    high_impact_unknowns = [
        u for u in context.unknowns
        if len(u.downstream_impact) > 1  # Impacts multiple components
    ]
    
    for unknown in high_impact_unknowns:
        impact_str = ", ".join(unknown.downstream_impact[:3])
        finding = _finding(
            assumption=f"The {unknown.category} is known: {unknown.description}",
            objection=f"This remains unknown and affects: {impact_str}",
            category="EXECUTION",
            severity="HIGH" if len(unknown.downstream_impact) > 2 else "MEDIUM",
            classification="HYPOTHESIS",
            falsification=f"Resolved by determining the {unknown.category}.",
            fatal=False,
        )
        findings.append(finding)
    
    return findings


async def red_team_agent(state: GraphState) -> dict[str, Any]:
    """
    Red team analysis with Wave 2 collaborative context.
    
    Attacks contradictions detected by upstream agents,
    challenges unknowns with downstream impact,
    and provides comprehensive adversarial review.
    """
    try:
        idea = state.structured_idea
        if idea is None:
            return {
                "red_team_status": "failed",
                "red_team_errors": ["No structured idea available; cannot red-team."],
            }

        # Build shared reasoning context for full system awareness
        context = build_shared_reasoning_context(state)
        red_team_contradictions = get_relevant_contradictions(context, "red_team_agent")
        red_team_unknowns = collect_unknowns_for_agent(context, "red_team_agent")

        missing: list[str] = []
        findings: list[RedTeamFinding] = []

        # ====================================================================
        # Standard challenges (Phase 1-2 logic)
        # ====================================================================
        findings += _challenge_customer_adoption(state, missing)
        findings += _challenge_market(state.market_result, missing)
        findings += _challenge_competition(state)
        findings += _challenge_product_and_technical(state.feasibility_result, missing)
        findings += _challenge_business_model(state.business_model_result, missing)
        findings += _challenge_operational(state.risk_result)
        findings += _challenge_regulatory(state.market_result)
        findings += _challenge_execution(state)

        # ====================================================================
        # Wave 2: Challenge contradictions and unknowns
        # ====================================================================
        findings += _challenge_contradictions(context)
        findings += _challenge_unknowns(context)

        severity_rank = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}

        strongest_id = None
        weakest_id = None
        if findings:
            strongest_id = max(findings, key=lambda f: (severity_rank[f.severity], len(f.evidence_ids))).id
            # "Weakest assumption" = the finding backed by the least evidence
            # (ties broken by lowest severity), i.e. the assumption resting
            # on the shakiest ground.
            # on the shakiest ground.
            weakest_id = min(findings, key=lambda f: (len(f.evidence_ids), -severity_rank[f.severity])).id

        fatal_ids = [f.id for f in findings if f.is_potentially_fatal and f.id]
        critical_ids = [f.id for f in findings if f.severity == "CRITICAL" and f.id]

        relevant_claims = []
        for result in (state.research_result, state.competition_result, state.customer_result, state.market_result, state.business_model_result, state.feasibility_result, state.financial_result):
            if result is not None:
                relevant_claims.extend(getattr(result, "claims", []))

        try:
            llm_analysis = await analyze_red_team_with_llm(
                idea_text=state.raw_idea or "",
                market_context=(idea.industry_category or "general market") + (f"; customer={idea.target_customer}" if idea.target_customer else ""),
                llm_provider=get_llm_provider(),
            )
            if llm_analysis.get("status") == "success":
                for objection in llm_analysis.get("objections", []):
                    evidence_ids, claim_ids, classification = _match_finding_evidence(objection.objection, relevant_claims)
                    category = "CUSTOMER_ADOPTION" if "customer" in objection.objection.lower() else "BUSINESS_MODEL"
                    if "technical" in objection.objection.lower() or "feasibility" in objection.objection.lower():
                        category = "TECHNICAL"
                    elif "market" in objection.objection.lower() or "competition" in objection.objection.lower():
                        category = "MARKET"
                    findings.append(RedTeamFinding(
                        assumption_challenged=objection.assumption_challenged or "Founder assumption",
                        objection=objection.objection,
                        category=category,
                        severity=(objection.severity or "MEDIUM").upper(),
                        classification=classification,
                        evidence_ids=evidence_ids,
                        claim_ids=claim_ids,
                        falsification_criteria=objection.how_to_disprove or "Validate directly with customers or evidence.",
                        is_potentially_fatal=(objection.severity or "MEDIUM").upper() in {"CRITICAL", "HIGH"},
                    ))
        except Exception:
            logger.warning("LLM red-team enrichment unavailable; using deterministic red-team assessment.", exc_info=True)

        status = "success" if findings else "partial"

        # Recompute strongest/weakest ids after any LLM-added findings.
        if findings:
            strongest_id = max(findings, key=lambda f: (severity_rank[f.severity], len(f.evidence_ids))).id
            weakest_id = min(findings, key=lambda f: (len(f.evidence_ids), -severity_rank[f.severity])).id
            fatal_ids = [f.id for f in findings if f.is_potentially_fatal and f.id]
            critical_ids = [f.id for f in findings if f.severity == "CRITICAL" and f.id]

        # Add Wave 2 context to logging
        logger.info(
            f"Red Team analysis completed: {status} ({len(findings)} finding(s), {len(critical_ids)} critical) | "
            f"Wave 2: {len(red_team_contradictions)} contradictions attacked, {len(red_team_unknowns)} unknowns challenged"
        )

        result = RedTeamResult(
            status=status,
            findings=findings,
            strongest_objection_id=strongest_id,
            weakest_assumption_id=weakest_id,
            potentially_fatal_finding_ids=fatal_ids,
            missing_decision_critical_evidence=missing,
            critical_finding_ids=critical_ids,
        )

        return {
            "red_team_result": result,
            "red_team_status": result.status,
            "red_team_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Red Team agent failed")
        return {
            "red_team_status": "failed",
            "red_team_errors": [f"Red Team agent failed: {exc}"],
        }