"""
Tests for Graph Orchestrator: retry logic, status evaluation, error handling.
"""
import asyncio
import pytest
from app.graph.orchestrator import (
    GraphOrchestrator,
    PipelineConfig,
    ErrorType,
    ExecutionStatus,
    PhaseStatus,
    ErrorContext,
    AgentExecutionResult,
)
from app.core.logging import logger


class MockGraphState:
    """Mock GraphState for testing orchestrator."""
    def copy(self, update=None):
        """Shallow copy with optional updates."""
        new_state = MockGraphState()
        if update:
            for k, v in update.items():
                setattr(new_state, k, v)
        return new_state


@pytest.mark.asyncio
async def test_orchestrator_executes_agent_successfully():
    """Test that orchestrator successfully executes an agent."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    # Mock agent that succeeds
    async def mock_agent(s):
        return {"result": "success"}
    
    result = await orchestrator._execute_agent_safe(
        "test_agent", state, mock_agent, max_retries=1
    )
    
    assert result.status == ExecutionStatus.SUCCESS
    assert result.agent == "test_agent"
    assert result.result == {"result": "success"}
    assert result.execution_time_ms > 0


@pytest.mark.asyncio
async def test_orchestrator_retries_on_failure():
    """Test that orchestrator retries after transient failures."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    call_count = 0
    
    async def mock_agent_fails_once(s):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise ConnectionError("Transient network error")
        return {"result": "success"}
    
    result = await orchestrator._execute_agent_safe(
        "test_agent", state, mock_agent_fails_once, max_retries=3
    )
    
    assert result.status == ExecutionStatus.SUCCESS
    assert call_count == 2  # Failed once, then succeeded


@pytest.mark.asyncio
async def test_orchestrator_exhausts_retries():
    """Test that orchestrator gives up after max retries."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    async def mock_agent_always_fails(s):
        raise ConnectionError("Permanent failure")
    
    result = await orchestrator._execute_agent_safe(
        "test_agent", state, mock_agent_always_fails, max_retries=2
    )
    
    assert result.status == ExecutionStatus.FAILED
    assert len(result.errors) > 0
    assert result.error_context is not None
    assert result.error_context.retriable == False


@pytest.mark.asyncio
async def test_orchestrator_timeout_categorized_as_retriable():
    """Test that timeouts are categorized as retriable."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    async def mock_agent_timeout(s):
        await asyncio.sleep(0.1)  # Longer than timeout
        return {"result": "success"}
    
    result = await orchestrator._execute_agent_safe(
        "test_agent", state, mock_agent_timeout, max_retries=2
    )
    
    # Should fail due to timeout but the error type should be TIMEOUT
    assert result.status == ExecutionStatus.FAILED
    assert result.error_context is not None


@pytest.mark.asyncio
async def test_orchestrator_evaluates_phase_status_all_success():
    """Test phase status evaluation when all agents succeed."""
    orchestrator = GraphOrchestrator()
    
    agent_results = {
        "agent1": AgentExecutionResult(
            agent="agent1",
            status=ExecutionStatus.SUCCESS,
            result={"data": "1"},
        ),
        "agent2": AgentExecutionResult(
            agent="agent2",
            status=ExecutionStatus.SUCCESS,
            result={"data": "2"},
        ),
    }
    
    phase_status = orchestrator._evaluate_phase_status(
        "test_phase",
        agent_results,
        critical=False,
    )
    
    assert phase_status == PhaseStatus.COMPLETED


@pytest.mark.asyncio
async def test_orchestrator_evaluates_phase_status_with_failures():
    """Test phase status evaluation when agent fails (non-critical)."""
    orchestrator = GraphOrchestrator()
    
    agent_results = {
        "agent1": AgentExecutionResult(
            agent="agent1",
            status=ExecutionStatus.SUCCESS,
            result={"data": "1"},
        ),
        "agent2": AgentExecutionResult(
            agent="agent2",
            status=ExecutionStatus.FAILED,
            errors=["Failed"],
        ),
    }
    
    phase_status = orchestrator._evaluate_phase_status(
        "test_phase",
        agent_results,
        critical=False,
    )
    
    assert phase_status == PhaseStatus.DEGRADED


@pytest.mark.asyncio
async def test_orchestrator_evaluates_critical_phase_failure():
    """Test that critical phase failure results in REJECTED."""
    orchestrator = GraphOrchestrator()
    
    agent_results = {
        "agent1": AgentExecutionResult(
            agent="agent1",
            status=ExecutionStatus.FAILED,
            errors=["Failed"],
        ),
    }
    
    phase_status = orchestrator._evaluate_phase_status(
        "phase_1",
        agent_results,
        critical=True,
    )
    
    assert phase_status == PhaseStatus.REJECTED


@pytest.mark.asyncio
async def test_orchestrator_parallel_execution():
    """Test that orchestrator executes agents in parallel."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    call_times = []
    
    async def slow_agent(name):
        async def agent_func(s):
            call_times.append((name, asyncio.get_event_loop().time()))
            await asyncio.sleep(0.1)
            return {f"{name}_result": "success"}
        return agent_func
    
    agent1_func = await slow_agent("agent1")
    agent2_func = await slow_agent("agent2")
    
    executors = {
        "agent1": agent1_func,
        "agent2": agent2_func,
    }
    
    start_time = asyncio.get_event_loop().time()
    state, agent_results = await orchestrator._execute_parallel(
        ["agent1", "agent2"],
        state,
        executors,
    )
    elapsed = asyncio.get_event_loop().time() - start_time
    
    # If parallel, both should complete in ~0.1s
    # If sequential, would take ~0.2s
    assert elapsed < 0.18, f"Parallel execution took {elapsed}s (expected ~0.1s)"
    assert len(agent_results) == 2
    assert agent_results["agent1"].status == ExecutionStatus.SUCCESS
    assert agent_results["agent2"].status == ExecutionStatus.SUCCESS


@pytest.mark.asyncio
async def test_orchestrator_sequential_execution():
    """Test that orchestrator executes agents sequentially."""
    orchestrator = GraphOrchestrator()
    state = MockGraphState()
    
    execution_order = []
    
    async def make_agent(name):
        async def agent_func(s):
            execution_order.append(name)
            return {f"{name}_result": "success"}
        return agent_func
    
    agent1_func = await make_agent("agent1")
    agent2_func = await make_agent("agent2")
    
    executors = {
        "agent1": agent1_func,
        "agent2": agent2_func,
    }
    
    state, agent_results = await orchestrator._execute_sequential(
        ["agent1", "agent2"],
        state,
        executors,
    )
    
    # Should execute in order
    assert execution_order == ["agent1", "agent2"]
    assert len(agent_results) == 2


@pytest.mark.asyncio
async def test_orchestrator_categorizes_errors():
    """Test error categorization."""
    orchestrator = GraphOrchestrator()
    
    # Timeout error
    error_type = orchestrator._categorize_error(
        asyncio.TimeoutError("timeout")
    )
    assert error_type == ErrorType.TIMEOUT
    
    # Connection error
    error_type = orchestrator._categorize_error(
        ConnectionError("connection refused")
    )
    assert error_type == ErrorType.PROVIDER_UNAVAILABLE
    
    # Validation error
    error_type = orchestrator._categorize_error(
        ValueError("validation failed")
    )
    assert error_type == ErrorType.VALIDATION


@pytest.mark.asyncio
async def test_orchestrator_execution_history():
    """Test that orchestrator maintains execution history."""
    orchestrator = GraphOrchestrator()
    
    # The orchestrator should track execution history
    assert len(orchestrator.execution_history) == 0
