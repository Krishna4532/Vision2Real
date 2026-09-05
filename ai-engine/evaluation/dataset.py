from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_DATASET_PATH = Path(__file__).with_name("dataset") / "benchmark_cases.json"


@dataclass(frozen=True)
class BenchmarkCase:
    """One maintainable benchmark input and its structural expectations.

    Expectations intentionally describe properties and invariants rather than
    exact generated prose. This lets the benchmark test behavior without
    treating one wording choice as the only correct answer.
    """

    id: str
    idea: str
    categories: tuple[str, ...]
    expected: dict[str, Any]
    criteria: tuple[str, ...]


def load_dataset(path: str | Path | None = None) -> list[BenchmarkCase]:
    dataset_path = Path(path) if path else DEFAULT_DATASET_PATH
    payload = json.loads(dataset_path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1:
        raise ValueError(f"Unsupported benchmark dataset schema: {payload.get('schema_version')!r}")

    cases: list[BenchmarkCase] = []
    seen_ids: set[str] = set()
    for raw_case in payload.get("cases", []):
        case = BenchmarkCase(
            id=raw_case["id"],
            idea=raw_case["idea"],
            categories=tuple(raw_case["categories"]),
            expected=dict(raw_case["expected"]),
            criteria=tuple(raw_case["criteria"]),
        )
        if not case.id or case.id in seen_ids:
            raise ValueError(f"Benchmark case IDs must be unique and non-empty: {case.id!r}")
        if not case.idea and case.expected.get("preflight_status") != "rejected":
            raise ValueError(f"Only rejected cases may have an empty idea: {case.id}")
        if not case.categories or not case.criteria:
            raise ValueError(f"Benchmark case needs categories and criteria: {case.id}")
        seen_ids.add(case.id)
        cases.append(case)

    if not cases:
        raise ValueError("Benchmark dataset is empty")
    return cases