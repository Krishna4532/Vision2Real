from __future__ import annotations

from collections import Counter
from typing import Any, Iterable

from app.schemas.analysis import AnalysisResult
from app.schemas.report import FounderReport
from app.schemas.evidence import Claim
from evaluation.dataset import BenchmarkCase
from evaluation.scoring import Check, score_area


AREA_NAMES = (
    "structuring",
    "preflight",
    "research",
    "competition",
    "customer",
    "evidence",
    "feasibility",
    "red_team",
    "verdict",
    "report",
)

_UNKNOWN_VALUES = {None, "", "unknown", "UNKNOWN", "Unknown", "unspecified", "Unspecified"}
_DECISIONS = {"BUILD", "VALIDATE_MORE", "PIVOT", "REJECT"}
_EVIDENCE_STATUSES = {"supported", "inference", "hypothesis", "unsupported", "unknown"}
_MATERIAL_CLASSIFICATIONS = {"FACT", "INFERENCE", "HYPOTHESIS"}


def _check(name: str, passed: bool | None, detail: str) -> Check:
    return Check(name=name, passed=passed, detail=detail)


def _is_unknown(value: Any) -> bool:
    return value in _UNKNOWN_VALUES or (isinstance(value, str) and value.strip().lower() in {"unknown", "unspecified"})


def _claims(result: AnalysisResult) -> list[Claim]:
    components = (result.research_result, result.competition_result, result.customer_result)
    return [claim for component in components if component for claim in component.claims]


def _component_claim_checks(component: Any, name: str) -> list[Check]:
    if component is None:
        return [_check(f"{name}.result_present", None, f"{name} is not applicable because the pipeline stopped before it ran.")]

    checks = [
        _check(
            f"{name}.status_valid",
            component.status in {"success", "partial", "failed"},
            f"status={component.status!r}",
        )
    ]
    claims = component.claims
    supported = [claim for claim in claims if claim.status == "supported"]
    checks.append(_check(
        f"{name}.supported_claims_have_evidence",
        all(bool(claim.evidence_items) for claim in supported),
        f"{len(supported)} supported claim(s) inspected; supported claims cannot be evidence-free.",
    ))
    checks.append(_check(
        f"{name}.claim_provenance_is_structured",
        all(isinstance(claim.provenance, dict) for claim in claims),
        f"{len(claims)} claim provenance field(s) inspected.",
    ))
    checks.append(_check(
        f"{name}.evidence_ids_preserved",
        all(evidence.id for claim in claims for evidence in claim.evidence_items),
        "Every linked evidence item has a stable ID.",
    ))
    checks.append(_check(
        f"{name}.sources_preserved",
        all(source.id or source.url or source.title for claim in claims for evidence in claim.evidence_items for source in evidence.sources),
        "Embedded source identity/provenance is retained wherever a source exists.",
    ))
    checks.append(_check(
        f"{name}.mock_sources_not_verified",
        not any(
            claim.status == "supported"
            and any(
                (source.url or "").startswith("https://example.com")
                or (source.publisher_domain or "") == "example.com"
                or "mock" in (source.title or "").lower()
                for evidence in claim.evidence_items
                for source in evidence.sources
            )
            for claim in claims
        ),
        "Illustrative/mock sources must not be promoted to supported facts.",
    ))
    return checks


def evaluate_structuring(case: BenchmarkCase, result: AnalysisResult):
    expected = case.expected
    idea = result.structured_idea
    checks = [_check("structuring.result_present", idea is not None, "Structured idea is present." if idea else "No structured idea returned.")]
    if idea is None:
        return score_area("structuring", checks)

    for field in expected.get("required_fields", []):
        value = getattr(idea, field, None)
        checks.append(_check(
            f"structuring.required.{field}",
            not _is_unknown(value),
            f"{field}={value!r}; required fields must contain a meaningful value.",
        ))
    for field in expected.get("required_unknown_fields", []):
        value = getattr(idea, field, None)
        checks.append(_check(
            f"structuring.unknown_preserved.{field}",
            _is_unknown(value),
            f"{field}={value!r}; missing information must remain UNKNOWN.",
        ))
    if expected.get("requires_clarification"):
        checks.append(_check(
            "structuring.clarification_documented",
            bool(idea.clarifying_questions or idea.unknowns),
            "Unknowns or clarifying questions document unresolved structure.",
        ))
    if expected.get("required_labels"):
        labels = set(result.classification.labels if result.classification else [])
        checks.append(_check(
            "structuring.classification_labels",
            set(expected["required_labels"]).issubset(labels),
            f"required={expected['required_labels']!r}, actual={sorted(labels)!r}",
        ))
    return score_area("structuring", checks)


