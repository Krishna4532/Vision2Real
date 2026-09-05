from typing import Any, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class ResponseParser:
    """Safely extracts overall_score, recommendation, and structured content

    from the raw dictionary returned by the LLM provider.
    """

    @staticmethod
    def parse_validation_result(payload: Dict[str, Any]) -> Tuple[float | None, str | None, Dict[str, Any]]:
        """
        Parses raw LLM payload.

        Returns:
            (overall_score, recommendation, cleaned_payload)
        """
        if not isinstance(payload, dict):
            logger.error(f"ResponseParser expected dict, got {type(payload)}")
            return None, "FAILED", {"error": "Invalid payload format"}

        # Extract overall score safely
        score: float | None = None
        raw_score = payload.get("overall_score") or payload.get("score")
        if raw_score is not None:
            try:
                score = float(raw_score)
                # Clamp score to [0.0, 10.0]
                score = max(0.0, min(10.0, score))
            except (ValueError, TypeError):
                logger.warning(f"Could not convert overall_score '{raw_score}' to float")
                score = None

        # Extract recommendation safely
        rec: str | None = None
        raw_rec = payload.get("recommendation") or payload.get("decision")
        if isinstance(raw_rec, str):
            rec_upper = raw_rec.strip().upper()
            if rec_upper in {"PROCEED", "PIVOT", "PAUSE", "REJECT", "CAUTION"}:
                rec = rec_upper
            else:
                rec = rec_upper[:50]  # truncate if custom string

        return score, rec, payload
