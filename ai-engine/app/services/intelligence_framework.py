from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Literal

from pydantic import BaseModel, Field

EvidenceClassification = Literal[
    "VERIFIED",
    "INFERRED",
    "HYPOTHESIS",
    "INSUFFICIENT_EVIDENCE",
]

DecisionDomain = Literal[
    "Research",
    "Competition",
    "Customer",
    "Market",
    "Business Model",
    "Financial",
    "Feasibility",
    "Risk",
    "Red Team",
    "Validation Plan",
    "Decision",
    "Report",
]


class ClaimUnknown(BaseModel):
    description: str
    why_it_matters: str
    affected_agents: list[str] = Field(default_factory=list)
    blocking: bool = False
    status: Literal["open", "resolved"] = "open"


class DecisionImpact(BaseModel):
    component: str
    dependency: str
    reason: str = ""


class ContradictionRecord(BaseModel):
    conflicting_claim_ids: list[str] = Field(default_factory=list)
    affected_evidence_ids: list[str] = Field(default_factory=list)
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    affected_decisions: list[str] = Field(default_factory=list)
    recommended_validation: str = ""
    rationale: str = ""


class ClaimEvidenceQuality(BaseModel):
    evidence_quality_score: float = 0.0
    source_credibility_score: float = 0.0
    independent_source_count: int = 0
    contradiction_pressure: float = 0.0
    unknown_pressure: float = 0.0
    missing_critical_evidence: int = 0
    confidence_score: float = 0.0
    confidence_reason: str = ""


class EvidenceProvenance(BaseModel):
    source_ids: list[str] = Field(default_factory=list)
    source_titles: list[str] = Field(default_factory=list)
    retrieval_method: str = "unknown"
    captured_at: datetime | None = None
    notes: str | None = None


class EvidenceSufficiencyEngine:
    """Deterministic evidence sufficiency classification for founder-facing analysis."""

    @staticmethod
    def _unique_source_count(claim: Any) -> int:
        source_ids: set[str] = set()
        for evidence in getattr(claim, "evidence_items", []) or []:
            for source in getattr(evidence, "sources", []) or []:
                source_id = getattr(source, "id", None) or getattr(source, "url", None) or ""
                if source_id:
                    source_ids.add(source_id)
        return len(source_ids)

    @staticmethod
    def _source_credibility_score(claim: Any) -> float:
        scores: list[float] = []
        for evidence in getattr(claim, "evidence_items", []) or []:
            for source in getattr(evidence, "sources", []) or []:
                credibility = getattr(source, "credibility_score", None)
                if credibility is not None:
                    scores.append(float(credibility))
        if not scores:
            return 0.0
        return min(1.0, sum(scores) / len(scores))

    @staticmethod
    def _contradiction_pressure(claim: Any) -> float:
        contradictions = getattr(claim, "contradictions", []) or []
        if not contradictions:
            return 0.0
        return min(1.0, len(contradictions) / 4.0)

    @staticmethod
    def _unknown_pressure(claim: Any) -> float:
        unknowns = getattr(claim, "unknowns", []) or []
        if not unknowns:
            return 0.0
        blocking = sum(1 for item in unknowns if getattr(item, "blocking", False))
        return min(1.0, (blocking + len(unknowns)) / 6.0)

    @staticmethod
    def _missing_critical_evidence_count(claim: Any) -> int:
        missing = getattr(claim, "missing_evidence", []) or []
        return len(missing)

    @staticmethod
    def evaluate_quality(claim: Any) -> ClaimEvidenceQuality:
        evidence_items = getattr(claim, "evidence_items", []) or []
        independent_sources = EvidenceSufficiencyEngine._unique_source_count(claim)
        source_credibility = EvidenceSufficiencyEngine._source_credibility_score(claim)
        contradiction_pressure = EvidenceSufficiencyEngine._contradiction_pressure(claim)
        unknown_pressure = EvidenceSufficiencyEngine._unknown_pressure(claim)
        missing_count = EvidenceSufficiencyEngine._missing_critical_evidence_count(claim)

        evidence_quality = 0.0
        if evidence_items:
            evidence_quality = min(
                1.0,
                0.45 * min(1.0, len(evidence_items) / 3.0)
                + 0.35 * source_credibility
                + 0.20 * min(1.0, independent_sources / 2.0),
            )

        score = evidence_quality
        score -= 0.20 * contradiction_pressure
        score -= 0.15 * unknown_pressure
        score -= 0.10 * min(1.0, missing_count / 3.0)
        score = max(0.0, min(1.0, score))

        if not evidence_items and not independent_sources:
            reason = "No direct evidence; claim is unsupported."
        elif contradiction_pressure > 0.4:
            reason = "Evidence is weakened by unresolved contradictions."
        elif unknown_pressure > 0.4:
            reason = "Critical unknowns remain unresolved."
        elif missing_count > 0:
            reason = "Critical evidence is still missing for a confident conclusion."
        else:
            reason = "Evidence is present and materially aligned with the claim."

        return ClaimEvidenceQuality(
            evidence_quality_score=round(score, 4),
            source_credibility_score=round(source_credibility, 4),
            independent_source_count=independent_sources,
            contradiction_pressure=round(contradiction_pressure, 4),
            unknown_pressure=round(unknown_pressure, 4),
            missing_critical_evidence=missing_count,
            confidence_score=round(score, 4),
            confidence_reason=reason,
        )

    @staticmethod
    def classify_claim(claim: Any) -> EvidenceClassification:
        evidence_items = getattr(claim, "evidence_items", []) or []
        if len(evidence_items) == 0:
            return "INSUFFICIENT_EVIDENCE"

        quality = EvidenceSufficiencyEngine.evaluate_quality(claim)
        if quality.evidence_quality_score >= 0.75 and quality.independent_source_count >= 2 and quality.contradiction_pressure <= 0.15:
            return "VERIFIED"
        if quality.evidence_quality_score >= 0.45 and quality.source_credibility_score >= 0.35:
            return "INFERRED"
        if quality.evidence_quality_score >= 0.2:
            return "HYPOTHESIS"
        return "INSUFFICIENT_EVIDENCE"


