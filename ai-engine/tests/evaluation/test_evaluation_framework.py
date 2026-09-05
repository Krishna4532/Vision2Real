import pytest

from app.services.analysis_service import run_analysis_pipeline
from app.services.llm_provider import MockLLMProvider
from evaluation.evaluators import evaluate_case
from evaluation.scoring import score_case


@pytest.mark.asyncio
async def test_evaluator_measures_structural_properties_without_exact_prose(benchmark_cases):
    case = next(case for case in benchmark_cases if case.id == "strong-ai-tutor-saas")
    result = await run_analysis_pipeline(case.idea, llm_provider=MockLLMProvider())
    areas = evaluate_case(case, result)
    scored = score_case(case.id, case.categories, areas)

    assert scored.overall_score is not None
    assert areas["structuring"].score is not None
    assert areas["evidence"].score is not None
    assert all(check.name and check.detail for area in areas.values() for check in area.checks)


@pytest.mark.asyncio
async def test_rejected_cases_have_unavailable_downstream_metrics(benchmark_cases):
    case = next(case for case in benchmark_cases if case.id == "prompt-injection-input")
    result = await run_analysis_pipeline(case.idea, llm_provider=MockLLMProvider())
    areas = evaluate_case(case, result)
    scored = score_case(case.id, case.categories, areas)

    assert result.status == "rejected"
    assert areas["preflight"].score is not None
    assert areas["research"].score is None
    assert areas["report"].score is None
    assert "research" in scored.unavailable_metrics


@pytest.mark.asyncio
async def test_ambiguous_case_requires_clarification_and_unknowns(benchmark_cases):
    case = next(case for case in benchmark_cases if case.id == "ambiguous-app-idea")
    result = await run_analysis_pipeline(case.idea, llm_provider=MockLLMProvider())
    areas = evaluate_case(case, result)

    assert result.preflight.status == "requires_clarification"
    assert result.structured_idea is not None
    assert areas["preflight"].failed == 0
    assert areas["structuring"].failed == 0