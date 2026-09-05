"""
Cross-Agent Reasoning Engine: Automatic contradiction detection, evidence validation,
and validation experiment generation.

This service acts as a referee between agents, identifying contradictions,
gaps, and generating structured validation experiments to resolve them.

Principles:
- Every contradiction is evidence-based
- Every unknown maps to a validation experiment
- Validation experiments ordered by ROI
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from app.core.logging import logger


class ContradictionSeverity(str, Enum):
    """Contradiction severity level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Contradiction:
    """Detected contradiction between agent outputs."""
    title: str
    description: str
    severity: ContradictionSeverity
    agent_sources: list[str]  # Which agents contributed to contradiction
    affected_fields: list[str]  # What report fields are affected
    recommendation: str  # How to resolve
    validation_experiment: str  # What to test


@dataclass
class ValidationExperiment:
    """Structured validation experiment."""
    title: str
    description: str
    learning_goal: str  # What will this teach us?
    cost_estimate: str  # $1k, $5k, etc.
    time_estimate: str  # 1 week, 2 days, etc.
    confidence_gain: int  # 0-50 percentage points
    priority: int  # 1 = highest
    success_criteria: list[str]  # How do we know it worked?


class CrossAgentValidator:
    """Validate agent outputs for contradictions and gaps."""

    @staticmethod
    def detect_customer_vs_business_contradiction(
        customer_result: dict[str, Any],
        business_result: dict[str, Any],
    ) -> Contradiction | None:
        """
        Detect: Customer segment ≠ Pricing tier
        
        Example:
        - Customer: Enterprise (high spend)
        - Business: $5/month pricing (SMB pricing)
        """
        if not customer_result or not business_result:
            return None

        customer_segment = (
            customer_result.get("customer_analysis", {}).get("primary_segment", "").lower()
        )
        pricing_model = business_result.get("pricing_tier", "").lower()

        # Enterprise customer with consumer pricing
        if "enterprise" in customer_segment and any(
            tier in pricing_model for tier in ["$", "free", "cheap", "low"]
        ):
            if "$5" in str(business_result.get("pricing_estimate", "")):
                return Contradiction(
                    title="Customer Segment vs Pricing Mismatch",
                    description=(
                        f"Target customer is {customer_segment}, but pricing is {pricing_model}. "
                        "Enterprise customers expect premium pricing; low pricing targets SMB."
                    ),
                    severity=ContradictionSeverity.HIGH,
                    agent_sources=["customer", "business_model"],
                    affected_fields=["customer", "business_model", "financial"],
                    recommendation="Either (1) Increase pricing to match enterprise, or (2) Pivot to SMB segment",
                    validation_experiment="Survey 20 enterprise customers on pricing expectations",
                )

        return None

    @staticmethod
    def detect_market_vs_financial_contradiction(
        market_result: dict[str, Any],
        financial_result: dict[str, Any],
    ) -> Contradiction | None:
        """
        Detect: Market size ≠ Financial projections
        
        Example:
        - Market: Small niche ($50M TAM)
        - Financial: $500M ARR year 2 projection
        """
        if not market_result or not financial_result:
            return None

        tam = market_result.get("tam")
        year2_arr = financial_result.get("year_2_arr")

        # Try to extract numeric values
        try:
            if isinstance(tam, str):
                tam_value = float("".join(c for c in tam if c.isdigit() or c == "."))
            else:
                tam_value = tam or 0

            if isinstance(year2_arr, str):
                arr_value = float("".join(c for c in year2_arr if c.isdigit() or c == "."))
            else:
                arr_value = year2_arr or 0

            # If Y2 ARR > 50% of TAM, that's unrealistic
            if tam_value > 0 and arr_value > tam_value * 0.5:
                return Contradiction(
                    title="Market Size vs Financial Projection Mismatch",
                    description=(
                        f"TAM is ${tam_value}B, but projections show ${arr_value}B Y2 ARR. "
                        "Company cannot capture 50%+ of entire market by year 2."
                    ),
                    severity=ContradictionSeverity.CRITICAL,
                    agent_sources=["market", "financial"],
                    affected_fields=["market", "financial", "decision"],
                    recommendation="Either (1) Reduce market size assumption, or (2) Reduce Y2 revenue projection",
                    validation_experiment="Validate TAM with 3 industry analysts and 10 customer interviews",
                )
        except (ValueError, TypeError):
            pass

        return None

    @staticmethod
    def detect_competition_vs_positioning_contradiction(
        competition_result: dict[str, Any],
        business_result: dict[str, Any],
    ) -> Contradiction | None:
        """
        Detect: Market saturation ≠ Claimed differentiation
        
        Example:
        - Competition: 15 direct competitors, market saturated
        - Business: "Unique positioning, no real competitors"
        """
        if not competition_result or not business_result:
            return None

        competitors = competition_result.get("competitors", [])
        competitor_count = len(competitors) if isinstance(competitors, list) else 0
        positioning = business_result.get("differentiation", "").lower()

        if competitor_count >= 10 and "unique" in positioning and "no competitor" in positioning:
            return Contradiction(
                title="Market Saturation vs Differentiation Claim Mismatch",
                description=(
                    f"Research found {competitor_count} direct competitors and claims of saturation, "
                    "but business model claims unique, uncontested positioning. "
                    "These are contradictory."
                ),
                severity=ContradictionSeverity.HIGH,
                agent_sources=["competition", "business_model"],
                affected_fields=["competition", "business_model", "risk"],
                recommendation="Clarify actual differentiation vs competitors",
                validation_experiment="Competitive positioning analysis from 5 customers",
            )

        return None

    @staticmethod
    def detect_feasibility_vs_timeline_contradiction(
        feasibility_result: dict[str, Any],
        financial_result: dict[str, Any],
    ) -> Contradiction | None:
        """
        Detect: High technical complexity ≠ Aggressive timeline
        
        Example:
        - Feasibility: "Complex distributed system, 18+ month build"
        - Financial: "Break even in 12 months"
        """
        if not feasibility_result or not financial_result:
            return None

        complexity = feasibility_result.get("technical_complexity", "").lower()
        timeline = financial_result.get("break_even_timeline", "")

        if "complex" in complexity and any(
            word in complexity for word in ["distributed", "ml", "scaling", "infrastructure"]
        ):
            try:
                if isinstance(timeline, str):
                    months = int("".join(c for c in timeline if c.isdigit()))
                else:
                    months = timeline or 0

                if months < 15:  # Break even before complexity feasible
                    return Contradiction(
                        title="Technical Complexity vs Timeline Mismatch",
                        description=(
                            f"Feasibility analysis indicates complex build ({complexity}), "
                            f"but financial projections show break-even in {months} months. "
                            "Insufficient time for proper engineering."
                        ),
                        severity=ContradictionSeverity.MEDIUM,
                        agent_sources=["feasibility", "financial"],
                        affected_fields=["feasibility", "financial", "risk"],
                        recommendation="Either (1) Simplify technical approach, or (2) Extend timeline",
                        validation_experiment="Technical architecture review by senior engineer",
                    )
            except (ValueError, TypeError):
                pass

        return None