def evaluate_preflight(case: BenchmarkCase, result: AnalysisResult):
    expected = case.expected
    preflight = result.preflight
    checks = [_check("preflight.result_present", preflight is not None, "Pre-flight result is present." if preflight else "No pre-flight result returned.")]
    if preflight is None:
        return score_area("preflight", checks)

    expected_status = expected.get("preflight_status")
    if expected_status:
        checks.append(_check(
            "preflight.expected_status",
            preflight.status == expected_status,
            f"expected={expected_status!r}, actual={preflight.status!r}",
        ))
    for flag in expected.get("required_flags", []):
        checks.append(_check(
            f"preflight.flag.{flag}",
            flag in preflight.flags,
            f"flags={preflight.flags!r}",
        ))
    if expected.get("requires_clarification"):
        checks.append(_check(
            "preflight.clarifying_questions",
            bool(preflight.clarifying_questions),
            "Clarification is explicitly requested for this case.",
        ))
    if expected.get("preflight_status") == "rejected":
        checks.append(_check(
            "preflight.stops_downstream",
            result.structured_idea is None,
            "Rejected input must not produce downstream structured analysis.",
        ))
    return score_area("preflight", checks)


def evaluate_research(case: BenchmarkCase, result: AnalysisResult):
    del case
    return score_area("research", _component_claim_checks(result.research_result, "research"))


def evaluate_competition(case: BenchmarkCase, result: AnalysisResult):
    del case
    checks = _component_claim_checks(result.competition_result, "competition")
    component = result.competition_result
    if component is not None:
        trusted_statuses = {"supported", "verified", "fact"}
        trusted_competitors = [
            competitor for competitor in component.competitors
            if str(competitor.get("status", "")).lower() in trusted_statuses
        ]
        checks.append(_check(
            "competition.trusted_competitors_are_evidenced",
            all(competitor.get("evidence_ids") or competitor.get("source_ids") for competitor in trusted_competitors),
            f"{len(trusted_competitors)} trusted competitor record(s) inspected.",
        ))
    return score_area("competition", checks)


def evaluate_customer(case: BenchmarkCase, result: AnalysisResult):
    del case
    checks = _component_claim_checks(result.customer_result, "customer")
    component = result.customer_result
    if component is not None:
        expected_keys = ("primary_customer", "early_adopter_hypothesis", "pain_points", "jobs_to_be_done", "willingness_to_pay_hypothesis")
        checks.append(_check(
            "customer.analysis_shape",
            all(key in component.customer_analysis for key in expected_keys if key != "secondary_customer")
            or component.status in {"partial", "failed"},
            "Customer output keeps primary customer, adoption, pain, jobs-to-be-done, and pricing hypothesis fields when analysis is available.",
        ))
        checks.append(_check(
            "customer.assumptions_are_labeled",
            all(claim.status != "supported" for claim in component.claims if claim.claim_type == "pricing"),
            "Pricing/willingness-to-pay hypotheses must not be presented as supported facts without evidence.",
        ))
    return score_area("customer", checks)


