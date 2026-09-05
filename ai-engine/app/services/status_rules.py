"""
Status Rules: centralized, documented status degradation logic.

This provides a single source of truth for status transitions that were previously
scattered across:
- combined_state_node()
- phase3_combined_state_node()
- red_team_combined_state_node()
"""
from __future__ import annotations

from enum import Enum

from app.core.logging import logger


class PipelineStatus(str, Enum):
    """Overall pipeline status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEGRADED = "degraded"
    REQUIRES_CLARIFICATION = "requires_clarification"
    REJECTED = "rejected"


class StatusDegradationRules:
    """Documented, centralized status rules."""

    DEGRADED_STATUSES = {"degraded", "rejected", "failed", "requires_clarification"}

    # Phase 1: Critical phases
    PHASE_1_CRITICAL_AGENTS = {"pre_flight", "idea_structuring", "classification"}

    # Phase 2: Optional agents (failures degrade but don't reject)
    PHASE_2_OPTIONAL_AGENTS = {"research", "competition", "customer"}

    # Phase 3: Optional agents
    PHASE_3_OPTIONAL_AGENTS = {
        "synthesis",
        "business_model",
        "feasibility",
        "financial",
        "market",
        "risk",
    }

    @staticmethod
    def is_degraded_status(status: str | None) -> bool:
        """Single source of truth for degraded/rejected/incomplete analysis states."""
        return bool(status and status.lower() in StatusDegradationRules.DEGRADED_STATUSES)

    @staticmethod
    def evaluate_phase_status(
        phase_name: str,
        agent_statuses: dict[str, str],  # agent_name -> "success" | "partial" | "failed"
    ) -> tuple[str, list[str]]:
        """
        Deterministic phase status evaluation.

        Returns: (status, log_messages)

        Rules:
        - Phase 1 (critical): any failure → REJECTED
        - Phase 2, 3, Adversarial (optional):
          - Any failure → DEGRADED
          - All success → COMPLETED
          - Some partial, no failures → REQUIRES_CLARIFICATION
        """
        messages = []
        statuses = list(agent_statuses.values())
        success_count = sum(1 for s in statuses if s == "success")
        partial_count = sum(1 for s in statuses if s == "partial")
        failed_count = sum(1 for s in statuses if s == "failed")
        total_count = len(statuses)

        messages.append(
            f"{phase_name}: {success_count}/{total_count} success, "
            f"{partial_count} partial, {failed_count} failed"
        )

        # Rules by phase
        if phase_name == "phase_1":
            # Phase 1 failure → reject (critical)
            if failed_count > 0:
                return "rejected", messages
            return "completed", messages

        elif phase_name in ("phase_2", "phase_3", "adversarial"):
            # Optional phase failure → degrade
            if failed_count > 0:
                return "degraded", messages
            elif failed_count == 0 and partial_count == 0:
                return "completed", messages
            else:
                return "requires_clarification", messages

        else:
            # Unknown phase → degrade
            return "degraded", messages

    @staticmethod
    def update_overall_pipeline_status(
        current_status: str,
        phase_status: str,
    ) -> str:
        """
        Update overall pipeline status based on phase result.

        Transition rules:
        - pending + X → X
        - in_progress + degraded → degraded
        - completed + degraded → degraded
        - degraded + anything → degraded (sticky)
        - rejected + anything → rejected (terminal)
        """
        if current_status == "rejected":
            return "rejected"  # Terminal

        if current_status == "degraded":
            return "degraded"  # Sticky

        if phase_status in ("rejected", "degraded"):
            return phase_status

        if current_status == "pending":
            return phase_status

        if current_status == "completed" and phase_status == "requires_clarification":
            return "requires_clarification"

        return phase_status

    @staticmethod
    def log_status_transition(
        phase_name: str,
        old_status: str,
        new_status: str,
        agent_statuses: dict[str, str],
    ) -> None:
        """Log status transition for debugging and monitoring."""
        if old_status != new_status:
            failed_agents = [
                agent for agent, status in agent_statuses.items() if status == "failed"
            ]
            partial_agents = [
                agent for agent, status in agent_statuses.items() if status == "partial"
            ]

            log_msg = f"Phase {phase_name} status: {old_status} -> {new_status}"
            if failed_agents:
                log_msg += f" (failed: {', '.join(failed_agents)})"
            if partial_agents:
                log_msg += f" (partial: {', '.join(partial_agents)})"

            logger.info(log_msg)
