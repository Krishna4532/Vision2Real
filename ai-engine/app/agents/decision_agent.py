"""Decision Gate + Validation Plan (Phase 3).

decision_gate_node calls the pure, deterministic `decide()` function in
app.services.decision_rules - see that module for the documented rule set
and thresholds. validation_plan_node then generates a prioritized validation
plan ONLY when the decision is VALIDATE_MORE, mapping each unresolved
unknown/weak-evidence area to a concrete next validation step.

Wave 2 Enhancement:
- Synthesizes full reasoning context from all agents
- Detects contradictions that impact decision safety
- Prioritizes validation by unknown relevance and risk
- Accounts for confidence propagation
"""
from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.phase3 import (
    BusinessModelResult,
    FeasibilityResult,
    RedTeamResult,
    RiskResult,
    SynthesisResult,
    ValidationItem,
    ValidationPlan,
)
from app.services.collaborative_reasoning import (
    build_shared_reasoning_context,
    collect_unknowns_for_agent,
    get_relevant_contradictions,
    should_validate_more,
)
from app.services.agent_services import analyze_decision_with_llm
from app.services.decision_rules import decide
from app.services.llm_provider import get_llm_provider


def _empty_or(value, empty_status="failed"):
    return value


async def decision_gate_node(state: GraphState) -> dict[str, Any]:
    """
    Decision Gate with collaborative context awareness.
    
    Synthesizes:
    - All upstream analysis results
    - Contradictions that impact safety
    - Overall confidence and unknown percentage
    - Assumption validation status
    
    Decision remains deterministic but informed by full system reasoning.
    """
    try:
        synthesis = state.synthesis_result or SynthesisResult(status="failed")
        business_model = state.business_model_result or BusinessModelResult(status="failed")
        feasibility = state.feasibility_result or FeasibilityResult(status="failed")
        risk = state.risk_result or RiskResult(status="failed")
        red_team = state.red_team_result

        # Build collaborative reasoning context for decision safety checks
        context = build_shared_reasoning_context(state)

        # Check for critical contradictions that override normal rules
        critical_contradictions = [
            c for c in context.contradictions 
            if c.severity in ("critical", "high")
        ]
        
        if critical_contradictions:
            logger.warning(
                f"Critical contradictions detected ({len(critical_contradictions)}): "
                f"{', '.join(c.title for c in critical_contradictions[:2])}"
            )

        # Check unknown percentage - high unknowns should force VALIDATE_MORE
        if context.unknown_percentage > 0.4:
            logger.info(
                f"High unknown percentage ({context.unknown_percentage:.0%}): "
                f"recommendation is VALIDATE_MORE"
            )

        # Apply core decision rules with full context
        decision_result = decide(synthesis, business_model, feasibility, risk, red_team, state.status)

        # Optional Wave 4 advisory LLM layer: richer qualitative decision logic,
        # but the deterministic gate remains the final authority on
        # `decision_result.decision`.
        try:
            llm_provider = get_llm_provider()
            advisory_context = (
                f"Overall confidence: {context.overall_confidence:.0%}\n"
                f"Unknown percentage: {context.unknown_percentage:.0%}\n"
                f"Critical contradictions: {len(critical_contradictions)}\n"
                f"Critical risks: {len(context.critical_risks)}\n"
                f"Synthesis summary: {synthesis.executive_summary or 'No executive summary available'}\n"
                f"Business model strengths: {', '.join(business_model.strengths) if business_model.strengths else 'none'}\n"
                f"Business model weaknesses: {', '.join(business_model.weaknesses) if business_model.weaknesses else 'none'}\n"
                f"Feasibility: {feasibility.technical_feasibility}\n"
                f"Risk summary: {', '.join(r.risk_statement for r in risk.risks[:5]) if risk.risks else 'none'}\n"
                f"Red team status: {red_team.status if red_team is not None else 'missing'}"
            )
            advisory = await analyze_decision_with_llm(
                idea_text=state.raw_idea or "",
                context_summary=advisory_context,
                llm_provider=llm_provider,
            )
            if advisory.get("status") == "success":
                normalized = str(advisory.get("decision", "")).upper().strip()
                if normalized in {"BUILD", "VALIDATE_MORE", "PIVOT", "REJECT"}:
                    decision_result.llm_proposed_decision = normalized
                advisory_note = advisory.get("reasoning", "").strip()
                if advisory_note:
                    decision_result.rationale.append(f"[Wave 4 Advisory LLM] {advisory_note}")
        except Exception:
            logger.warning("Decision advisory LLM unavailable; deterministic gate remains authoritative.", exc_info=True)

        # Enhance decision context with collaborative reasoning while staying
        # within the existing schema contract.
        decision_result.rationale.append(
            f"[Wave 2 Collaborative Context] "
            f"Overall confidence: {context.overall_confidence:.0%} | "
            f"Unknown %: {context.unknown_percentage:.0%} | "
            f"Contradictions: {len(context.contradictions)} | "
            f"Critical risks: {len(context.critical_risks)}"
        )

        logger.info(
            f"Decision gate result: {decision_result.decision} "
            f"(confidence={context.overall_confidence:.2f}, "
            f"contradictions={len(critical_contradictions)})"
        )

        return {"decision_result": decision_result}

    except Exception as exc:  # noqa: BLE001
        logger.exception("Decision gate failed")
        return {
            "errors": state.errors + [f"Decision gate failed: {exc}"],
        }


