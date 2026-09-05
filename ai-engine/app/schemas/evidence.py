from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SourceMetadata(BaseModel):
    """Structured metadata for a research source."""
    url: str | None = None
    title: str | None = None
    publisher_domain: str | None = None
    publication_date: datetime | None = None
    retrieval_date: datetime | None = None
    source_type: Literal["web", "document", "research", "news", "academic", "other"] | None = None
    credibility_notes: str | None = None
    additional_metadata: dict[str, Any] = Field(default_factory=dict)


class Source(BaseModel):
    """A source of information/evidence."""
    id: str | None = None
    url: str | None = None
    title: str | None = None
    publisher_domain: str | None = None
    publication_date: datetime | None = None
    retrieval_date: datetime | None = None
    source_type: str = "web"
    credibility_notes: str | None = None
    credibility_score: float | None = None
    retrieval_status: str = "pending"
    additional_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class Evidence(BaseModel):
    """Evidence supporting or relating to a claim."""
    id: str | None = None
    excerpt: str | None = None
    evidence_type: Literal["direct", "supporting", "contradicting", "tangential"] = "direct"
    confidence: float | None = None
    relevance_notes: str | None = None
    created_at: datetime | None = None
    sources: list[Source] = Field(default_factory=list)


class Claim(BaseModel):
    """A factual claim made during analysis.

    Canonical evidence contract for Phase 2 production intelligence.
    Every future agent should populate these fields consistently so evidence,
    provenance, uncertainty, contradiction pressure, and downstream impact are
    preserved instead of being hidden in narrative text.
    """
    id: str | None = None
    analysis_id: str | None = None
    claim_text: str
    claim_type: Literal[
        "market_size",
        "demand_signal",
        "competitive_advantage",
        "customer_need",
        "technology_trend",
        "regulatory",
        "pricing",
        "market_trend",
        "other",
    ] = "other"
    status: Literal["supported", "inference", "hypothesis", "unsupported", "unknown"] = "unknown"
    confidence: float | None = None
    confidence_reason: str = ""
    evidence_basis: Literal["VERIFIED", "INFERRED", "HYPOTHESIS", "INSUFFICIENT_EVIDENCE"] = "INSUFFICIENT_EVIDENCE"
    provenance: dict[str, Any] = Field(default_factory=dict)
    evidence_items: list[Evidence] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    unknowns: list[dict[str, Any]] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    contradictions: list[dict[str, Any]] = Field(default_factory=list)
    decision_impact: list[dict[str, Any]] = Field(default_factory=list)
    reasoning_summary: str = ""
    created_at: datetime | None = None


class ResearchResult(BaseModel):
    """Results from the Research Agent."""
    status: Literal["success", "partial", "failed"] = "failed"
    claims: list[Claim] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    search_queries: list[str] = Field(default_factory=list)
    findings: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


class CompetitionResult(BaseModel):
    """Results from the Competition Agent."""
    status: Literal["success", "partial", "failed"] = "failed"
    competitors: list[dict[str, Any]] = Field(default_factory=list)
    competitive_analysis: dict[str, Any] = Field(default_factory=dict)
    claims: list[Claim] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    findings: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


class CustomerResult(BaseModel):
    """Results from the Customer Agent."""
    status: Literal["success", "partial", "failed"] = "failed"
    customer_analysis: dict[str, Any] = Field(default_factory=dict)
    claims: list[Claim] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    findings: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
