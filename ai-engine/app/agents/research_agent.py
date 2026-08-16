from __future__ import annotations

from typing import Any

from app.graph.state import GraphState
from app.services.research_service import conduct_research
from app.services.research_provider import get_research_provider
from app.core.logging import logger


async def research_agent(state: GraphState) -> dict[str, Any]:
    """
    Research Agent: Investigate market, industry, trends, technology, regulatory.

    Inputs: structured_idea, classification
    Outputs: research_result with claims, evidence, sources
    """
    try:
        if not state.structured_idea:
            return {
                "research_status": "failed",
                "research_errors": ["No structured idea available"],
            }

        # Use industry category or fall back to classification labels
        industry = state.structured_idea.industry_category
        if not industry and state.classification and state.classification.labels:
            valid_labels = [
                lbl for lbl in state.classification.labels
                if lbl not in {"Unspecified", "General"}
            ]
            if valid_labels:
                industry = valid_labels[0]
        if not industry:
            industry = "technology"

        # Conduct research using the configured provider (settings.research_provider)
        research_result = await conduct_research(
            idea_text=state.raw_idea,
            industry=industry,
            research_provider=get_research_provider(),
        )

        logger.info(f"Research completed: {research_result.status}")

        return {
            "research_result": research_result,
            "research_status": research_result.status,
            "research_errors": research_result.errors,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("Research agent failed")
        return {
            "research_status": "failed",
            "research_errors": [f"Research agent failed: {exc}"],
        }

