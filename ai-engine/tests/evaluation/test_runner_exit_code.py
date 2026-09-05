"""
CLI-level tests for evaluation/runner.py's exit-code behavior. These run the
real benchmark against the real (mock-provider) pipeline - slower than
test_quality_gates.py's synthetic fixtures, but necessary to prove the CLI
actually wires scoring -> gates -> exit code together end-to-end, not just
that the gate function is correct in isolation.
"""
from __future__ import annotations

import pytest

from evaluation.gates import evaluate_quality_gates
from evaluation.runner import run_benchmark


@pytest.mark.asyncio
async def test_benchmark_run_includes_quality_gate_and_passes_on_the_real_dataset():
    summary = await run_benchmark()
    gate = summary["quality_gate"]
    assert "passed" in gate
    assert isinstance(gate["passed"], bool)
    # The real dataset against the real (mock-provider) pipeline is expected
    # to pass today - if this flips to False, something has genuinely
    # regressed (see evaluation/gates.py for what counts as critical).
    assert gate["passed"] is True, gate


def test_main_returns_zero_when_gate_passes(monkeypatch):
    import evaluation.runner as runner_mod

    async def _fake_run_benchmark(*args, **kwargs):
        return {
            "dataset_cases": 1,
            "case_results": [],
            "per_component": {},
            "overall_score": 1.0,
            "overall_cases_measured": 1,
            "unavailable_metrics": [],
            "weights": {},
            "metric_note": "",
            "quality_gate": {"passed": True, "critical_failures": [], "non_critical_failures": []},
        }

    monkeypatch.setattr(runner_mod, "run_benchmark", _fake_run_benchmark)
    monkeypatch.setattr("sys.argv", ["evaluation.runner"])
    exit_code = runner_mod.main()
    assert exit_code == 0


def test_main_returns_nonzero_when_gate_fails(monkeypatch):
    import evaluation.runner as runner_mod

    async def _fake_run_benchmark(*args, **kwargs):
        return {
            "dataset_cases": 1,
            "case_results": [],
            "per_component": {},
            "overall_score": 0.3,
            "overall_cases_measured": 1,
            "unavailable_metrics": [],
            "weights": {},
            "metric_note": "",
            "quality_gate": {
                "passed": False,
                "critical_failures": [{"case_id": "x", "check": "evidence.supported_claims_have_evidence", "detail": "broken", "reason": "failed"}],
                "non_critical_failures": [],
            },
        }

    monkeypatch.setattr(runner_mod, "run_benchmark", _fake_run_benchmark)
    monkeypatch.setattr("sys.argv", ["evaluation.runner"])
    exit_code = runner_mod.main()
    assert exit_code == 1


def test_gates_module_is_reachable_from_runner_module():
    """Sanity check the wiring: runner.py must actually import and call
    evaluate_quality_gates, not just define an unused import."""
    import inspect
    import evaluation.runner as runner_mod

    source = inspect.getsource(runner_mod)
    assert "evaluate_quality_gates(" in source
