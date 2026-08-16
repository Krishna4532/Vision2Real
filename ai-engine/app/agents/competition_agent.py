"""
Competition Agent: Analyze direct competitors, indirect competitors, substitutes, alternatives.

IMPORTANT — PROVENANCE HONESTY:
This agent does not currently call any real search/research provider (unlike
research_agent.py, which routes through BaseResearchProvider). Its
competitor list below is a static, hand-authored illustrative template keyed
off idea category, not the output of a live competitive intelligence lookup.

That means it cannot honestly produce "supported" (fact-level, cited-to-a-
real-source) claims about real companies' real pricing. Doing so would be
presenting fabricated data as verified market research, which is explicitly
prohibited. Every claim this agent produces is therefore capped at
"hypothesis" status: a plausible, named illustration of what the competitive
landscape likely looks like, clearly flagged as such in claim text,
provenance, and source credibility_notes, pending a real competitive-intel
provider in a later phase (see the `get_research_provider()` pattern in
research_provider.py for how that abstraction should be wired once added).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.graph.state import GraphState
from app.schemas.evidence import Claim, CompetitionResult, Evidence, Source
from app.core.logging import logger

_MOCK_DISCLAIMER = (
    "Illustrative/mock competitive landscape generated from a static heuristic "
    "template, not a real search or citation. Do not treat as verified market "
    "research."
)


async def competition_agent(state: GraphState) -> dict[str, Any]:
    """
    Competition Agent: Analyze direct competitors, indirect competitors, substitutes, alternatives.

    Inputs: structured_idea, classification
    Outputs: competition_result with hypothesis-level claims about competitors
    (see module docstring for why these are capped at "hypothesis").
    """
    try:
        if not state.structured_idea:
            return {
                "competition_status": "failed",
                "competition_errors": ["No structured idea available"],
            }

        result = CompetitionResult()
        idea = state.structured_idea

        # Check if the idea is in the AI tutor / AI education category
        is_ai_education = False
        idea_text = (state.raw_idea or "").lower()
        if "ai tutor" in idea_text or "education" in idea_text or "learning" in idea_text:
            is_ai_education = True
        if idea.industry_category and idea.industry_category.lower() in {
            "education", "edtech", "ai education"
        }:
            is_ai_education = True

        if is_ai_education:
            # 1. Direct competitor: Khanmigo (illustrative, not a verified citation)
            source_khan = Source(
                id=str(uuid.uuid4()),
                url="https://example.com/khanmigo-pricing",
                title="[MOCK] Khan Academy Khanmigo Launch and Pricing Update",
                publisher_domain="example.com",
                source_type="news",
                retrieval_status="success",
                credibility_notes=_MOCK_DISCLAIMER,
                created_at=datetime.now(timezone.utc),
            )
            evidence_khan = Evidence(
                id=str(uuid.uuid4()),
                excerpt="[MOCK] Illustrative pricing figure, not a verified citation: ~$4/month for individual users.",
                evidence_type="tangential",
                confidence=0.3,
                relevance_notes=_MOCK_DISCLAIMER,
                sources=[source_khan],
            )
            claim_khan = Claim(
                id=str(uuid.uuid4()),
                claim_text="Hypothesis: a direct competitor resembling Khan Academy's Khanmigo likely exists in this space, priced around $4/month.",
                claim_type="pricing",
                status="hypothesis",
                confidence=0.3,
                evidence_items=[evidence_khan],
                provenance={"agent": "competition", "note": _MOCK_DISCLAIMER, "mock_data": True},
            )
            result.claims.append(claim_khan)
            result.sources.append(source_khan)
            result.competitors.append({
                "name": "Khanmigo (Khan Academy)",
                "type": "direct",
                "pricing": "$4/month (illustrative, unverified)",
                "status": "hypothesis",
            })

            # 2. Indirect competitor: Duolingo Max (illustrative, not a verified citation)
            source_duo = Source(
                id=str(uuid.uuid4()),
                url="https://example.com/duolingo-max",
                title="[MOCK] Duolingo Max Feature Set and Pricing Structure",
                publisher_domain="example.com",
                source_type="news",
                retrieval_status="success",
                credibility_notes=_MOCK_DISCLAIMER,
                created_at=datetime.now(timezone.utc),
            )
            evidence_duo = Evidence(
                id=str(uuid.uuid4()),
                excerpt="[MOCK] Illustrative pricing figure, not a verified citation: ~$30/month subscription.",
                evidence_type="tangential",
                confidence=0.3,
                relevance_notes=_MOCK_DISCLAIMER,
                sources=[source_duo],
            )
            claim_duo = Claim(
                id=str(uuid.uuid4()),
                claim_text="Hypothesis: an indirect competitor resembling Duolingo Max likely exists in this space, priced around $30/month.",
                claim_type="pricing",
                status="hypothesis",
                confidence=0.3,
                evidence_items=[evidence_duo],
                provenance={"agent": "competition", "note": _MOCK_DISCLAIMER, "mock_data": True},
            )
            result.claims.append(claim_duo)
            result.sources.append(source_duo)
            result.competitors.append({
                "name": "Duolingo Max",
                "type": "indirect",
                "pricing": "$30/month (illustrative, unverified)",
                "status": "hypothesis",
            })

            # 3. Substitute: Traditional Private Tutoring (general market inference)
            claim_traditional = Claim(
                id=str(uuid.uuid4()),
                claim_text="Traditional human tutoring likely represents a substitute with high cost variance ($20-$80/hr), based on general market knowledge rather than a specific citation.",
                claim_type="pricing",
                status="hypothesis",
                confidence=0.4,
                evidence_items=[],
                provenance={"agent": "competition", "note": "General market understanding, not a specific source."},
            )
            result.claims.append(claim_traditional)
            result.competitors.append({
                "name": "Traditional Human Tutoring",
                "type": "substitute",
                "pricing": "Variable ($20-$80/hour, illustrative)",
                "status": "hypothesis",
            })

            result.status = "success"

        else:
            # Non-AI education idea — register hypothesis only
            if idea.industry_category:
                claim_generic = Claim(
                    id=str(uuid.uuid4()),
                    claim_text=f"There are likely competitors in the {idea.industry_category} category.",
                    claim_type="competitive_advantage",
                    status="hypothesis",
                    confidence=0.4,
                    evidence_items=[],
                    provenance={"agent": "competition", "note": "Generic category assumption"},
                )
                result.claims.append(claim_generic)

            result.status = "partial" if result.claims else "failed"
            if not result.claims:
                result.errors.append("No competitors could be identified for this idea category.")

        logger.info(f"Competition analysis completed: {result.status}")

        return {
            "competition_result": result,
            "competition_status": result.status,
            "competition_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Competition agent failed")
        return {
            "competition_status": "failed",
            "competition_errors": [f"Competition agent failed: {exc}"],
        }
