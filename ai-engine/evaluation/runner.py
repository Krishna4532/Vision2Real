from __future__ import annotations

import argparse
import asyncio
import json
import os
import tempfile
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from evaluation.dataset import BenchmarkCase, load_dataset
from evaluation.evaluators import evaluate_case
from evaluation.gates import QualityGateResult, evaluate_quality_gates
from evaluation.scoring import AreaScore, CaseScore, DEFAULT_WEIGHTS, score_case


async def _persist_for_report(result: Any, case: BenchmarkCase, session: Any) -> None:
    from app.models.analysis import AnalysisJobORM
    from app.services.analysis_service import save_analysis_findings

    job = AnalysisJobORM(
        id=result.analysis_id,
        raw_idea=case.idea,
        status=result.status,
        current_stage=result.current_stage,
        structured_result=result.structured_idea.model_dump() if result.structured_idea else None,
        classification=result.classification.model_dump() if result.classification else None,
        preflight=result.preflight.model_dump() if result.preflight else None,
        research_status=result.research_status,
        competition_status=result.competition_status,
        customer_status=result.customer_status,
        errors=result.errors,
        warnings=result.warnings,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(job)
    await session.flush()
    await save_analysis_findings(session, result.analysis_id, result)


async def run_benchmark(
    dataset_path: str | Path | None = None,
    *,
    include_reports: bool = True,
    weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Run all cases with the deterministic mock provider and return JSON-safe data."""

    # Importing the application only after setting these values makes the CLI
    # self-contained and keeps its temporary report database away from the
    # developer's normal test database.
    with tempfile.TemporaryDirectory(prefix="vision2real-benchmark-") as temp_dir:
        db_path = Path(temp_dir) / "benchmark.db"
        os.environ["VISION2REAL_ENVIRONMENT"] = "test"
        os.environ["VISION2REAL_DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
        os.environ["VISION2REAL_DATABASE_URL_SYNC"] = f"sqlite:///{db_path}"

        from app.core.database import AsyncSessionLocal, init_db
        from app.services.analysis_service import run_analysis_pipeline
        from app.services.report_service import generate_founder_report
        from app.services.llm_provider import MockLLMProvider

        await init_db()
        cases = load_dataset(dataset_path)
        case_results: list[CaseScore] = []

        for case in cases:
            result = await run_analysis_pipeline(case.idea, llm_provider=MockLLMProvider())
            report = None
            if include_reports:
                async with AsyncSessionLocal() as session:
                    await _persist_for_report(result, case, session)
                    await session.commit()
                async with AsyncSessionLocal() as session:
                    report = await generate_founder_report(result.analysis_id, session)
            areas = evaluate_case(case, result, report)
            case_results.append(score_case(case.id, case.categories, areas, weights))

        gate_result = evaluate_quality_gates(case_results)
        return _build_summary(case_results, cases, gate_result)


def _build_summary(case_results: list[CaseScore], cases: list[BenchmarkCase], gate_result: QualityGateResult) -> dict[str, Any]:
    area_names = tuple(DEFAULT_WEIGHTS)
    area_summary: dict[str, dict[str, Any]] = {}
    for area_name in area_names:
        area_scores = [case.areas[area_name] for case in case_results if case.areas[area_name].score is not None]
        area_summary[area_name] = {
            "score": round(sum(area.score for area in area_scores) / len(area_scores), 4) if area_scores else None,
            "cases_measured": len(area_scores),
            "cases_unavailable": len(case_results) - len(area_scores),
            "checks_passed": sum(area.passed for area in area_scores),
            "checks_failed": sum(area.failed for area in area_scores),
        }
    overall_scores = [case.overall_score for case in case_results if case.overall_score is not None]
    return {
        "dataset_cases": len(cases),
        "case_results": [case.to_dict() for case in case_results],
        "per_component": area_summary,
        "overall_score": round(sum(overall_scores) / len(overall_scores), 4) if overall_scores else None,
        "overall_cases_measured": len(overall_scores),
        "unavailable_metrics": sorted({
            area_name
            for case in case_results
            for area_name in case.unavailable_metrics
        }),
        "weights": DEFAULT_WEIGHTS,
        "metric_note": "Scores are pass rates for declared structural checks, not model accuracy or business success.",
        "quality_gate": gate_result.to_dict(),
    }


def _print_summary(summary: dict[str, Any]) -> None:
    print(f"Vision2Real Phase 7 benchmark: {summary['dataset_cases']} cases")
    print(f"Overall structural-check score: {summary['overall_score']}")
    print("Per-component scores:")
    for name, values in summary["per_component"].items():
        print(
            f"  {name:12} score={values['score']} "
            f"measured_cases={values['cases_measured']} "
            f"passed={values['checks_passed']} failed={values['checks_failed']}"
        )
    print("Unavailable metrics:", ", ".join(summary["unavailable_metrics"]) or "none")
    print("Case scores:")
    for case in summary["case_results"]:
        print(f"  {case['case_id']:28} overall={case['overall_score']} unavailable={','.join(case['unavailable_metrics']) or 'none'}")

    gate = summary["quality_gate"]
    print()
    print(f"Quality gate: {'PASS' if gate['passed'] else 'FAIL'}")
    if gate["critical_failures"]:
        print(f"  Critical failures ({len(gate['critical_failures'])}):")
        for failure in gate["critical_failures"]:
            print(f"    [{failure['reason']}] {failure['case_id']} :: {failure['check']} - {failure['detail']}")
    if gate["non_critical_failures"]:
        print(f"  Non-critical threshold breaches ({len(gate['non_critical_failures'])}):")
        for failure in gate["non_critical_failures"]:
            print(f"    {failure['area']}: score={failure['score']} < threshold={failure['threshold']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the deterministic Vision2Real Phase 7 benchmark.")
    parser.add_argument("--dataset", type=Path, default=None, help="Optional path to a benchmark_cases.json file.")
    parser.add_argument("--no-reports", action="store_true", help="Skip persisted Phase 6 report checks.")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Emit the complete machine-readable JSON report.")
    args = parser.parse_args()
    summary = asyncio.run(run_benchmark(args.dataset, include_reports=not args.no_reports))
    if args.as_json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        _print_summary(summary)
    return 0 if summary["quality_gate"]["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())