class ConfidenceEngine:
    """Deterministic evidence-based confidence scoring."""

    @staticmethod
    def evaluate(claim: Any) -> float:
        quality = EvidenceSufficiencyEngine.evaluate_quality(claim)

        evidence_score = quality.evidence_quality_score
        source_score = quality.source_credibility_score
        independent_score = min(1.0, quality.independent_source_count / 2.0)
        contradiction_penalty = quality.contradiction_pressure
        unknown_penalty = quality.unknown_pressure
        missing_penalty = min(1.0, quality.missing_critical_evidence / 3.0)

        raw_score = (
            0.35 * evidence_score
            + 0.20 * source_score
            + 0.15 * independent_score
            + 0.10 * (1.0 - contradiction_penalty)
            + 0.10 * (1.0 - unknown_penalty)
            + 0.10 * (1.0 - missing_penalty)
        )
        return round(max(0.0, min(1.0, raw_score)), 4)

    @staticmethod
    def explain(claim: Any) -> str:
        quality = EvidenceSufficiencyEngine.evaluate_quality(claim)
        return (
            f"confidence={quality.confidence_score:.2f}; "
            f"independent_sources={quality.independent_source_count}; "
            f"contradiction_pressure={quality.contradiction_pressure:.2f}; "
            f"unknown_pressure={quality.unknown_pressure:.2f}; "
            f"missing_critical_evidence={quality.missing_critical_evidence}; "
            f"reason={quality.confidence_reason}"
        )


