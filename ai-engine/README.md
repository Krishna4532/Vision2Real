# Vision2Real AI Engine

This repository contains the Phase 1 + Phase 2 implementation of the Vision2Real
AI Intelligence Engine.

## Quick start

1. Create a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and adjust values. Variable names must match
   `Settings` field names exactly with the `VISION2REAL_` prefix (e.g.
   `VISION2REAL_DATABASE_URL` -> `Settings.database_url`).
4. Run migrations: `alembic upgrade head`
5. Start the API: `uvicorn app.main:app --reload`

## Pipeline

```
Founder Idea -> Pre-flight -> Idea Structuring -> Classification
                                                        |
                          +----------- parallel --------+---------+
                          v                              v          v
                      Research                     Competition   Customer
                          +-------------- converge -------------+
                                            v
                                     Combined State -> Persistence -> API
```

## Current scope (Phase 2 complete)

- raw founder idea intake, API job creation, analysis persistence
- LangGraph execution with parallel Phase 2 agents and a convergence node
- pre-flight validation (including prompt-injection screening)
- idea structuring, multi-label classification
- Research, Competition, Customer agents
- Claims/Evidence/Sources evidence architecture with many-to-many relationships
- degraded-state handling when one or more Phase 2 agents fail

## Provenance honesty (read before extending Research/Competition/Customer)

Research routes through `BaseResearchProvider` (`app/services/research_provider.py`)
and its claims are labeled `"inference"` - plausible signal derived from a
provider, not verified fact.

Competition and Customer do **not** currently call any research/search
provider - they use static, hand-authored illustrative templates keyed off
idea category. Because of that, every claim they produce is capped at
`"hypothesis"` status, and their mock/illustrative sources are clearly
labeled as such (`[MOCK]` titles, `credibility_notes` disclosing the
template origin, `provenance["mock_data"] = True`). **Do not** relabel these
as `"supported"` or attach real-looking sources without actually wiring in a
real provider first - see `competition_agent.py`'s module docstring for the
full rationale. This was a real bug found and fixed during the Phase 2 audit
(named real companies with fabricated pricing were previously presented as
`"supported"` fact, cited to fake `example.com` URLs).

## Provider configuration

`app/services/llm_provider.py::get_llm_provider()` and
`app/services/research_provider.py::get_research_provider()` read
`VISION2REAL_LLM_PROVIDER` / `VISION2REAL_RESEARCH_PROVIDER` from settings.
Only `"mock"` is implemented for each; add a real provider by subclassing
`BaseLLMProvider` / `BaseResearchProvider` and adding a branch to the
relevant factory function - no other code needs to change, since
`app/graph/workflow.py::build_graph()` binds the provider to nodes via
`functools.partial` and threads it through the whole graph run.

## Future phases

Phase 3+ (Product & Feasibility, Red Team, Validation & Strategy,
Deterministic Verdict, Structured Report, visualization) is intentionally
not built yet.
