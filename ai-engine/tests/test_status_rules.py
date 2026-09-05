"""
Tests for Status Degradation Rules: centralized status evaluation logic.
"""
import pytest
from app.services.status_rules import StatusDegradationRules, PipelineStatus


def test_phase_status_all_agents_success():
    """Test phase status when all agents succeed."""
    agent_statuses = {
        "agent1": "success",
        "agent2": "success",
        "agent3": "success",
    }
    
    status, messages = StatusDegradationRules.evaluate_phase_status(
        "phase_2", agent_statuses
    )
    
    assert status == "completed"
    assert len(messages) > 0


def test_phase_status_with_failure_non_critical():
    """Test phase status with failure in non-critical phase."""
    agent_statuses = {
        "research": "success",
        "competition": "failed",
        "customer": "success",
    }
    
    status, messages = StatusDegradationRules.evaluate_phase_status(
        "phase_2", agent_statuses
    )
    
    assert status == "degraded"


def test_phase_status_with_failure_critical():
    """Test phase status with failure in critical phase."""
    agent_statuses = {
        "pre_flight": "failed",
    }
    
    status, messages = StatusDegradationRules.evaluate_phase_status(
        "phase_1", agent_statuses
    )
    
    assert status == "rejected"


def test_phase_status_with_partial():
    """Test phase status with partial completion."""
    agent_statuses = {
        "agent1": "success",
        "agent2": "partial",
        "agent3": "success",
    }
    
    status, messages = StatusDegradationRules.evaluate_phase_status(
        "phase_2", agent_statuses
    )
    
    assert status == "requires_clarification"


def test_phase_status_mixed_with_partial_and_failure():
    """Test phase status with both failures and partial."""
    agent_statuses = {
        "agent1": "success",
        "agent2": "failed",
        "agent3": "partial",
    }
    
    status, messages = StatusDegradationRules.evaluate_phase_status(
        "phase_2", agent_statuses
    )
    
    # Failure takes precedence over partial
    assert status == "degraded"


def test_update_overall_pipeline_status_pending_to_completed():
    """Test pipeline status update from pending to completed."""
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "pending", "completed"
    )
    assert new_status == "completed"


def test_update_overall_pipeline_status_degradation():
    """Test pipeline status degradation."""
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "completed", "degraded"
    )
    assert new_status == "degraded"


def test_update_overall_pipeline_status_degraded_is_sticky():
    """Test that degraded status is sticky."""
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "degraded", "completed"
    )
    assert new_status == "degraded"


def test_update_overall_pipeline_status_rejected_is_terminal():
    """Test that rejected status is terminal."""
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "completed", "rejected"
    )
    assert new_status == "rejected"
    
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "rejected", "completed"
    )
    assert new_status == "rejected"


def test_update_overall_pipeline_status_requires_clarification():
    """Test pipeline status update to requires_clarification."""
    new_status = StatusDegradationRules.update_overall_pipeline_status(
        "completed", "requires_clarification"
    )
    assert new_status == "requires_clarification"


def test_log_status_transition_with_failures(caplog):
    """Test status transition logging with failures."""
    agent_statuses = {
        "research": "success",
        "competition": "failed",
        "customer": "failed",
    }
    
    StatusDegradationRules.log_status_transition(
        "phase_2",
        "in_progress",
        "degraded",
        agent_statuses,
    )
    
    # Should log the transition and include failed agents
    assert "phase_2" in caplog.text
    assert "degraded" in caplog.text


def test_log_status_transition_no_change():
    """Test that unchanged status transitions don't log."""
    agent_statuses = {"agent1": "success"}
    
    # Should not log if status doesn't change
    StatusDegradationRules.log_status_transition(
        "phase_1",
        "completed",
        "completed",
        agent_statuses,
    )


def test_phase_1_critical_failure_rejects():
    """Test that phase 1 failures result in rejection."""
    for phase in ["phase_1"]:
        agent_statuses = {"preflight": "failed"}
        status, _ = StatusDegradationRules.evaluate_phase_status(
            phase, agent_statuses
        )
        assert status == "rejected", f"{phase} should reject on failure"


def test_phase_2_and_3_optional_failure_degrades():
    """Test that phase 2/3 failures degrade but don't reject."""
    for phase in ["phase_2", "phase_3"]:
        agent_statuses = {
            "agent1": "success",
            "agent2": "failed",
        }
        status, _ = StatusDegradationRules.evaluate_phase_status(
            phase, agent_statuses
        )
        assert status == "degraded", f"{phase} should degrade on failure"


def test_adversarial_phase_failure_degrades():
    """Test that adversarial (red team) failure degrades."""
    agent_statuses = {"red_team": "failed"}
    status, _ = StatusDegradationRules.evaluate_phase_status(
        "adversarial", agent_statuses
    )
    assert status == "degraded"


def test_cascading_status_transitions():
    """Test cascading status transitions through multiple phases."""
    # Phase 1: success
    current_status = "pending"
    phase1_status, _ = StatusDegradationRules.evaluate_phase_status(
        "phase_1", {"pre_flight": "success", "structuring": "success"}
    )
    current_status = StatusDegradationRules.update_overall_pipeline_status(
        current_status, phase1_status
    )
    assert current_status == "completed"
    
    # Phase 2: degraded
    phase2_status, _ = StatusDegradationRules.evaluate_phase_status(
        "phase_2", {"research": "success", "competition": "failed"}
    )
    current_status = StatusDegradationRules.update_overall_pipeline_status(
        current_status, phase2_status
    )
    assert current_status == "degraded"
    
    # Phase 3: completed (but overall stays degraded)
    phase3_status, _ = StatusDegradationRules.evaluate_phase_status(
        "phase_3", {"synthesis": "success", "business": "success"}
    )
    current_status = StatusDegradationRules.update_overall_pipeline_status(
        current_status, phase3_status
    )
    assert current_status == "degraded"  # Sticky