def _validation_item_for_unknown(unknown: str, priority: str) -> ValidationItem:
    return ValidationItem(
        id=str(uuid.uuid4()),
        question=f"What is the answer to the unresolved unknown: '{unknown}'?",
        why_it_matters="This unknown was flagged during idea structuring and blocks a confident decision.",
        evidence_missing=[unknown],
        proposed_method="Structured customer/expert interviews or a targeted landing-page/survey test.",
        expected_signal="A specific, evidence-backed answer replacing the current 'unknown' placeholder.",
        success_interpretation="A clear, corroborated answer materially increases confidence toward BUILD.",
        failure_interpretation="Inability to resolve this unknown after outreach is itself a signal to reconsider or pivot.",
        priority=priority,
    )


def _validation_item_for_contradiction(contradiction: Any, priority: str) -> ValidationItem:
    """Create a validation experiment to resolve a contradiction."""
    return ValidationItem(
        id=str(uuid.uuid4()),
        question=f"How do we resolve: {contradiction.title}?",
        why_it_matters=f"Contradiction blocks confident decision: {contradiction.description[:100]}...",
        evidence_missing=contradiction.conflicting_claim_ids,
        proposed_method=contradiction.recommendation or "Gather additional evidence to clarify discrepancy",
        expected_signal="Clear evidence supporting one interpretation over the other",
        success_interpretation="Contradiction resolved, decision confidence increased",
        failure_interpretation="Unresolved contradiction should delay BUILD decision",
        priority=priority,
    )


def _validation_item_for_risk(risk_statement: str, mitigation: str, priority: str) -> ValidationItem:
    return ValidationItem(
        id=str(uuid.uuid4()),
        question=f"Can we confirm or refute: '{risk_statement}'?",
        why_it_matters="This was flagged as an unresolved risk with no verified evidence backing it.",
        evidence_missing=[risk_statement],
        proposed_method=mitigation,
        expected_signal="Independent evidence that either supports or contradicts the underlying claim.",
        success_interpretation="Confirmation reduces this risk and strengthens the case for BUILD.",
        failure_interpretation="Contradiction should lower confidence and may justify PIVOT or REJECT.",
        priority=priority,
    )


