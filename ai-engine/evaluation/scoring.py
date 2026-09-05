from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable


# Weights affect only the aggregate structural-check score; they are not model
# accuracy or business success probabilities. Core structuring/evidence checks
# receive slightly more weight, while report presentation receives less.
DEFAULT_WEIGHTS: dict[str, float] = {
    "structuring": 0.12,
    "preflight": 0.10,
    "research": 0.10,
    "competition": 0.10,
    "customer": 0.10,
    "evidence": 0.12,
    "feasibility": 0.10,
    "red_team": 0.10,
    "verdict": 0.10,
    "report": 0.06,
}


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool | None
    detail: str


@dataclass(frozen=True)
class AreaScore:
    area: str
    score: float | None
    passed: int
    failed: int
    unavailable: int
    checks: tuple[Check, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "passed": self.passed,
            "failed": self.failed,
            "unavailable": self.unavailable,
            "checks": [
                {"name": check.name, "passed": check.passed, "detail": check.detail}
                for check in self.checks
            ],
        }


@dataclass(frozen=True)
class CaseScore:
    case_id: str
    categories: tuple[str, ...]
    areas: dict[str, AreaScore]
    overall_score: float | None
    unavailable_metrics: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "categories": list(self.categories),
            "overall_score": self.overall_score,
            "unavailable_metrics": list(self.unavailable_metrics),
            "areas": {name: area.to_dict() for name, area in self.areas.items()},
        }


def score_area(area: str, checks: Iterable[Check]) -> AreaScore:
    material = tuple(check for check in checks if check.passed is not None)
    passed = sum(check.passed is True for check in material)
    failed = sum(check.passed is False for check in material)
    unavailable = sum(check.passed is None for check in checks)
    score = round(passed / (passed + failed), 4) if material else None
    return AreaScore(area, score, passed, failed, unavailable, tuple(checks))


def score_case(
    case_id: str,
    categories: tuple[str, ...],
    areas: dict[str, AreaScore],
    weights: dict[str, float] | None = None,
) -> CaseScore:
    selected_weights = weights or DEFAULT_WEIGHTS
    available = [
        (name, area)
        for name, area in areas.items()
        if area.score is not None and selected_weights.get(name, 0) > 0
    ]
    weight_total = sum(selected_weights[name] for name, _ in available)
    overall = (
        round(sum(area.score * selected_weights[name] for name, area in available) / weight_total, 4)
        if weight_total
        else None
    )
    unavailable = tuple(name for name, area in areas.items() if area.score is None)
    return CaseScore(case_id, categories, areas, overall, unavailable)