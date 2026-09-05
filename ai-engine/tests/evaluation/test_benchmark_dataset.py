from evaluation.dataset import load_dataset


REQUIRED_CATEGORIES = {
    "strong",
    "weak",
    "crowded",
    "novel",
    "saas",
    "ai",
    "marketplace",
    "consumer",
    "local",
    "hardware",
    "regulated",
    "incomplete",
    "ambiguous",
}


def test_dataset_is_stable_and_representative(benchmark_cases):
    ids = [case.id for case in benchmark_cases]
    categories = {category for case in benchmark_cases for category in case.categories}

    assert len(benchmark_cases) >= 15
    assert len(ids) == len(set(ids))
    assert REQUIRED_CATEGORIES.issubset(categories)
    assert all(case.idea or case.expected["preflight_status"] == "rejected" for case in benchmark_cases)
    assert all(case.criteria for case in benchmark_cases)


def test_dataset_loader_rejects_duplicate_ids(tmp_path, benchmark_dataset_path):
    payload = benchmark_dataset_path.read_text(encoding="utf-8").replace(
        '"id": "strong-ai-tutor-saas"', '"id": "duplicate-id"', 1
    ).replace(
        '"id": "weak-generic-productivity-app"', '"id": "duplicate-id"', 1
    )
    path = tmp_path / "duplicate.json"
    path.write_text(payload, encoding="utf-8")

    try:
        load_dataset(path)
    except ValueError as exc:
        assert "unique" in str(exc)
    else:
        raise AssertionError("duplicate dataset IDs must be rejected")