"""
Graph Orchestrator: unified execution, error handling, status management.

Responsibilities:
- Execute phases with consistent error handling
- Evaluate phase results deterministically
- Track execution history and metrics
- Implement retry logic for transient failures
- Provide structured error context to API/frontend
"""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable

from app.core.logging import logger


class ErrorType(str, Enum):
    """Structured error categorization."""
    TIMEOUT = "timeout"
    VALIDATION = "validation"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    LOGIC_ERROR = "logic_error"
    UNKNOWN = "unknown"


class ExecutionStatus(str, Enum):
    """Unified execution status across all agents."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class PhaseStatus(str, Enum):
    """Overall phase status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEGRADED = "degraded"
    REQUIRES_CLARIFICATION = "requires_clarification"
    REJECTED = "rejected"


@dataclass
class ErrorContext:
    """Structured error information."""
    agent: str
    phase: str
    error_type: ErrorType
    original_exception: Exception
    retriable: bool
    message: str = ""

    def to_dict(self) -> dict[str, str]:
        return {
            "agent": self.agent,
            "phase": self.phase,
            "error_type": self.error_type.value,
            "retriable": str(self.retriable),
            "message": self.message or str(self.original_exception),
        }


@dataclass
class AgentExecutionResult:
    """Result from executing a single agent."""
    agent: str
    status: ExecutionStatus
    result: Any | None = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    error_context: ErrorContext | None = None
    execution_time_ms: int = 0


@dataclass
class PhaseExecutionResult:
    """Result from executing a phase (which may contain multiple agents)."""
    phase: str
    status: PhaseStatus
    agent_results: dict[str, AgentExecutionResult] = field(default_factory=dict)
    aggregated_errors: list[str] = field(default_factory=list)
    aggregated_warnings: list[str] = field(default_factory=list)
    execution_time_ms: int = 0
    all_inputs_available: bool = True
    missing_inputs: list[str] = field(default_factory=list)


class PhaseDependencyConfig:
    """Configuration for a phase within the pipeline."""

    def __init__(
        self,
        name: str,
        agents: list[str],
        *,
        parallel: bool = True,
        critical: bool = False,
        dependencies: list[str] | None = None,
    ):
        self.name = name
        self.agents = agents
        self.parallel = parallel
        self.critical = critical  # If fails, pipeline fails?
        self.dependencies = dependencies or []


class PipelineConfig:
    """Configuration for the entire analysis pipeline."""

    def __init__(self):
        self.phases: dict[str, PhaseDependencyConfig] = {}
        self._register_vision2real_phases()

    def _register_vision2real_phases(self):
        """Register Vision2Real's standard phases."""
        self.phases["phase_1"] = PhaseDependencyConfig(
            "phase_1",
            ["pre_flight", "idea_structuring", "classification"],
            parallel=False,
            critical=True,
        )

        self.phases["phase_2"] = PhaseDependencyConfig(
            "phase_2",
            ["research", "competition", "customer"],
            parallel=True,
            critical=False,
            dependencies=["phase_1"],
        )

        self.phases["phase_3"] = PhaseDependencyConfig(
            "phase_3",
            ["synthesis", "business_model", "feasibility", "financial", "market", "risk"],
            parallel=True,
            critical=False,
            dependencies=["phase_2"],
        )

        self.phases["adversarial"] = PhaseDependencyConfig(
            "adversarial",
            ["red_team"],
            parallel=False,
            critical=False,
            dependencies=["phase_3"],
        )

        self.phases["decision"] = PhaseDependencyConfig(
            "decision",
            ["decision_gate", "validation_plan"],
            parallel=False,
            critical=False,
            dependencies=["adversarial"],
        )