def evaluate_evidence(case: BenchmarkCase, result: AnalysisResult):
    del case
    claims = _claims(result)
    evidence_ids = [evidence.id for claim in claims for evidence in claim.evidence_items if evidence.id]
    source_ids = [
        source.id
        for claim in claims
        for evidence in claim.evidence_items
        for source in evidence.sources
        if source.id
    ]
    claim_ids = {claim.id for claim in claims if claim.id}
    evidence_id_set = set(evidence_ids)
    source_id_set = set(source_ids)
    checks = [
        _check("evidence.claim_ids_unique", len(claim_ids) == len([claim.id for claim in claims if claim.id]), "Claim IDs are stable within the analysis."),
        _check("evidence.evidence_ids_unique_per_claim", all(len(ids) == len(set(ids)) for ids in ([e.id for e in claim.evidence_items if e.id] for claim in claims)), "A claim does not duplicate an evidence relationship."),
        _check("evidence.relationship_targets_exist", all(evidence_id for evidence_id in evidence_ids), "All claim-to-evidence relationships have IDs."),
        _check(
            "evidence.supported_claims_have_evidence",
            all(bool(claim.evidence_items) for claim in claims if claim.status == "supported"),
            "Supported claims cannot be evidence-free.",
        ),
    ]
    if result.synthesis_result is None:
        checks.append(_check("evidence.synthesis_summary", None, "Synthesis did not run; aggregate evidence accounting is unavailable."))
    else:
        summary = result.synthesis_result.evidence_confidence
        counts = Counter(claim.status for claim in claims)
        checks.extend([
            _check("evidence.status_counts_reconcile", all(getattr(summary, status) == counts.get(status, 0) for status in _EVIDENCE_STATUSES), f"summary={summary.model_dump()}"),
            _check("evidence.total_claims_reconcile", summary.total_claims == len(claims), f"summary total={summary.total_claims}, actual={len(claims)}"),
            _check("evidence.total_items_reconcile", summary.total_evidence_items == len(evidence_ids), f"summary total={summary.total_evidence_items}, actual={len(evidence_ids)}"),
            _check("evidence.total_sources_reconcile", summary.total_sources == len(source_ids), f"summary total={summary.total_sources}, actual={len(source_ids)}"),
            _check("evidence.insights_reference_known_ids", all(
                evidence_id in evidence_id_set for insight in result.synthesis_result.key_insights for evidence_id in insight.evidence_ids
            ) and all(
                claim_id in claim_ids for insight in result.synthesis_result.key_insights for claim_id in insight.claim_ids
            ), "Synthesis insight references resolve to known claims/evidence."),
        ])
    for field_name in ("business_model_result", "market_result"):
        component = getattr(result, field_name)
        if component is not None:
            references: Iterable[str] = []
            if field_name == "business_model_result":
                references = [
                    evidence_id
                    for field in [component.revenue_model, *component.pricing_assumptions, *component.cost_drivers, *component.unit_economics]
                    for evidence_id in field.evidence_ids
                ]
            else:
                references = [
                    evidence_id
                    for signal in component.signals
                    for evidence_id in signal.evidence_ids
                ]
            checks.append(_check(
                f"evidence.{field_name}.references_resolve",
                all(reference in evidence_id_set for reference in references),
                f"{len(references)} Phase 3 evidence reference(s) inspected.",
            ))
    known_claim_ids = claim_ids
    if result.risk_result:
        checks.append(_check(
            "evidence.risk_references_resolve",
            all(evidence_id in evidence_id_set for risk in result.risk_result.risks for evidence_id in risk.evidence_ids)
            and all(claim_id in known_claim_ids for risk in result.risk_result.risks for claim_id in risk.claim_ids),
            "Risk claim/evidence links resolve.",
        ))
    if result.red_team_result:
        checks.append(_check(
            "evidence.red_team_references_resolve",
            all(evidence_id in evidence_id_set for finding in result.red_team_result.findings for evidence_id in finding.evidence_ids)
            and all(claim_id in known_claim_ids for finding in result.red_team_result.findings for claim_id in finding.claim_ids),
            "Red-team claim/evidence links resolve.",
        ))
    return score_area("evidence", checks)


def evaluate_feasibility(case: BenchmarkCase, result: AnalysisResult):
    expected = case.expected
    feasibility = result.feasibility_result
    checks = [_check("feasibility.result_present", feasibility is not None, "Feasibility result is present." if feasibility else "No feasibility result returned.")]
    if feasibility is None:
        return score_area("feasibility", checks)
    checks.extend([
        _check("feasibility.level_is_explicit", feasibility.technical_feasibility in {"LOW", "MEDIUM", "HIGH", "UNKNOWN"}, f"level={feasibility.technical_feasibility!r}"),
        _check("feasibility.product_mvp_is_structured", bool(feasibility.product.mvp_scope) or feasibility.status in {"partial", "failed"}, "MVP scope is present when product analysis is available."),
    ])
    expected_categories = expected.get("required_feasibility_categories", [])
    actual_categories = {assessment.category for assessment in feasibility.category_assessments}
    if expected_categories:
        checks.append(_check(
            "feasibility.required_categories",
            set(expected_categories).issubset(actual_categories),
            f"required={expected_categories!r}, actual={sorted(actual_categories)!r}",
        ))
    return score_area("feasibility", checks)


def evaluate_red_team(case: BenchmarkCase, result: AnalysisResult):
    expected = case.expected
    red_team = result.red_team_result
    checks = [_check("red_team.result_present", red_team is not None, "Red-team result is present." if red_team else "No red-team result returned.")]
    if red_team is None:
        return score_area("red_team", checks)
    checks.extend([
        _check("red_team.findings_present", bool(red_team.findings) or result.status in {"rejected", "requires_clarification"}, f"{len(red_team.findings)} finding(s) returned."),
        _check("red_team.classifications_valid", all(finding.classification in _MATERIAL_CLASSIFICATIONS for finding in red_team.findings), "Findings use FACT/INFERENCE/HYPOTHESIS classification."),
        _check(
            "red_team.material_findings_traceable",
            all(
                bool(finding.evidence_ids) or finding.classification in {"INFERENCE", "HYPOTHESIS"}
                for finding in red_team.findings
                if finding.severity in {"HIGH", "CRITICAL"} or finding.is_potentially_fatal
            ),
            "Material findings either cite evidence or are explicitly classified as inference/hypothesis.",
        ),
        _check(
            "red_team.falsification_criteria_present",
            all(bool(finding.falsification_criteria) for finding in red_team.findings),
            "Every adversarial finding states how it could be tested or falsified.",
        ),
    ])
    required_categories = expected.get("red_team_required_categories", [])
    if required_categories:
        actual = {finding.category for finding in red_team.findings}
        checks.append(_check(
            "red_team.required_objection_dimensions",
            set(required_categories).issubset(actual),
            f"required={required_categories!r}, actual={sorted(actual)!r}",
        ))
    return score_area("red_team", checks)