class CrossAgentReasoning:
    """Main cross-agent reasoning service."""

    def __init__(self):
        self.validator = CrossAgentValidator()
        self.contradictions: list[Contradiction] = []

    async def analyze_cross_agent_output(
        self,
        research_result: dict[str, Any] | None,
        competition_result: dict[str, Any] | None,
        customer_result: dict[str, Any] | None,
        business_model_result: dict[str, Any] | None,
        feasibility_result: dict[str, Any] | None,
        market_result: dict[str, Any] | None,
        financial_result: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """
        Analyze outputs from all agents for contradictions and gaps.
        
        Returns:
        {
            "contradictions": [Contradiction, ...],
            "validation_experiments": [ValidationExperiment, ...],
            "evidence_gaps": [str, ...],
            "overall_confidence": float,
            "recommended_decision": str,
        }
        """
        self.contradictions = []

        # Run all contradiction detectors
        contradictions = [
            self.validator.detect_customer_vs_business_contradiction(
                customer_result, business_model_result
            ),
            self.validator.detect_market_vs_financial_contradiction(
                market_result, financial_result
            ),
            self.validator.detect_competition_vs_positioning_contradiction(
                competition_result, business_model_result
            ),
            self.validator.detect_feasibility_vs_timeline_contradiction(
                feasibility_result, financial_result
            ),
        ]

        # Filter out None values
        self.contradictions = [c for c in contradictions if c is not None]

        logger.info(f"Detected {len(self.contradictions)} contradictions")

        # Generate validation experiments
        validation_experiments = self._generate_validation_experiments(
            self.contradictions, research_result, market_result, customer_result
        )

        # Identify evidence gaps
        evidence_gaps = self._identify_evidence_gaps(
            research_result, competition_result, customer_result, market_result
        )

        # Calculate confidence penalty from contradictions
        confidence_penalty = len(self.contradictions) * 0.1  # 10% per contradiction

        return {
            "contradictions": self.contradictions,
            "validation_experiments": validation_experiments,
            "evidence_gaps": evidence_gaps,
            "confidence_penalty": confidence_penalty,
            "contradiction_count": len(self.contradictions),
        }

    def _generate_validation_experiments(
        self,
        contradictions: list[Contradiction],
        research_result: dict[str, Any] | None,
        market_result: dict[str, Any] | None,
        customer_result: dict[str, Any] | None,
    ) -> list[ValidationExperiment]:
        """Generate validation experiments ordered by ROI (learning per cost/time)."""
        experiments = []

        # Experiments for contradictions (highest priority)
        for i, contradiction in enumerate(contradictions, 1):
            experiments.append(
                ValidationExperiment(
                    title=f"Resolve: {contradiction.title}",
                    description=contradiction.validation_experiment,
                    learning_goal=contradiction.recommendation,
                    cost_estimate="$2k-$5k",
                    time_estimate="1-2 weeks",
                    confidence_gain=15,
                    priority=i,
                    success_criteria=[
                        f"Clarify {field}" for field in contradiction.affected_fields
                    ],
                )
            )

        # Experiments for evidence gaps
        if not customer_result or not customer_result.get("customer_analysis"):
            experiments.append(
                ValidationExperiment(
                    title="Customer Validation",
                    description="Interview 20 target customers to confirm ICP, JTBD, and willingness to pay",
                    learning_goal="Confirm customer assumptions",
                    cost_estimate="$2k",
                    time_estimate="2 weeks",
                    confidence_gain=20,
                    priority=len(experiments) + 1,
                    success_criteria=[
                        "ICP confirmed",
                        "JTBD validated",
                        "Willingness to pay documented",
                    ],
                )
            )

        if not market_result or not market_result.get("tam"):
            experiments.append(
                ValidationExperiment(
                    title="Market Size Validation",
                    description="Consult 3 industry analysts and review market research reports",
                    learning_goal="Validate TAM estimate",
                    cost_estimate="$5k",
                    time_estimate="3 weeks",
                    confidence_gain=25,
                    priority=len(experiments) + 1,
                    success_criteria=[
                        "TAM estimate within $500M range",
                        "Market growth trend confirmed",
                    ],
                )
            )

        # Sort by priority (lowest number = highest priority)
        return sorted(experiments, key=lambda e: e.priority)

    def _identify_evidence_gaps(
        self,
        research_result: dict[str, Any] | None,
        competition_result: dict[str, Any] | None,
        customer_result: dict[str, Any] | None,
        market_result: dict[str, Any] | None,
    ) -> list[str]:
        """Identify missing evidence."""
        gaps = []

        if not research_result or not research_result.get("findings"):
            gaps.append("No market research completed")

        if not competition_result or not competition_result.get("competitors"):
            gaps.append("No competitive analysis")

        if not customer_result or not customer_result.get("customer_analysis"):
            gaps.append("No customer research")

        if not market_result or not market_result.get("tam"):
            gaps.append("No market sizing")

        return gaps
