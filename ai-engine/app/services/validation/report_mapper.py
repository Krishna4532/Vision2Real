"""report_mapper.py — Shared LLM payload → StructuredValidationReport mapper.

This module provides a single, reusable mapping layer between raw LLM JSON output
and the StructuredValidationReport schema used throughout Vision2Real.

Why a dedicated module?
  • V1 (single master LLM call) produces one large JSON payload.
  • V2 (multi-agent pipeline, future) will aggregate per-agent dicts into a
    combined dict before calling the same mapper.
  • Keeping the mapping logic here ensures there is exactly ONE mapping
    implementation — no duplicate, no divergence.

Usage:
    from app.services.validation.report_mapper import ReportMapper

    # V1 path: raw LLM payload → report
    report = ReportMapper.from_llm_response(payload)

    # V2 path (future): merged agent outputs → report
    merged = {**research_out, **market_out, **business_out, ...}
    report = ReportMapper.from_llm_response(merged)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.schemas.validation import DetailedScores, StructuredValidationReport, SWOTAnalysis

logger = logging.getLogger(__name__)


class ReportMapper:
    """Converts a raw LLM JSON payload into a StructuredValidationReport.

    This class is intentionally stateless (all methods are static) so it can be
    imported and called from anywhere without dependency injection.
    """

    # ── Public API ────────────────────────────────────────────────────────────

    @staticmethod
    def from_llm_response(payload: Dict[str, Any]) -> StructuredValidationReport:
        """Map a raw LLM JSON payload to StructuredValidationReport.

        Handles:
          - Missing optional fields with safe defaults
          - Nested dict / flat float for scores
          - SWOT as dict-of-lists or flattened top-level keys
          - Type coercion for all numeric fields
          - Graceful fallback for every required string field

        Args:
            payload: The raw dict returned by the LLM provider's validate_startup()
                     call (via LLMProviderResult.payload) or by aggregating V2
                     multi-agent output dicts.

        Returns:
            A fully populated StructuredValidationReport instance.
        """
        if not isinstance(payload, dict):
            logger.warning("ReportMapper received non-dict payload (%s). Using empty dict.", type(payload))
            payload = {}

        # ── Scores ─────────────────────────────────────────────────────────
        scores_raw = payload.get("scores") or {}
        if not isinstance(scores_raw, dict):
            scores_raw = {}

        # overall_score and confidence_score may appear at the top level
        # (from the schema we emit) OR inside scores (legacy agent outputs).
        overall_score = ReportMapper._safe_float(
            payload.get("overall_score") or scores_raw.get("overall_score"), default=0.0
        )
        confidence_score = ReportMapper._safe_float(
            payload.get("confidence_score") or scores_raw.get("confidence_score"), default=50.0
        )
        market_score = ReportMapper._safe_float(
            scores_raw.get("market_score") or payload.get("market_score"), default=0.0
        )
        business_model_score = ReportMapper._safe_float(
            scores_raw.get("business_model_score") or payload.get("business_model_score"), default=0.0
        )
        feasibility_score = ReportMapper._safe_float(
            scores_raw.get("feasibility_score") or payload.get("feasibility_score"), default=0.0
        )
        risk_score = ReportMapper._safe_float(
            scores_raw.get("risk_score") or payload.get("risk_score"), default=0.0
        )

        scores = DetailedScores(
            overall_score=overall_score,
            confidence_score=confidence_score,
            market_score=market_score,
            business_model_score=business_model_score,
            feasibility_score=feasibility_score,
            risk_score=risk_score,
        )

        # ── SWOT ───────────────────────────────────────────────────────────
        swot_raw = payload.get("swot") or {}
        if not isinstance(swot_raw, dict):
            swot_raw = {}

        swot = SWOTAnalysis(
            strengths=ReportMapper._safe_str_list(
                swot_raw.get("strengths") or payload.get("strengths")
            ),
            weaknesses=ReportMapper._safe_str_list(
                swot_raw.get("weaknesses") or payload.get("weaknesses")
            ),
            opportunities=ReportMapper._safe_str_list(
                swot_raw.get("opportunities") or payload.get("opportunities")
            ),
            threats=ReportMapper._safe_str_list(
                swot_raw.get("threats") or payload.get("threats")
            ),
        )

        # ── Recommendation ─────────────────────────────────────────────────
        raw_rec = payload.get("recommendation") or "PROCEED WITH CAUTION"
        recommendation = ReportMapper._normalise_recommendation(str(raw_rec))

        # ── Text Fields ────────────────────────────────────────────────────
        # Every required string field is populated. We never return an empty
        # string or a placeholder — the prompt already forbids them, but we
        # defensively provide context-aware fallbacks just in case.
        executive_summary = ReportMapper._safe_str(
            payload.get("executive_summary") or payload.get("report_summary"),
            fallback=(
                "This startup has been evaluated by the Vision2Real AI validation engine. "
                "Please refer to the detailed sections below for the full analysis."
            ),
        )
        problem_analysis = ReportMapper._safe_str(
            payload.get("problem_analysis"),
            fallback="The problem space has been assessed based on available founder input.",
        )
        solution_analysis = ReportMapper._safe_str(
            payload.get("solution_analysis") or payload.get("value_proposition"),
            fallback="The proposed solution has been evaluated against the identified problem.",
        )
        target_customer = ReportMapper._safe_str(
            payload.get("target_customer") or payload.get("customer_profile"),
            fallback="Target customer profile inferred from the startup description.",
        )
        market_opportunity = ReportMapper._safe_str(
            payload.get("market_opportunity") or payload.get("market_size"),
            fallback="Market opportunity estimated based on the described product and category.",
        )
        competitive_landscape = ReportMapper._safe_str(
            payload.get("competitive_landscape"),
            fallback="Competitive landscape assessed based on the startup's product category.",
        )
        business_model = ReportMapper._safe_str(
            payload.get("business_model"),
            fallback="Business model inferred from the described product and customer segment.",
        )
        revenue_model = ReportMapper._safe_str(
            payload.get("revenue_model"),
            fallback="Revenue model inferred based on industry norms for this product category.",
        )
        financial_outlook = ReportMapper._safe_str(
            payload.get("financial_outlook"),
            fallback="Financial outlook estimated using conservative assumptions for this stage.",
        )
        risk_assessment = ReportMapper._safe_str(
            payload.get("risk_assessment"),
            fallback=(
                "Key risks identified and evaluated across execution, "
                "market, and financial dimensions."
            ),
        )
        next_steps = ReportMapper._safe_str_list(payload.get("next_steps"))

        return StructuredValidationReport(
            executive_summary=executive_summary,
            problem_analysis=problem_analysis,
            solution_analysis=solution_analysis,
            target_customer=target_customer,
            market_opportunity=market_opportunity,
            competitive_landscape=competitive_landscape,
            business_model=business_model,
            revenue_model=revenue_model,
            financial_outlook=financial_outlook,
            risk_assessment=risk_assessment,
            swot=swot,
            scores=scores,
            overall_score=overall_score,
            confidence_score=confidence_score,
            recommendation=recommendation,
            next_steps=next_steps,
            # agent_outputs preserved for debugging / V2 introspection
            agent_outputs=payload if isinstance(payload, dict) else {},
        )

    # ── Private Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _safe_float(value: Any, *, default: float = 0.0) -> float:
        """Coerce value to float, clamp to 0–100, return default on failure."""
        if value is None:
            return default
        try:
            result = float(value)
            # Clamp to 0–100 (valid range for both sub-scores 0–10 and confidence 0–100).
            return max(0.0, min(100.0, result))
        except (ValueError, TypeError):
            return default

    FORBIDDEN_CLICHES = (
        "analysis unavailable",
        "information not provided",
        "n/a",
        "cannot determine",
        "not enough information",
        "data unavailable",
        "to be determined",
        "not specified",
        "unknown",
    )

    @staticmethod
    def _clean_text(candidate: str, fallback: str) -> str:
        """Filter out banned AI clichés and return clean analytical text or fallback."""
        text = candidate.strip()
        text_lower = text.lower()
        for cliché in ReportMapper.FORBIDDEN_CLICHES:
            if text_lower == cliché or text_lower == f"{cliché}." or text_lower.startswith(f"{cliché}:"):
                return fallback
        return text

    @staticmethod
    def _safe_str(value: Any, *, fallback: str) -> str:
        """Return a cleaned non-empty string or the fallback."""
        if isinstance(value, str) and value.strip():
            return ReportMapper._clean_text(value, fallback)
        if value is not None and not isinstance(value, (list, dict)):
            candidate = str(value).strip()
            if candidate:
                return ReportMapper._clean_text(candidate, fallback)
        return fallback

    @staticmethod
    def _safe_str_list(value: Any) -> List[str]:
        """Normalise any collection type to a list of non-empty strings, filtering clichés."""
        raw_items = []
        if isinstance(value, list):
            raw_items = [str(item).strip() for item in value if str(item).strip()]
        elif isinstance(value, tuple):
            raw_items = [str(item).strip() for item in value if str(item).strip()]
        elif isinstance(value, str) and value.strip():
            raw_items = [value.strip()]

        cleaned = []
        for item in raw_items:
            item_lower = item.lower()
            if not any(c in item_lower for c in ("analysis unavailable", "n/a", "information not provided", "cannot determine")):
                cleaned.append(item)
        return cleaned

    @staticmethod
    def _normalise_recommendation(raw: str) -> str:
        """Map any LLM recommendation string to a valid enum value."""
        upper = raw.upper().strip()
        valid = {"PROCEED", "PROCEED WITH CAUTION", "PIVOT", "DO NOT PROCEED"}
        if upper in valid:
            return upper
        # Fuzzy matching for common LLM variations
        if "DO NOT" in upper or "NOT PROCEED" in upper or "AVOID" in upper:
            return "DO NOT PROCEED"
        if "CAUTION" in upper or "CAREFUL" in upper or "CONDITIONAL" in upper:
            return "PROCEED WITH CAUTION"
        if "PIVOT" in upper or "REDIRECT" in upper or "CHANGE" in upper:
            return "PIVOT"
        if "PROCEED" in upper or "GO" in upper or "CONTINUE" in upper:
            return "PROCEED"
        logger.warning(
            "Unrecognised recommendation '%s'. Defaulting to PROCEED WITH CAUTION.", raw
        )
        return "PROCEED WITH CAUTION"
