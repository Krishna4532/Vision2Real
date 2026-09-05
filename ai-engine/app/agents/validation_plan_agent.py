from __future__ import annotations

from typing import Any

from app.core.logging import logger
from app.graph.state import GraphState
from app.schemas.phase3 import ValidationItem, ValidationPlan
from app.services.agent_services import analyze_validation_with_llm
from app.services.llm_provider import get_llm_provider


async def validation_plan_agent(state: GraphState) -> dict[str, Any]:
    """Generate a validation plan from the current decision context.

    This keeps the existing deterministic validation plan generation available to
    the pipeline while exposing the same pattern the other agents use for LLM
    enrichment when a real provider is configured.
    """
    try:
        decision_result = state.decision_result
        if decision_result is None or decision_result.decision != "VALIDATE_MORE":
            return {"validation_plan": ValidationPlan(generated=False, items=[])}

        unknowns = []
        idea = state.structured_idea
        if idea is not None:
            unknowns.extend(idea.unknowns)

        items: list[ValidationItem] = []
        if idea is not None:
            for unknown in idea.unknowns:
                items.append(ValidationItem(
                    id=unknown,
                    question=f"What is the answer to the unresolved unknown: '{unknown}'?",
                    why_it_matters="This unknown blocks a confident decision.",
                    evidence_missing=[unknown],
                    proposed_method="Customer interviews, landing page test, or a structured survey.",
                    expected_signal="A specific, evidence-backed answer that resolves the gap.",
                    success_interpretation="The answer materially reduces uncertainty.",
                    failure_interpretation="Unresolved uncertainty remains and should trigger a pivot or reject decision.",
                    priority="HIGH",
                ))

        try:
            llm_provider = get_llm_provider()
            upstream_summary = (
                f"Decision: {decision_result.decision}\n"
                f"Confidence: {decision_result.confidence}\n"
                f"Rationale: {'; '.join(decision_result.rationale) if decision_result.rationale else 'none'}\n"
                f"Risk summary: {', '.join(r.risk_statement for r in (state.risk_result.risks if state.risk_result else []))[:800] if state.risk_result else 'none'}\n"
                f"Red team findings: {', '.join(f.objection for f in (state.red_team_result.findings if state.red_team_result else []))[:800] if state.red_team_result else 'none'}"
            )
            llm_analysis = await analyze_validation_with_llm(
                idea_text=state.raw_idea or "",
                unknowns=unknowns,
                llm_provider=llm_provider,
                upstream_summary=upstream_summary,
            )
            if llm_analysis.get("status") == "success":
                for experiment in llm_analysis.get("plan", {}).experiments if llm_analysis.get("plan") else []:
                    items.append(ValidationItem(
                        id=experiment.question,
                        question=experiment.question,
                        why_it_matters=experiment.why_matters,
                        evidence_missing=[experiment.question],
                        proposed_method=experiment.method,
                        expected_signal=experiment.success_criteria,
                        success_interpretation=experiment.success_criteria,
                        failure_interpretation="The observed result does not support the core assumption.",
                        priority=experiment.priority.upper() if experiment.priority else "MEDIUM",
                    ))
        except Exception:
            logger.warning("LLM validation plan enrichment unavailable; using deterministic plan generation.", exc_info=True)

        plan = ValidationPlan(generated=bool(items), items=items)
        logger.info(f"Validation plan generated: {len(items)} item(s)")
        return {"validation_plan": plan}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Validation plan generation failed")
        return {"validation_plan": ValidationPlan(generated=False, items=[]), "errors": [f"Validation plan generation failed: {exc}"]}
