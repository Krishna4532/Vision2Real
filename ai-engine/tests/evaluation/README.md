# Phase 7 testing and evaluation

This directory contains deterministic regression tests for the Vision2Real
benchmark harness. The dataset itself lives in
`ai-engine/evaluation/dataset/benchmark_cases.json` so new ideas can be added
without adding a large block of hard-coded test functions.

## Run the tests

From `ai-engine/`:

```bash
PYTHONPATH=. pytest -q
pytest -q tests/evaluation
```

The first command is the complete Phase 0–6 regression suite plus Phase 7
tests. The normal suite does not call live web research or an external LLM.
It uses the repository's deterministic `MockLLMProvider` and the existing
deterministic research/competition/customer templates.

## Run the benchmark

```bash
PYTHONPATH=. python -m evaluation.runner
PYTHONPATH=. python -m evaluation.runner --json
```

The runner creates a temporary SQLite database for Phase 6 report checks and
deletes it when the process exits. It does not alter the development database.
`--no-reports` can be used to measure the pre-report pipeline only.

## Quality gates

Scores alone are not a regression gate: an 0.87 overall score could hide one
serious safety failure mixed in with dozens of harmless presentational
misses. `evaluation/gates.py` turns per-check results into a real PASS/FAIL
verdict with a real process exit code (`python -m evaluation.runner` exits
`0` on PASS, `1` on FAIL), by splitting checks into two categories:

**Critical** - safety/integrity invariants, matched by check name (see
`CRITICAL_CHECK_PREFIXES`/`CRITICAL_CHECK_EXACT` in `evaluation/gates.py`):

- `evidence.*` — evidence integrity and provenance
- `structuring.unknown_preserved.*` — missing information stays `unknown`, never fabricated
- `verdict.*` — deterministic verdict safety (e.g. a critical risk can never coexist with `BUILD`)
- `report.no_fabricated_market_size`, `report.visualization_references_resolve`, `report.degraded_state_explicit` — report/visualization provenance
- `preflight.stops_downstream` — a rejected/malicious input must never leak into downstream structured analysis

**Any** critical check that fails, in any case, fails the whole benchmark.
An **unavailable** (not-applicable) critical check also fails the benchmark
*unless* that specific case's own `preflight.stops_downstream` check
verifiably passed — i.e. the pipeline was legitimately supposed to stop
there (a rejected input correctly never reaches Synthesis or the Decision
Gate, so those checks being unavailable is architecturally correct, not a
verification gap). Unavailability is never silently treated as passing in
any other case.

**Non-critical** - everything else (structuring's classification-label
recall, research/competition/customer/feasibility/red_team/report's
remaining presentational checks). Judged against a configurable per-area
minimum pass rate (`NON_CRITICAL_AREA_THRESHOLDS`, default `0.6` for every
area) rather than requiring every check to pass. `0.6` was chosen because it
sits below every non-critical area's currently-measured score against the
real dataset (structuring ~0.74, the rest 0.8-1.0) - low enough not to trip
on the known `MockLLMProvider` vocabulary limitation described below, high
enough to catch an actual regression.

Run `python -m evaluation.runner` and check the process exit code (`echo
$?` after running, or `$LASTEXITCODE` in PowerShell) or the `quality_gate`
key in `--json` output to use this as a CI gate.

## Dataset and criteria

The 15 cases cover strong, weak, crowded, novel, SaaS, AI, marketplace,
consumer, local, hardware, regulated, incomplete, ambiguous, empty,
spam-like, and prompt-injection inputs. Each case has a stable ID, raw idea,
categories, expected structural characteristics, and human-readable criteria.

The evaluator checks properties such as:

- required structured fields are meaningful when expected
- missing fields remain `unknown`
- pre-flight rejection/clarification happens before downstream work
- supported claims have evidence and evidence/source identity is preserved
- mock or illustrative sources are not promoted to supported facts
- trusted competitor records have evidence references
- customer assumptions remain labeled as hypotheses
- feasibility categories and MVP structure are present
- red-team material findings are traceable or explicitly inference/hypothesis
- verdicts use supported outcomes, rule traces, and conservative degraded behavior
- reports preserve IDs/status, expose degraded state, and do not fabricate market-size data

The harness does not require exact LLM prose and does not assert that an idea
is commercially good. It measures only declared structural checks.

## Scoring

Each check is `true`, `false`, or `unavailable`. An area's score is the pass
rate over its measured checks. The overall score is a weighted mean over
available area scores, renormalized when an area is unavailable. The default
weights are configurable in `evaluation/scoring.py`; structuring and evidence
receive slightly higher weight because they protect downstream truthfulness,
and report presentation receives slightly lower weight.

Unavailable is not converted to zero and is never replaced with a fabricated
accuracy number. A case can therefore have a lower overall coverage when
pre-flight rejects it, while research/report areas are correctly reported as
not applicable.

## Deterministic versus external evaluation

The standard regression suite and benchmark use the deterministic mock provider
and temporary fixtures. They make no ordinary external API or live-web calls.
The harness has no hidden LLM-dependent score. If a future real provider is
added, it should be run as a separately provisioned evaluation job and its
results should be labeled provider-dependent rather than compared directly to
the deterministic regression score.

## Limitations

- The current repository's research, competition, and customer providers are
  static/mock templates. The benchmark can verify evidence honesty and
  provenance, but cannot measure real-world research recall or source quality.
- `MockLLMProvider` (`app/services/llm_provider.py`) only produces
  differentiated structured/classification output for two hardcoded idea
  phrases ("ai tutor", "app idea"); every other benchmark idea - including
  most of the 15-case dataset - falls through to a generic
  `labels=["General"]` / unspecified-field response regardless of its actual
  content. This is why `structuring`'s classification-label checks
  (`required_labels` such as `SaaS`, `Marketplace`, `AI`) fail for several
  cases and why `structuring` sits at ~0.74 rather than higher. It is a mock
  vocabulary limitation, not a Phase 1-6 regression, and is why
  `structuring` is a non-critical gate with a threshold below its current
  score rather than a critical one - see "Quality gates" above. Extending
  the mock's vocabulary, or wiring in a real provider, would close this gap;
  neither was done here since it is out of Phase 7's scope (Phase 7 evaluates
  the existing pipeline, it does not extend it).
- The dataset is representative, not statistically sampled from startups.
- Structural pass rates are regression signals, not product-market-fit
  predictions, investment advice, or model accuracy.
- Exact natural-language quality, nuanced competitor recall, and live-web
  freshness remain unavailable without a separately configured provider.

## Regression this harness caught while being built

Building the `report.degraded_state_explicit` critical check surfaced a real
bug: `report_service.py`'s `_DEGRADED_STATUSES` set was missing
`"requires_clarification"`, so `FounderReport.degraded` silently stayed
`False` for the 9 of 15 benchmark cases that legitimately land on that
status. Fixed as part of this Phase 7 work (one-line change, regression-
tested); see `app/services/report_service.py` and this directory's
`test_regression_invariants.py`/`../test_phase_6_report.py` for coverage.
This is the kind of thing the benchmark exists to catch.
