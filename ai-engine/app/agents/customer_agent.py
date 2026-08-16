"""
Customer Agent: Analyze primary customer, pain points, jobs-to-be-done, alternatives.

PROVENANCE HONESTY: like competition_agent.py, this agent uses a static
heuristic template rather than a real research provider, so its claims are
capped at "hypothesis" status — see competition_agent.py's module docstring
for the full rationale. Willingness-to-pay and pain-point claims here are
explicitly hypotheses, never presented as verified facts.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.graph.state import GraphState
from app.schemas.evidence import Claim, CustomerResult, Evidence, Source
from app.core.logging import logger


async def customer_agent(state: GraphState) -> dict[str, Any]:
    """
    Customer Agent: Analyze primary customer, pain points, jobs-to-be-done, alternatives.

    Inputs: structured_idea, classification
    Outputs: customer_result with customer analysis
    """
    try:
        if not state.structured_idea:
            return {
                "customer_status": "failed",
                "customer_errors": ["No structured idea available"],
            }

        result = CustomerResult()
        idea = state.structured_idea

        # Detect AI education context
        is_ai_education = False
        idea_text = (state.raw_idea or "").lower()
        if "ai tutor" in idea_text or "education" in idea_text or "learning" in idea_text:
            is_ai_education = True
        if idea.industry_category and idea.industry_category.lower() in {
            "education", "edtech", "ai education"
        }:
            is_ai_education = True

        if idea.target_customer:
            result.customer_analysis["primary_customer"] = idea.target_customer
            result.customer_analysis["secondary_customer"] = (
                "Academic institutions / instructors" if is_ai_education else "unknown"
            )
            result.customer_analysis["early_adopter_hypothesis"] = (
                "College students needing immediate homework help or adapted explanations"
                if is_ai_education else "Early adopters in target segment"
            )
            result.customer_analysis["jobs_to_be_done"] = (
                [
                    "Understand complex academic concepts adapted to individual pace",
                    "Receive instant, cost-effective tutoring help outside classroom hours",
                ]
                if is_ai_education else ["Address specific needs within target category"]
            )
            result.customer_analysis["pain_points"] = (
                [
                    "High cost of traditional 1-on-1 human tutoring",
                    "Lack of personalized adaptation in standard online learning platforms",
                ]
                if is_ai_education else ["Friction in current alternatives"]
            )
            result.customer_analysis["willingness_to_pay_hypothesis"] = (
                "$5 to $15 per month subscription tier"
                if is_ai_education else "Subscription or transactional fee"
            )

            # Hypothesis: Willingness to pay (no hard evidence)
            wtp_hypothesis = Claim(
                id=str(uuid.uuid4()),
                claim_text="College students are willing to pay a monthly fee of $10 for AI tutoring.",
                claim_type="pricing",
                status="hypothesis",
                confidence=0.4,
                evidence_items=[],
                provenance={"agent": "customer", "note": "Assumed subscription pricing model"},
            )
            result.claims.append(wtp_hypothesis)

            # Hypothesis: Pain point
            pain_hypothesis = Claim(
                id=str(uuid.uuid4()),
                claim_text=f"Target customer {idea.target_customer} faces high friction due to tutoring costs.",
                claim_type="customer_need",
                status="hypothesis",
                confidence=0.5,
                evidence_items=[],
                provenance={"agent": "customer", "note": "Pain point hypothesis"},
            )
            result.claims.append(pain_hypothesis)

            # Illustrative demand-signal claim (NOT a verified citation — see
            # module-level note in competition_agent.py for why static
            # heuristic templates cannot honestly claim "supported" status).
            if is_ai_education:
                source_adopt = Source(
                    id=str(uuid.uuid4()),
                    url="https://example.com/edtech-trends",
                    title="[MOCK] EdTech adoption stats",
                    publisher_domain="example.com",
                    source_type="web",
                    retrieval_status="success",
                    credibility_notes=(
                        "Illustrative/mock figure from a static heuristic template, not a real "
                        "citation. Do not treat as verified market research."
                    ),
                    created_at=datetime.now(timezone.utc),
                )
                evidence_adopt = Evidence(
                    id=str(uuid.uuid4()),
                    excerpt="[MOCK] Illustrative adoption figure, not a verified citation: AI tutoring adoption grew ~40% YoY in 2024.",
                    evidence_type="tangential",
                    confidence=0.3,
                    relevance_notes="Illustrative only — not a verified source.",
                    sources=[source_adopt],
                )
                claim_adopt = Claim(
                    id=str(uuid.uuid4()),
                    claim_text="Hypothesis: students are likely adopting digital tutoring and AI education solutions at a growing rate, based on general market sentiment rather than a specific citation.",
                    claim_type="demand_signal",
                    status="hypothesis",
                    confidence=0.3,
                    evidence_items=[evidence_adopt],
                    provenance={"agent": "customer", "note": "Illustrative/mock — not verified market research.", "mock_data": True},
                )
                result.claims.append(claim_adopt)
                result.sources.append(source_adopt)

            result.status = "success"

        else:
            result.customer_analysis["primary_customer"] = "unknown"
            result.errors.append("Target customer is not specified")

            generic_hypothesis = Claim(
                id=str(uuid.uuid4()),
                claim_text="There is a target customer segment requiring these services.",
                claim_type="customer_need",
                status="hypothesis",
                confidence=0.3,
                evidence_items=[],
                provenance={"agent": "customer", "note": "Generic segment hypothesis"},
            )
            result.claims.append(generic_hypothesis)
            result.status = "partial"

        logger.info(f"Customer analysis completed: {result.status}")

        return {
            "customer_result": result,
            "customer_status": result.status,
            "customer_errors": result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Customer agent failed")
        return {
            "customer_status": "failed",
            "customer_errors": [f"Customer agent failed: {exc}"],
        }

