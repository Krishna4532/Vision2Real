# Vision2Real — Implementation Plan: Phase A (Graph Orchestration & Persistence)

**Phase**: Foundation (Week 1-2)  
**Goal**: Fix graph orchestration and persistence layer  
**Deliverables**: Centralized orchestration, optimized queries, explicit deduplication

---

## A.1: Graph Orchestrator Service

### File: `app/graph/orchestrator.py` (NEW)

**Purpose**: Centralize all graph execution, error handling, status management, and retry logic.

```python
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
    
    def __init__(self, name: str, agents: list[str], *, parallel: bool = True, 
                 critical: bool = False, dependencies: list[str] | None = None):
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
            parallel=True,  # synthesis is special case: sequential-first, then parallel
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
            if agent_result.status == ExecutionStatus.FAILED and agent in self.config.phases.get("phase_1", PhaseDependencyConfig("phase_1", [])).agents:
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
        
        for attempt in range(max_retries):
            start_time = asyncio.get_event_loop().time()
            
            try:
                # Execute agent (wrapped in timeout)
                result = await asyncio.wait_for(
                    executor(state),
                    timeout=60.0  # 60 second timeout per agent
                )
                
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
```

### Integration with Workflow

Update `workflow.py` to use orchestrator:

```python
# In workflow.py (new imports)
from app.graph.orchestrator import GraphOrchestrator, PipelineConfig

# In run_graph()
async def run_graph(raw_idea: str, llm_provider: BaseLLMProvider | None = None) -> GraphState:
    orchestrator = GraphOrchestrator(PipelineConfig())
    provider = llm_provider or get_llm_provider()
    
    state = GraphState(raw_idea=raw_idea)
    
    # Phase 1
    phase1_executors = {
        "pre_flight": lambda s: pre_flight_node(s),
        "idea_structuring": lambda s: idea_structuring_node(s, provider),
        "classification": lambda s: classification_node(s, provider),
    }
    phase1_result, state = await orchestrator.execute_phase("phase_1", state, phase1_executors)
    
    # Phase 2
    phase2_executors = {
        "research": research_agent,
        "competition": competition_agent,
        "customer": customer_agent,
    }
    phase2_result, state = await orchestrator.execute_phase("phase_2", state, phase2_executors)
    
    # ... similar for phase 3, adversarial, decision
    
    return state
```

---

## A.2: Persistence Layer Optimization

### File: `app/services/persistence_optimizer.py` (NEW)

**Purpose**: Fix N+1 queries, handle deduplication, ensure transaction safety.

```python
"""
Persistence Optimizer: N+1 prevention, transaction safety, deduplication.

Responsibilities:
- Eager-load evidence relationships
- Deduplicate claims and sources
- Ensure transaction integrity
- Provide efficient reconstruction queries
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.analysis import (
    AnalysisJobORM,
    ClaimORM,
    EvidenceORM,
    SourceORM,
)
from app.core.logging import logger


class PersistenceOptimizer:
    """Optimization strategies for database queries and transactions."""
    
    @staticmethod
    async def reconstruct_analysis_with_eager_loading(
        analysis_id: str,
        session: AsyncSession,
    ) -> AnalysisJobORM | None:
        """
        Reconstruct analysis with eager loading to prevent N+1.
        
        Uses selectinload to load all relationships in O(n) queries instead of O(n²).
        """
        query = (
            select(AnalysisJobORM)
            .where(AnalysisJobORM.id == analysis_id)
            .options(
                # Eager load all claims for this analysis
                selectinload(AnalysisJobORM.claims)
                .selectinload(ClaimORM.evidence_items)  # Eager load evidence for each claim
                .selectinload(EvidenceORM.sources),  # Eager load sources for each evidence
            )
        )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def deduplicate_claims(
        claims: list[ClaimORM],
        session: AsyncSession,
    ) -> list[ClaimORM]:
        """
        Deduplicate claims by text + type.
        
        Keep claim with:
        - Highest confidence
        - Most evidence items
        - Most sources
        
        Merge evidence_ids from duplicates.
        """
        if not claims:
            return []
        
        # Group by (claim_text, claim_type)
        grouped: dict[tuple[str, str], list[ClaimORM]] = {}
        for claim in claims:
            key = (claim.claim_text, claim.claim_type)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(claim)
        
        deduplicated = []
        for key, group in grouped.items():
            if len(group) == 1:
                deduplicated.append(group[0])
            else:
                # Keep the one with highest confidence
                primary = max(group, key=lambda c: c.confidence or 0.0)
                
                # Merge evidence_ids from others
                merged_evidence_ids = set()
                for claim in group:
                    merged_evidence_ids.update(e.id for e in claim.evidence_items if e.id)
                
                primary.evidence_items = [
                    e for e in primary.evidence_items 
                    if e.id in merged_evidence_ids
                ]
                
                deduplicated.append(primary)
        
        logger.info(f"Deduplicated {len(claims)} claims → {len(deduplicated)}")
        return deduplicated
    
    @staticmethod
    async def deduplicate_sources(
        sources: list[SourceORM],
    ) -> list[SourceORM]:
        """
        Deduplicate sources by URL.
        
        Keep source with highest credibility_score.
        """
        if not sources:
            return []
        
        # Group by URL
        grouped: dict[str, list[SourceORM]] = {}
        for source in sources:
            url = source.url or source.id
            if url not in grouped:
                grouped[url] = []
            grouped[url].append(source)
        
        deduplicated = []
        for url, group in grouped.items():
            if len(group) == 1:
                deduplicated.append(group[0])
            else:
                # Keep the one with highest credibility
                primary = max(group, key=lambda s: s.credibility_score or 0.0)
                deduplicated.append(primary)
        
        logger.info(f"Deduplicated {len(sources)} sources → {len(deduplicated)}")
        return deduplicated


class TransactionSafetyManager:
    """Ensure data integrity during analysis save."""
    
    @staticmethod
    async def save_with_nested_transaction(
        analysis_id: str,
        save_func,  # Async function that performs save
        session: AsyncSession,
    ) -> bool:
        """
        Save analysis data with nested transaction.
        
        If any error occurs, all changes are rolled back automatically.
        """
        try:
            async with session.begin_nested():
                await save_func(session)
                return True
        except Exception as exc:
            logger.error(f"Analysis save failed: {exc}; rolling back")
            await session.rollback()
            return False
```