class UnknownManager:
    """Shared manager for unknown tracking and propagation."""

    @staticmethod
    def collect_from_claims(claims: Iterable[Any], agent_context: str = "system") -> list[ClaimUnknown]:
        unknowns: list[ClaimUnknown] = []
        for claim in claims:
            unknown_items = getattr(claim, "unknowns", []) or []
            for item in unknown_items:
                if not isinstance(item, ClaimUnknown):
                    unknowns.append(ClaimUnknown(**item) if isinstance(item, dict) else ClaimUnknown(description=str(item), why_it_matters="Unknown from analysis."))
                else:
                    unknowns.append(item)
        deduped: list[ClaimUnknown] = []
        seen: set[str] = set()
        for item in unknowns:
            key = (item.description, tuple(sorted(item.affected_agents)))
            if key in seen:
                continue
            deduped.append(item)
            seen.add(key)
        return deduped

    @staticmethod
    def propagate_unknowns(unknowns: list[ClaimUnknown], downstream_agents: list[str]) -> list[ClaimUnknown]:
        propagated: list[ClaimUnknown] = []
        for unknown in unknowns:
            item = unknown.model_copy()
            if not item.affected_agents:
                item.affected_agents = downstream_agents
            propagated.append(item)
        return propagated


class ContradictionEngine:
    """Shared contradiction detection built around evidence-bearing claims."""

    @staticmethod
    def detect_from_claims(claims: Iterable[Any]) -> list[ContradictionRecord]:
        record_list: list[ContradictionRecord] = []
        claims = list(claims)
        for idx, claim in enumerate(claims):
            contradictions = getattr(claim, "contradictions", []) or []
            for contradiction in contradictions:
                if isinstance(contradiction, dict):
                    record = ContradictionRecord(**contradiction)
                else:
                    record = contradiction
                record_list.append(record)

        deduped: list[ContradictionRecord] = []
        seen: set[tuple[str, ...]] = set()
        for record in record_list:
            key = tuple(sorted(record.conflicting_claim_ids))
            if not record.conflicting_claim_ids:
                key = (f"manual:{len(deduped)}",)
            if key in seen:
                continue
            deduped.append(record)
            seen.add(key)
        return deduped


class DecisionImpactTracker:
    """Tracks which downstream components will be affected by a claim."""

    @staticmethod
    def from_claim(claim: Any, domains: list[DecisionDomain] | None = None) -> list[DecisionImpact]:
        domains = domains or [
            "Research",
            "Competition",
            "Customer",
            "Market",
            "Business Model",
            "Financial",
            "Feasibility",
            "Risk",
            "Red Team",
            "Validation Plan",
            "Decision",
        ]
        impact: list[DecisionImpact] = []
        for domain in domains:
            impact.append(
                DecisionImpact(
                    component=domain,
                    dependency=domain,
                    reason=f"Claim '{getattr(claim, 'claim_text', 'unknown')}' can influence {domain.lower()} reasoning.",
                )
            )
        return impact


def enforce_quality_gate(claims: Iterable[Any]) -> list[Any]:
    """Production gate for claim admission into canonical agent state.

    Unsupported or evidence-empty findings are not silently accepted. They are
    downgraded to explicit insufficient-evidence findings and retain their
    unknowns, contradictions, and provenance metadata.
    """
    normalized: list[Any] = []
    for claim in claims:
        if claim is None:
            continue

        if not hasattr(claim, "claim_text"):
            continue

        basis = EvidenceSufficiencyEngine.classify_claim(claim)
        claim.evidence_basis = basis

        if basis == "INSUFFICIENT_EVIDENCE":
            claim.status = "unsupported"
            claim.confidence = 0.0
            claim.confidence_reason = "Insufficient Evidence."
            claim.reasoning_summary = claim.reasoning_summary or "Insufficient Evidence."
            claim.unknowns = list(getattr(claim, "unknowns", []) or []) or [{
                "description": "Evidence missing for this finding",
                "why_it_matters": "This finding cannot be trusted without supporting evidence.",
                "affected_agents": ["system"],
                "blocking": True,
                "status": "open",
            }]
            if not getattr(claim, "missing_evidence", None):
                claim.missing_evidence = ["No reliable evidence or source provenance was available for this finding."]
            claim.decision_impact = list(getattr(claim, "decision_impact", []) or []) or [
                {"component": "Decision", "dependency": "Decision", "reason": "This finding remains unresolved and must not be treated as a fact."}
            ]
        else:
            claim.confidence = ConfidenceEngine.evaluate(claim)
            claim.confidence_reason = ConfidenceEngine.explain(claim)
            claim.reasoning_summary = (getattr(claim, "reasoning_summary", "") or "") or claim.confidence_reason
            claim.status = getattr(claim, "status", "unknown")
            if claim.status not in {"supported", "inference", "hypothesis", "unsupported", "unknown"}:
                claim.status = "unknown"

        if not getattr(claim, "decision_impact", None):
            claim.decision_impact = [
                impact.model_dump(mode="json") if hasattr(impact, "model_dump") else impact
                for impact in DecisionImpactTracker.from_claim(claim)
            ]

        normalized.append(claim)

    return normalized


