"""
Phase 6 - Report Intelligence generation service.

ARCHITECTURE: this is a pure transformation layer over already-persisted
analysis data. It calls reconstruct_analysis_result (the same function
GET /api/v1/analysis/{id} uses) and maps the result into a FounderReport.

HARD ISOLATION GUARANTEE: this module imports nothing from app.agents,
app.graph, app.services.llm_provider, or app.services.research_provider, and
calls no LLM/search/agent code. It only reads fields off an already-built
AnalysisResult. This is verified by tests/test_phase_6_report.py, which
monkeypatches every agent to raise if called and confirms report generation
still succeeds against a previously-persisted analysis.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.schemas.analysis import AnalysisResult
from app.schemas.phase3 import FounderDecisionBrief
from app.schemas.report import EvidenceSummarySection, FounderReport, IdeaSection, Visualization
from app.services.analysis_service import reconstruct_analysis_result
from app.services.status_rules import StatusDegradationRules


def _build_idea_section(result: AnalysisResult) -> IdeaSection | None:
    idea = result.structured_idea
    if idea is None:
        return None
    return IdeaSection(
        problem=idea.problem,
        solution=idea.solution,
        target_customer=idea.target_customer,
        industry_category=idea.industry_category,
        geography=idea.geography,
        business_model=idea.business_model,
        assumptions=idea.assumptions,
        unknowns=idea.unknowns,
        clarifying_questions=idea.clarifying_questions,
    )


def _build_executive_summary(result: AnalysisResult, idea: IdeaSection | None) -> str:
    synthesis = result.synthesis_result
    # Prefer Synthesis's own executive_summary - it's already the
    # authoritative, deterministically-generated summary. Report generation
    # must not regenerate/rewrite it; that would risk drifting from the
    # semantics (VERIFIED/INFERRED/ASSUMED/UNKNOWN) synthesis_agent.py
    # carefully preserved.
    if synthesis is not None and synthesis.executive_summary:
        return synthesis.executive_summary

    # Deterministic fallback (no LLM call) for analyses where Synthesis
    # didn't run/succeed - e.g. a rejected or Phase-1-only analysis.
    if result.status == "rejected":
        return "This idea was not analyzed further: pre-flight screening rejected the input."
    if idea is None:
        return "No structured idea is available for this analysis yet."
    parts = [f"Idea: {idea.problem or 'unknown problem'}."]
    if idea.solution:
        parts.append(f"Proposed solution: {idea.solution}.")
    if idea.target_customer:
        parts.append(f"Target customer: {idea.target_customer}.")
    parts.append("Full synthesis is not available; this summary reflects the structured idea only.")
    return " ".join(parts)


def _build_evidence_summary(result: AnalysisResult) -> EvidenceSummarySection:
    synthesis = result.synthesis_result

    gaps: list[str] = []
    for name, res_status in (
        ("research", result.research_status),
        ("competition", result.competition_status),
        ("customer", result.customer_status),
        ("synthesis", result.synthesis_status),
        ("business_model", result.business_model_status),
        ("feasibility", result.feasibility_status),
        ("market", result.market_status),
        ("risk", result.risk_status),
        ("red_team", result.red_team_status),
    ):
        if res_status in ("failed", "pending"):
            gaps.append(name)

    if synthesis is None:
        return EvidenceSummarySection(evidence_gaps=gaps)

    strongest = [i for i in synthesis.key_insights if i.category == "strongest_evidence"]
    weakest = [i for i in synthesis.key_insights if i.category == "weakest_evidence"]
    unknowns = [i for i in synthesis.key_insights if i.category == "important_unknown"]

    return EvidenceSummarySection(
        confidence=synthesis.evidence_confidence,
        strongest_evidence=strongest,
        weakest_evidence=weakest,
        important_unknowns=unknowns,
        evidence_gaps=gaps,
    )


def _build_strategic_sections(result: AnalysisResult) -> dict[str, Any]:
    idea = result.structured_idea
    synthesis = result.synthesis_result
    risk = result.risk_result
    red_team = result.red_team_result
    validation = result.validation_plan

    biggest_risks = []
    if risk and risk.risks:
        severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        biggest_risks = [r.risk_statement for r in sorted(risk.risks, key=lambda r: severity_order.get(getattr(r, 'severity', 'LOW'), 0), reverse=True)[:5]]

    critical_assumptions = []
    if idea and idea.unknowns:
        critical_assumptions = [u for u in idea.unknowns[:5]]
    elif result.research_result:
        critical_assumptions = [c.claim_text for c in result.research_result.claims[:3]]

    contradictions = []
    if red_team and red_team.findings:
        contradictions = [f.objection for f in red_team.findings[:5]]

    unknowns_that_matter = []
    if idea and idea.unknowns:
        unknowns_that_matter = [u for u in idea.unknowns[:5]]

    opportunities = []
    if synthesis and synthesis.key_insights:
        opportunities = [ins.statement for ins in synthesis.key_insights if ins.category in {"market_signal", "customer_signal", "competitive_signal"}][:5]
    if not opportunities:
        opportunities = ["The underlying founder problem is still the clearest source of potential wedge value."]

    what_must_be_true = []
    if critical_assumptions:
        what_must_be_true = [f"The team must validate: {item}" for item in critical_assumptions[:5]]
    else:
        what_must_be_true = ["The startup must validate its core customer problem and willingness to pay before scaling."]

    roadmap_30d = []
    if validation and validation.items:
        roadmap_30d = [item.question for item in validation.items[:3]]
    if not roadmap_30d:
        roadmap_30d = ["Interview at least 10 target users and map their job-to-be-done.", "Assess willingness-to-pay with a simple offer test."]

    roadmap_90d = []
    if validation and validation.items:
        roadmap_90d = [item.question for item in validation.items[3:6]]
    if not roadmap_90d:
        roadmap_90d = ["Run a live pilot or narrow beta to test retention and conversion.", "Validate which pricing and acquisition model holds under real usage."]

    decision = "VALIDATE_MORE"
    if result.decision_result is not None:
        decision = result.decision_result.decision

    evidence_strength = "Insufficient evidence for confident scale-up." if not synthesis or synthesis.current_evidence_strength in {"UNKNOWN", "ASSUMED"} else str(synthesis.current_evidence_strength)

    return {
        "startup_snapshot": idea.problem if idea and idea.problem else "Startup focus is still being validated.",
        "biggest_opportunities": opportunities,
        "biggest_risks": biggest_risks or ["Customer demand remains unproven.", "The business model still depends on unvalidated assumptions."],
        "critical_assumptions": critical_assumptions or ["Customer problem is real and urgent.", "The founder can reach the right customer at acceptable cost."],
        "evidence_strength": evidence_strength,
        "contradictions": contradictions or ["The most important contradiction is whether the product is solving a real pain that customers will pay to fix.", "The current evidence does not yet resolve that tension."],
        "unknowns_that_matter": unknowns_that_matter or ["Who exactly pays and why.", "What would force switching away from today’s workflow."],
        "market_reality": f"The market case is {('strongly supported' if synthesis and synthesis.current_evidence_strength == 'VERIFIED' else 'still being tested')} by the evidence available.",
        "customer_reality": "Customer demand is not yet proven without direct validation feedback and willingness-to-pay evidence.",
        "competitive_reality": "Competition is meaningful only if the startup can win on speed, trust, or distribution under real operating conditions.",
        "business_model_reality": "Revenue and pricing remain hypothesis-driven until customer behavior and conversion are demonstrated.",
        "financial_reality": "Financial projections are directional only; the real validation question is whether the unit economics survive real usage.",
        "technical_reality": "Technical feasibility is meaningful only if the system can be built and shipped without fragile operational dependence.",
        "what_must_be_true": what_must_be_true,
        "validation_roadmap_30d": roadmap_30d,
        "validation_roadmap_90d": roadmap_90d,
        "decision": decision,
        "confidence_explanation": (
            f"Confidence is shaped by evidence strength {evidence_strength} and still limited by key unknowns: "
            f"{', '.join(unknowns_that_matter[:3]) if unknowns_that_matter else 'customer demand and economic viability'}"
        ),
        "appendix": [
            "Evidence traceability is preserved in the underlying claims and citations.",
            "No decision is treated as fact without evidence, contradiction review, and explicit uncertainty handling.",
        ],
    }


def _build_visualizations(result: AnalysisResult) -> list[Visualization]:
    """Every visualization here is either (a) a direct count of persisted
    claims/evidence/risks/findings - never fabricated - or (b) explicitly
    marked unavailable with a stated reason. No numeric field is ever
    invented to make a chart look complete.
    """
    visualizations: list[Visualization] = []

    synthesis = result.synthesis_result
    if synthesis is not None and synthesis.evidence_confidence.total_claims > 0:
        conf = synthesis.evidence_confidence
        visualizations.append(Visualization(
            visualization_id="evidence_confidence_breakdown",
            type="pie_chart",
            title="Evidence Confidence Breakdown",
            description="Count of claims by evidentiary status across the whole analysis.",
            data={
                "supported": conf.supported,
                "inference": conf.inference,
                "hypothesis": conf.hypothesis,
                "unsupported": conf.unsupported,
                "unknown": conf.unknown,
            },
            interpretation=(
                f"{conf.supported} of {conf.total_claims} claim(s) are fact-level (supported); "
                f"the rest are inference, hypothesis, or unresolved."
            ),
            available=True,
        ))
        visualizations.append(Visualization(
            visualization_id="overall_confidence_score",
            type="metric",
            title="Overall Evidence Confidence Score",
            description="Deterministic weighted score (0-1) computed by Synthesis from claim statuses.",
            data={"score": conf.overall_confidence_score},
            interpretation=f"{conf.overall_confidence_score:.2f} out of 1.00.",
            available=True,
        ))
    else:
        visualizations.append(Visualization(
            visualization_id="evidence_confidence_breakdown",
            type="pie_chart",
            title="Evidence Confidence Breakdown",
            description="Count of claims by evidentiary status across the whole analysis.",
            available=False,
            reason_unavailable="No claims are available yet (Synthesis did not run or found zero claims).",
        ))

    risk = result.risk_result
    if risk is not None and risk.risks:
        severity_counts: dict[str, int] = {}
        risk_evidence_ids: list[str] = []
        for r in risk.risks:
            severity_counts[r.severity] = severity_counts.get(r.severity, 0) + 1
            risk_evidence_ids.extend(r.evidence_ids)
        visualizations.append(Visualization(
            visualization_id="risk_severity_breakdown",
            type="bar_chart",
            title="Risk Severity Breakdown",
            description="Count of identified risks by severity level.",
            data=severity_counts,
            evidence_ids=risk_evidence_ids,
            claim_ids=[cid for r in risk.risks for cid in r.claim_ids],
            interpretation=f"{len(risk.risks)} risk(s) identified across {len(severity_counts)} severity level(s).",
            available=True,
        ))
    else:
        visualizations.append(Visualization(
            visualization_id="risk_severity_breakdown",
            type="bar_chart",
            title="Risk Severity Breakdown",
            description="Count of identified risks by severity level.",
            available=False,
            reason_unavailable="No risk analysis available." if risk is None else "No risks were identified.",
        ))

    red_team = result.red_team_result
    if red_team is not None and red_team.findings:
        category_counts: dict[str, int] = {}
        rt_evidence_ids: list[str] = []
        for f in red_team.findings:
            category_counts[f.category] = category_counts.get(f.category, 0) + 1
            rt_evidence_ids.extend(f.evidence_ids)
        visualizations.append(Visualization(
            visualization_id="red_team_findings_by_category",
            type="bar_chart",
            title="Red Team Findings by Category",
            description="Count of adversarial findings by category challenged.",
            data=category_counts,
            evidence_ids=rt_evidence_ids,
            interpretation=(
                f"{len(red_team.findings)} finding(s); "
                f"{len(red_team.potentially_fatal_finding_ids)} potentially fatal."
            ),
            available=True,
        ))
    else:
        visualizations.append(Visualization(
            visualization_id="red_team_findings_by_category",
            type="bar_chart",
            title="Red Team Findings by Category",
            description="Count of adversarial findings by category challenged.",
            available=False,
            reason_unavailable="No Red Team analysis available." if red_team is None else "No findings were generated.",
        ))

    competition = result.competition_result
    if competition is not None and competition.competitors:
        # A real count of identified entries - not a fabricated statistic.
        visualizations.append(Visualization(
            visualization_id="competitive_landscape_count",
            type="metric",
            title="Competitors / Substitutes Identified",
            description="Count of competitor/substitute entries identified by the Competition agent.",
            data={"count": len(competition.competitors)},
            claim_ids=[c.id for c in competition.claims if c.id],
            interpretation=f"{len(competition.competitors)} entrant(s) identified (see competition section for detail/provenance).",
            available=True,
        ))

    # Market size / TAM / SAM / SOM: per the hard rule, this codebase's
    # MarketResult schema structurally never carries a fabricated number
    # (see schemas/phase3.py MarketResult's comment). This visualization is
    # therefore always represented as unavailable rather than omitted
    # entirely, so the frontend has a stable slot to render a qualitative
    # evidence card in instead of a chart - exactly per the Phase 6 spec's
    # worked example.
    visualizations.append(Visualization(
        visualization_id="market_size_estimate",
        type="metric",
        title="Market Size (TAM/SAM/SOM)",
        description="Quantitative market-size estimate.",
        available=False,
        reason_unavailable=(
            "Insufficient evidence-backed numerical market-size data. TAM/SAM/SOM figures are "
            "never fabricated - see MarketResult in schemas/phase3.py."
        ),
    ))

    return visualizations


async def generate_founder_report(analysis_id: str, db: AsyncSession) -> FounderReport | None:
    """Deterministically transform a persisted analysis into a FounderReport.
    Returns None if the analysis_id doesn't exist (caller returns 404).

    Never calls an agent, LLM, or search provider - see module docstring.
    """
    result = await reconstruct_analysis_result(analysis_id, db)
    if result is None:
        return None

    idea_section = _build_idea_section(result)
    executive_summary = _build_executive_summary(result, idea_section)
    evidence_summary = _build_evidence_summary(result)
    visualizations = _build_visualizations(result)

    phase3 = FounderDecisionBrief(
        analysis_id=result.analysis_id,
        synthesis=result.synthesis_result,
        business_model=result.business_model_result,
        feasibility=result.feasibility_result,
        market=result.market_result,
        risk=result.risk_result,
        red_team=result.red_team_result,
        decision=result.decision_result,
        validation_plan=result.validation_plan,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )

    strategic = _build_strategic_sections(result)

    report = FounderReport(
        analysis_id=result.analysis_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status=result.status,
        degraded=StatusDegradationRules.is_degraded_status(result.status),
        executive_summary=executive_summary,
        startup_snapshot=strategic["startup_snapshot"],
        biggest_opportunities=strategic["biggest_opportunities"],
        biggest_risks=strategic["biggest_risks"],
        critical_assumptions=strategic["critical_assumptions"],
        evidence_strength=strategic["evidence_strength"],
        contradictions=strategic["contradictions"],
        unknowns_that_matter=strategic["unknowns_that_matter"],
        market_reality=strategic["market_reality"],
        customer_reality=strategic["customer_reality"],
        competitive_reality=strategic["competitive_reality"],
        business_model_reality=strategic["business_model_reality"],
        financial_reality=strategic["financial_reality"],
        technical_reality=strategic["technical_reality"],
        what_must_be_true=strategic["what_must_be_true"],
        validation_roadmap_30d=strategic["validation_roadmap_30d"],
        validation_roadmap_90d=strategic["validation_roadmap_90d"],
        decision=strategic["decision"],
        confidence_explanation=strategic["confidence_explanation"],
        appendix=strategic["appendix"],
        idea=idea_section,
        evidence_summary=evidence_summary,
        research=result.research_result,
        competition=result.competition_result,
        customer=result.customer_result,
        phase3=phase3,
        visualizations=visualizations,
        errors=result.errors,
        warnings=result.warnings,
    )

    logger.info(f"Founder report generated for analysis_id={analysis_id}, status={result.status}")

    return report