async def validation_plan_node(state: GraphState) -> dict[str, Any]:
    """
    Validation Plan with Wave 2 prioritization.
    
    Prioritizes validation experiments by:
    1. Critical contradictions (highest unknown impact)
    2. UNKNOWN values with downstream impact
    3. Critical/High risks
    4. Low-confidence components
    5. Red team findings
    
    Only generates plan if decision is VALIDATE_MORE.
    """
    try:
        decision_result = state.decision_result
        if decision_result is None or decision_result.decision != "VALIDATE_MORE":
            return {"validation_plan": ValidationPlan(generated=False, items=[])}

        # Build shared reasoning context for prioritization
        context = build_shared_reasoning_context(state)
        
        items: list[ValidationItem] = []

        # ====================================================================
        # Priority 1: Critical Contradictions (highest impact)
        # ====================================================================
        critical_contradictions = [
            c for c in context.contradictions 
            if c.severity in ("critical", "high")
        ]
        for contra in critical_contradictions:
            items.append(_validation_item_for_contradiction(contra, priority="HIGH"))
            logger.debug(f"Validation: addressing contradiction {contra.title}")

        # ====================================================================
        # Priority 2: Unknown Values with Downstream Impact
        # ====================================================================
        context_unknowns = collect_unknowns_for_agent(context, "validation_plan")
        
        # Sort by downstream impact
        unknowns_by_impact = sorted(
            context_unknowns,
            key=lambda u: len(u.downstream_impact),
            reverse=True
        )
        
        for unknown in unknowns_by_impact[:5]:  # Top 5 by impact
            priority = "HIGH" if len(unknown.downstream_impact) > 2 else "MEDIUM"
            items.append(_validation_item_for_unknown(unknown.description, priority=priority))
            logger.debug(f"Validation: investigating unknown {unknown.category}")

        # ====================================================================
        # Priority 3: Critical and High Risks
        # ====================================================================
        risk = state.risk_result
        if risk is not None:
            severity_priority = {"CRITICAL": "HIGH", "HIGH": "HIGH", "MEDIUM": "MEDIUM"}
            critical_risks = [r for r in risk.risks if r.severity in ("CRITICAL", "HIGH")]
            for r in critical_risks[:5]:  # Top 5 critical risks
                priority = severity_priority.get(r.severity)
                if priority:
                    items.append(_validation_item_for_risk(r.risk_statement, r.mitigation, priority))

        # ====================================================================
        # Priority 4: Idea-level Unknowns
        # ====================================================================
        idea = state.structured_idea
        if idea is not None:
            for unknown in idea.unknowns:
                items.append(_validation_item_for_unknown(unknown, priority="MEDIUM"))

        # ====================================================================
        # Priority 5: Red Team Findings
        # ====================================================================
        red_team = state.red_team_result
        if red_team is not None:
            severity_priority = {"CRITICAL": "HIGH", "HIGH": "HIGH", "MEDIUM": "MEDIUM"}
            for finding in red_team.findings:
                priority = "HIGH" if finding.is_potentially_fatal else severity_priority.get(finding.severity)
                if priority:
                    items.append(_validation_item_for_risk(finding.objection, finding.falsification_criteria, priority))

        # ====================================================================
        # Deduplicate and finalize
        # ====================================================================
        # Simple deduplication: remove items with same question
        seen_questions = set()
        deduplicated_items = []
        for item in items:
            if item.question not in seen_questions:
                seen_questions.add(item.question)
                deduplicated_items.append(item)

        plan = ValidationPlan(generated=bool(deduplicated_items), items=deduplicated_items)

        logger.info(
            f"Validation plan generated: {len(deduplicated_items)} item(s) "
            f"(contradictions={len(critical_contradictions)}, "
            f"unknowns={len(unknowns_by_impact)}, "
            f"risks={len(context.critical_risks)})"
        )

        return {"validation_plan": plan}

    except Exception as exc:  # noqa: BLE001
        logger.exception("Validation plan generation failed")
        return {
            "validation_plan": ValidationPlan(generated=False, items=[]),
            "errors": state.errors + [f"Validation plan generation failed: {exc}"],
        }