@dataclass
class ProductionEvidenceContract:
    claim: str
    claim_type: str
    evidence: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    provenance: EvidenceProvenance = field(default_factory=EvidenceProvenance)
    confidence: float = 0.0
    confidence_reason: str = ""
    unknowns: list[ClaimUnknown] = field(default_factory=list)
    missing_evidence: list[str] = field(default_factory=list)
    contradictions: list[ContradictionRecord] = field(default_factory=list)
    decision_impact: list[DecisionImpact] = field(default_factory=list)
    reasoning_summary: str = ""
    evidence_basis: EvidenceClassification = "INSUFFICIENT_EVIDENCE"

    def to_claim_dict(self) -> dict[str, Any]:
        return {
            "claim_text": self.claim,
            "claim_type": self.claim_type,
            "evidence_items": self.evidence,
            "sources": self.sources,
            "provenance": self.provenance.model_dump(mode="json"),
            "confidence": self.confidence,
            "confidence_reason": self.confidence_reason,
            "unknowns": [item.model_dump(mode="json") for item in self.unknowns],
            "missing_evidence": self.missing_evidence,
            "contradictions": [item.model_dump(mode="json") for item in self.contradictions],
            "decision_impact": [item.model_dump(mode="json") for item in self.decision_impact],
            "reasoning_summary": self.reasoning_summary,
            "evidence_basis": self.evidence_basis,
        }


def build_contract_from_claim(claim: Any) -> ProductionEvidenceContract:
    evidence_basis = EvidenceSufficiencyEngine.classify_claim(claim)
    confidence = ConfidenceEngine.evaluate(claim)
    return ProductionEvidenceContract(
        claim=getattr(claim, "claim_text", ""),
        claim_type=getattr(claim, "claim_type", "other"),
        evidence=[str(getattr(item, "excerpt", "")) for item in getattr(claim, "evidence_items", []) or []],
        sources=[str(getattr(source, "title", getattr(source, "url", ""))) for item in getattr(claim, "evidence_items", []) or [] for source in getattr(item, "sources", []) or []],
        provenance=EvidenceProvenance(
            source_ids=[str(getattr(source, "id", getattr(source, "url", ""))) for item in getattr(claim, "evidence_items", []) or [] for source in getattr(item, "sources", []) or [] if getattr(source, "id", None) or getattr(source, "url", None)],
            source_titles=[str(getattr(source, "title", getattr(source, "url", ""))) for item in getattr(claim, "evidence_items", []) or [] for source in getattr(item, "sources", []) or []],
            captured_at=datetime.now(timezone.utc),
            notes=getattr(claim, "provenance", {}).get("notes") if isinstance(getattr(claim, "provenance", {}), dict) else None,
        ),
        confidence=confidence,
        confidence_reason=ConfidenceEngine.explain(claim),
        unknowns=UnknownManager.collect_from_claims([claim]),
        missing_evidence=list(getattr(claim, "missing_evidence", []) or []),
        contradictions=[ContradictionRecord(**item) for item in getattr(claim, "contradictions", []) or [] if isinstance(item, dict)],
        decision_impact=DecisionImpactTracker.from_claim(claim),
        reasoning_summary=getattr(claim, "reasoning_summary", "") or "",
        evidence_basis=evidence_basis,
    )
