import sys
from pathlib import Path

import pytest

# Pytest may place tests/evaluation ahead of the project root on sys.path.
# Keep imports pointed at ai-engine/evaluation rather than this test directory,
# which intentionally has the same final path component.
PROJECT_ROOT = Path(__file__).parents[2]
sys.path[:] = [entry for entry in sys.path if entry != str(PROJECT_ROOT)]
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.dataset import load_dataset


@pytest.fixture(scope="session")
def benchmark_cases():
    return load_dataset()


@pytest.fixture(scope="session")
def benchmark_dataset_path() -> Path:
    return Path(__file__).parents[2] / "evaluation" / "dataset" / "benchmark_cases.json"