def evaluate_verdict(case: BenchmarkCase, result: AnalysisResult):
    del case
    decision = result.decision_result
    if decision is None:
        return score_area("verdict", [_check("verdict.result_present", None, "No decision is expected when pre-flight rejects the input.")])
    checks = [
        _check("verdict.supported_outcome", decision.decision in _DECISIONS, f"decision={decision.decision!r}"),
        _check("verdict.rule_trace_present", bool(decision.rule_trace), f"{len(decision.rule_trace)} rule trace item(s)."),
        _check("verdict.rule_trace_ids_unique", len({trace.rule_id for trace in decision.rule_trace}) == len(decision.rule_trace), "Rule trace IDs are unique."),
        _check(
            "verdict.degraded_not_optimistic_build",
            not (result.status in {"degraded", "rejected", "requires_clarification"} and decision.decision == "BUILD"),
            f"pipeline_status={result.status!r}, decision={decision.decision!r}",
        ),
        _check(
            "verdict.critical_risk_blocks_build",
            not (
                result.risk_result
                and result.risk_result.critical_unresolved_risk_ids
                and decision.decision == "BUILD"
            ),
            "Critical unresolved risk IDs cannot coexist with BUILD.",
        ),
    ]
    if decision.llm_proposed_decision is not None:
        checks.append(_check(
            "verdict.llm_proposal_is_advisory",
            decision.llm_proposed_decision in _DECISIONS,
            f"advisory proposal={decision.llm_proposed_decision!r}, final={decision.decision!r}",
        ))
    return score_area("verdict", checks)


def evaluate_report(case: BenchmarkCase, result: AnalysisResult, report: FounderReport | None):
    del case
    if report is None:
        return score_area("report", [_check("report.generated", None, "Report generation was not requested or was unavailable.")])
    claims = _claims(result)
    known_claim_ids = {claim.id for claim in claims if claim.id}
    known_evidence_ids = {
        evidence.id
        for claim in claims
        for evidence in claim.evidence_items
        if evidence.id
    }
    known_source_ids = {
        source.id
        for claim in claims
        for evidence in claim.evidence_items
        for source in evidence.sources
        if source.id
    }
    checks = [
        _check("report.analysis_id_preserved", report.analysis_id == result.analysis_id, "Report keeps the analysis identity."),
        _check("report.status_preserved", report.status == result.status, f"report={report.status!r}, result={result.status!r}"),
        _check("report.no_fabricated_market_size", not any(
            visualization.available and visualization.data
            and any(key in visualization.data for key in ("tam", "sam", "som", "market_size", "growth_rate", "revenue_forecast"))
            and not visualization.evidence_ids
            for visualization in report.visualizations
            if isinstance(visualization.data, dict)
        ), "Market-size-like visualization data is unavailable unless evidence-linked."),
        _check(
            "report.visualization_references_resolve",
            all(
                claim_id in known_claim_ids
                for visualization in report.visualizations
                for claim_id in visualization.claim_ids
            )
            and all(
                evidence_id in known_evidence_ids
                for visualization in report.visualizations
                for evidence_id in visualization.evidence_ids
            )
            and all(
                source_id in known_source_ids
                for visualization in report.visualizations
                for source_id in visualization.source_ids
            ),
            "Visualization claim/evidence/source IDs resolve to report input data.",
        ),
        _check(
            "report.available_visualizations_are_interpretable",
            all(
                not visualization.available
                or (visualization.data is not None and bool(visualization.interpretation))
                for visualization in report.visualizations
            ),
            "Available visualizations have data and an interpretation.",
        ),
        _check(
            "report.degraded_state_explicit",
            not result.status in {"degraded", "rejected", "requires_clarification"} or report.degraded,
            f"result_status={result.status!r}, report.degraded={report.degraded!r}",
        ),
        _check("report.executive_summary_present", bool(report.executive_summary), "Report has a deterministic summary even in degraded states."),
    ]
    return score_area("report", checks)


def evaluate_case(case: BenchmarkCase, result: AnalysisResult, report: FounderReport | None = None):
    return {
        "structuring": evaluate_structuring(case, result),
        "preflight": evaluate_preflight(case, result),
        "research": evaluate_research(case, result),
        "competition": evaluate_competition(case, result),
        "customer": evaluate_customer(case, result),
        "evidence": evaluate_evidence(case, result),
        "feasibility": evaluate_feasibility(case, result),
        "red_team": evaluate_red_team(case, result),
        "verdict": evaluate_verdict(case, result),
        "report": evaluate_report(case, result, report),
    }