### Update `analysis_service.py`

```python
# In reconstruct_analysis_result()
from app.services.persistence_optimizer import PersistenceOptimizer

async def reconstruct_analysis_result(analysis_id: str, session: AsyncSession) -> AnalysisResult | None:
    # Use optimized eager loading (was causing N+1 queries)
    analysis_orm = await PersistenceOptimizer.reconstruct_analysis_with_eager_loading(
        analysis_id, session
    )
    
    if not analysis_orm:
        return None
    
    # Deduplicate claims and sources
    if analysis_orm.claims:
        analysis_orm.claims = await PersistenceOptimizer.deduplicate_claims(
            analysis_orm.claims, session
        )
    
    # Reconstruct as before
    ...
```

---

## A.3: Centralized Status Rules

### File: `app/services/status_rules.py` (NEW)

**Purpose**: Single source of truth for status degradation logic.

```python
"""
Status Rules: centralized, documented status degradation logic.

This replaces the logic currently scattered across:
- combined_state_node()
- phase3_combined_state_node()
- red_team_combined_state_node()
"""
from __future__ import annotations

from enum import Enum


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
    
    # Phase 1: Critical phases
    PHASE_1_CRITICAL_AGENTS = {"pre_flight", "idea_structuring", "classification"}
    
    # Phase 2: Optional agents (failures degrade but don't reject)
    PHASE_2_OPTIONAL_AGENTS = {"research", "competition", "customer"}
    
    # Phase 3: Optional agents
    PHASE_3_OPTIONAL_AGENTS = {"synthesis", "business_model", "feasibility", "financial", "market", "risk"}
    
    @staticmethod
    def evaluate_phase_status(
        phase_name: str,
        agent_statuses: dict[str, str],  # agent_name -> "success" | "partial" | "failed"
    ) -> tuple[str, list[str]]:
        """
        Deterministic phase status evaluation.
        
        Returns: (status, log_messages)
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
            # Phase 1 failure → reject
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
```

---

## A.4: Testing Strategy

### File: `tests/test_orchestrator.py` (NEW)

```python
"""Tests for Graph Orchestrator."""
import pytest
from app.graph.orchestrator import (
    GraphOrchestrator,
    PipelineConfig,
    ExecutionStatus,
    PhaseStatus,
)


@pytest.mark.asyncio
async def test_phase_status_evaluation():
    """Test deterministic phase status evaluation."""
    orchestrator = GraphOrchestrator()
    
    # All success → COMPLETED
    result = orchestrator._evaluate_phase_status(
        "phase_2",
        {
            "research": ExecutionStatus.SUCCESS,
            "competition": ExecutionStatus.SUCCESS,
            "customer": ExecutionStatus.SUCCESS,
        },
        critical=False,
    )
    assert result == PhaseStatus.COMPLETED
    
    # One failure (non-critical) → DEGRADED
    result = orchestrator._evaluate_phase_status(
        "phase_2",
        {
            "research": ExecutionStatus.FAILED,
            "competition": ExecutionStatus.SUCCESS,
            "customer": ExecutionStatus.SUCCESS,
        },
        critical=False,
    )
    assert result == PhaseStatus.DEGRADED
    
    # Critical failure → REJECTED
    result = orchestrator._evaluate_phase_status(
        "phase_1",
        {
            "pre_flight": ExecutionStatus.FAILED,
        },
        critical=True,
    )
    assert result == PhaseStatus.REJECTED


@pytest.mark.asyncio
async def test_retry_logic():
    """Test agent retry on transient failure."""
    orchestrator = GraphOrchestrator()
    
    # Agent that fails once then succeeds
    attempt_count = [0]
    
    async def flaky_agent(state):
        attempt_count[0] += 1
        if attempt_count[0] < 2:
            raise TimeoutError("Transient timeout")
        return {"test_field": "success"}
    
    result = await orchestrator._execute_agent_safe(
        "test_agent",
        None,
        flaky_agent,
        max_retries=3,
    )
    
    assert result.status == ExecutionStatus.SUCCESS
    assert attempt_count[0] == 2  # Failed once, succeeded on retry
```

---

## Implementation Checklist

- [ ] Create `app/graph/orchestrator.py` with GraphOrchestrator class
- [ ] Create `app/services/persistence_optimizer.py` with eager loading + deduplication
- [ ] Create `app/services/status_rules.py` with centralized status logic
- [ ] Update `workflow.py` to use orchestrator
- [ ] Update `analysis_service.py` to use persistence optimizer
- [ ] Update convergence nodes to use status_rules
- [ ] Add comprehensive tests
- [ ] Verify no regressions in existing tests
- [ ] Performance test: report generation latency before/after
- [ ] Document orchestrator architecture

---

**Next Step**: After completing Phase A, move to Phase B (Evidence Quality)