class GraphOrchestrator:
    """Central orchestration for graph execution."""

    def __init__(self, pipeline_config: PipelineConfig | None = None):
        self.config = pipeline_config or PipelineConfig()
        self.execution_history: list[PhaseExecutionResult] = []

    async def execute_phase(
        self,
        phase_name: str,
        state: Any,
        agent_executors: dict[str, Callable],
    ) -> tuple[PhaseExecutionResult, Any]:
        """
        Execute a phase with unified error handling.

        Args:
            phase_name: Name of phase (e.g., "phase_2")
            state: Current GraphState
            agent_executors: Dict of agent_name -> async callable

        Returns:
            (PhaseExecutionResult with detailed status, updated state)
        """
        phase_config = self.config.phases.get(phase_name)
        if not phase_config:
            raise ValueError(f"Unknown phase: {phase_name}")

        result = PhaseExecutionResult(phase=phase_name, status=PhaseStatus.IN_PROGRESS)
        start_time = asyncio.get_event_loop().time()

        try:
            # Execute agents (parallel or sequential)
            if phase_config.parallel:
                state, agent_results = await self._execute_parallel(
                    phase_config.agents, state, agent_executors
                )
            else:
                state, agent_results = await self._execute_sequential(
                    phase_config.agents, state, agent_executors
                )

            result.agent_results = agent_results

            # Evaluate phase status
            result.status = self._evaluate_phase_status(
                phase_name, agent_results, phase_config.critical
            )

            # Aggregate errors/warnings
            for agent_result in agent_results.values():
                result.aggregated_errors.extend(agent_result.errors)
                result.aggregated_warnings.extend(agent_result.warnings)

        except Exception as exc:
            logger.exception(f"Phase {phase_name} execution failed")
            result.status = PhaseStatus.DEGRADED
            result.aggregated_errors.append(f"Phase execution failed: {exc}")

        finally:
            result.execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
            self.execution_history.append(result)

        return result, state

    async def _execute_parallel(
        self,
        agents: list[str],
        state: Any,
        executors: dict[str, Callable],
    ) -> tuple[Any, dict[str, AgentExecutionResult]]:
        """Execute agents in parallel with timeout."""
        tasks = {
            agent: asyncio.create_task(self._execute_agent_safe(agent, state, executors[agent]))
            for agent in agents
            if agent in executors
        }

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        agent_results = {}

        for agent, result in zip(tasks.keys(), results):
            if isinstance(result, AgentExecutionResult):
                agent_results[agent] = result
                # Merge result into state
                if result.result and isinstance(result.result, dict):
                    state = state.copy(update=result.result)
            else:
                # Exception occurred
                agent_results[agent] = AgentExecutionResult(
                    agent=agent,
                    status=ExecutionStatus.FAILED,
                    errors=[str(result)],
                    error_context=ErrorContext(
                        agent=agent,
                        phase="parallel_execution",
                        error_type=ErrorType.LOGIC_ERROR,
                        original_exception=result,
                        retriable=False,
                    ),
                )

        return state, agent_results

    async def _execute_sequential(
        self,
        agents: list[str],
        state: Any,
        executors: dict[str, Callable],
    ) -> tuple[Any, dict[str, AgentExecutionResult]]:
        """Execute agents sequentially."""
        agent_results = {}

        for agent in agents:
            if agent not in executors:
                continue

            agent_result = await self._execute_agent_safe(agent, state, executors[agent])
            agent_results[agent] = agent_result

            # Merge result into state
            if agent_result.result and isinstance(agent_result.result, dict):
                state = state.copy(update=agent_result.result)

            # If critical agent failed, stop
            if (
                agent_result.status == ExecutionStatus.FAILED
                and agent in self.config.phases.get("phase_1", PhaseDependencyConfig("phase_1", [])).agents
            ):
                logger.warning(f"Critical agent {agent} failed; stopping phase")
                break

        return state, agent_results

    async def _execute_agent_safe(
        self,
        agent: str,
        state: Any,
        executor: Callable,
        max_retries: int = 3,
    ) -> AgentExecutionResult:
        """Execute agent with retry logic and timeout."""
        backoff_ms = [1000, 2000, 4000]  # Exponential backoff
        last_exception = None
        error_type = ErrorType.UNKNOWN

        for attempt in range(max_retries):
            start_time = asyncio.get_event_loop().time()

            try:
                # Execute agent (wrapped in timeout)
                result = await asyncio.wait_for(executor(state), timeout=60.0)  # 60 second timeout

                if isinstance(result, dict):
                    return AgentExecutionResult(
                        agent=agent,
                        status=ExecutionStatus.SUCCESS,
                        result=result,
                        execution_time_ms=int((asyncio.get_event_loop().time() - start_time) * 1000),
                    )
                else:
                    # Unexpected return type
                    return AgentExecutionResult(
                        agent=agent,
                        status=ExecutionStatus.FAILED,
                        errors=[f"Agent returned unexpected type: {type(result)}"],
                        error_context=ErrorContext(
                            agent=agent,
                            phase="execution",
                            error_type=ErrorType.LOGIC_ERROR,
                            original_exception=TypeError(f"Expected dict, got {type(result)}"),
                            retriable=False,
                        ),
                    )

            except asyncio.TimeoutError:
                last_exception = asyncio.TimeoutError(f"Agent {agent} timed out after 60s")
                error_type = ErrorType.TIMEOUT
                retriable = attempt < max_retries - 1

            except Exception as exc:
                last_exception = exc
                error_type = self._categorize_error(exc)
                retriable = attempt < max_retries - 1

            # If retriable and not last attempt, wait and retry
            if retriable:
                logger.warning(
                    f"Agent {agent} failed on attempt {attempt + 1}/{max_retries}: {last_exception}. "
                    f"Retrying in {backoff_ms[attempt]}ms..."
                )
                await asyncio.sleep(backoff_ms[attempt] / 1000.0)
                continue
            else:
                # No more retries
                break

        # All retries exhausted
        return AgentExecutionResult(
            agent=agent,
            status=ExecutionStatus.FAILED,
            errors=[f"Agent failed after {max_retries} attempts: {last_exception}"],
            error_context=ErrorContext(
                agent=agent,
                phase="execution",
                error_type=error_type,
                original_exception=last_exception,
                retriable=False,
                message=f"Failed after {max_retries} retries",
            ),
        )

    def _categorize_error(self, exc: Exception) -> ErrorType:
        """Categorize exception for retry/reporting decisions."""
        exc_str = str(exc).lower()

        if isinstance(exc, asyncio.TimeoutError):
            return ErrorType.TIMEOUT
        elif "timeout" in exc_str or "timed out" in exc_str:
            return ErrorType.TIMEOUT
        elif "unavailable" in exc_str or "connection" in exc_str or "rate limit" in exc_str:
            return ErrorType.PROVIDER_UNAVAILABLE
        elif "validation" in exc_str or "invalid" in exc_str:
            return ErrorType.VALIDATION
        else:
            return ErrorType.UNKNOWN

    def _evaluate_phase_status(
        self,
        phase_name: str,
        agent_results: dict[str, AgentExecutionResult],
        critical: bool,
    ) -> PhaseStatus:
        """Deterministically evaluate phase status from agent results."""
        statuses = [r.status for r in agent_results.values()]

        # Count by status
        success_count = sum(1 for s in statuses if s == ExecutionStatus.SUCCESS)
        partial_count = sum(1 for s in statuses if s == ExecutionStatus.PARTIAL)
        failed_count = sum(1 for s in statuses if s == ExecutionStatus.FAILED)
        total_count = len(statuses)

        logger.info(
            f"Phase {phase_name}: {success_count} success, {partial_count} partial, "
            f"{failed_count} failed (critical={critical})"
        )

        # Rules (documented, centralized)
        if failed_count > 0 and critical:
            # Critical phase with any failure → REJECTED
            return PhaseStatus.REJECTED
        elif failed_count > 0:
            # Non-critical phase with failures → DEGRADED
            return PhaseStatus.DEGRADED
        elif failed_count == 0 and partial_count == 0:
            # All success → COMPLETED
            return PhaseStatus.COMPLETED
        elif failed_count == 0 and partial_count > 0:
            # Some partial, no failures → REQUIRES_CLARIFICATION
            return PhaseStatus.REQUIRES_CLARIFICATION
        else:
            # Fallback
            return PhaseStatus.DEGRADED
