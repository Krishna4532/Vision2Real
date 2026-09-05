# Vision2Real — Quick Architecture Reference & Issue Guide

**Purpose**: Quick lookup for understanding current architecture and identified issues.

---

## System Data Flow

```
User Input (raw_idea)
    ↓
[PHASE 1: Validation & Structuring] (sequential, critical)
├─ Pre-flight Check (pattern matching)
├─ Idea Structuring (LLM extraction)
└─ Classification (multi-label)
    ↓
[PHASE 2: Research & Analysis] (parallel, optional)
├─ Research Agent (external web search)
├─ Competition Agent (LLM + evidence)
└─ Customer Agent (LLM + evidence)
    ↓ Convergence (combined_state_node)
    ↓
[PHASE 3: Synthesis & Analysis] (mostly parallel)
├─ Synthesis Agent (deterministic aggregation)
├─ [Business Model | Feasibility | Financial | Market | Risk] (parallel, LLM)
    ↓ Convergence (phase3_combined_state_node)
    ↓
[PHASE 3b: Adversarial] (sequential)
├─ Red Team Agent (LLM adversarial)
    ↓ Convergence (red_team_combined_state_node)
    ↓
[PHASE 4: Decision & Planning] (sequential)
├─ Decision Gate (deterministic rules)
└─ Validation Plan (LLM, if VALIDATE_MORE)
    ↓
Save to Database (claims, evidence, sources, results)
    ↓
API Returns AnalysisStatus / AnalysisResult / FounderReport
```

---

## Key Architectural Components

### GraphState (Central State Container)
- Carries all data through the pipeline
- Phase 1 fields: raw_idea, preflight, structured_idea, classification
- Phase 2 fields: research_result, competition_result, customer_result (+ _status, _errors)
- Phase 3 fields: synthesis, business_model, feasibility, financial, market, risk, red_team, decision (+ _status, _errors)
- Metadata: current_stage, status, errors, warnings

### Evidence Architecture (Knowledge Representation)
- **Claim**: Fact or hypothesis (claim_text, claim_type, status, confidence, evidence_ids)
- **Evidence**: Excerpt backing claim (excerpt, evidence_type, sources)
- **Source**: Document/URL (url, title, domain, credibility_score)
- **Basis**: How supported claim is (VERIFIED/INFERRED/ASSUMED/UNKNOWN)

### LLM Abstraction (Provider Layer)
- BaseLLMProvider (interface)
- MockLLMProvider (for testing)
- OpenAIProvider, AnthropicProvider, GeminiProvider (production)
- Agent services call provider.generate_structured(prompt, schema)

### Collaborative Reasoning (Wave 2 Infrastructure)
- SharedReasoningContext (aggregated view of all agents)
- Contradiction detection (customer vs pricing, market vs financial)
- Unknown propagation (unknown X blocks Y, Z)
- Confidence aggregation (overall system quality)

---

## Identified Issues by Component

### 1. Graph Orchestration (workflow.py)

**Issues**:
- ❌ Status degradation logic is fragmented across 3 convergence nodes (combined_state_node, phase3_combined_state_node, red_team_combined_state_node)
- ❌ No centralized status transition rules (inconsistent logic between phases)
- ❌ No retry logic (transient failures become permanent)
- ❌ Error propagation is lossy (can't distinguish which agent failed)
- ❌ No timeout handling on agents

**Location**: 
- `app/graph/workflow.py` lines 68-148
- `app/graph/state.py` (GraphState definition)

**Impact**:
- Status ambiguity leads to incorrect frontend behavior
- Transient timeouts require full re-run
- Unclear error messages to users

**Solution**:
- Create `app/graph/orchestrator.py` with GraphOrchestrator service
- Centralize status rules in `app/services/status_rules.py`
- Add retry logic with exponential backoff

---

### 2. Persistence Layer (ORM & Reconstruction)

**Issues**:
- ❌ N+1 query problem in reconstruction (load claims, then for each load evidence, then for each load sources)
- ❌ Claim deduplication is implicit (if LLM generates same claim as research, duplicates stored)
- ❌ Source deduplication unclear (same URL cited twice)
- ❌ Orphaned records possible if agent fails mid-save
- ❌ No transaction safety (partial saves possible)
- ❌ Schema versioning missing (can't migrate old analyses)

**Location**:
- `app/services/analysis_service.py` (reconstruct_analysis_result)
- `app/models/analysis.py` (ORM models)
- `app/models/evidence.py` (Claim, Evidence, Source ORM)

**Impact**:
- Report generation latency (100+ DB queries for single analysis)
- Duplicate claims in frontend/report
- Data inconsistency on failures

**Solution**:
- Use SQLAlchemy selectinload for eager loading (O(n) instead of O(n²))
- Implement explicit deduplication services
- Add transaction safety with nested transactions
- Add schema_version field for migrations

---

### 3. Agent Reasoning Quality

**Issues**:
- ❌ Phase 2 agents work in silos (competition doesn't know customer profile, customer doesn't know pricing)
- ❌ LLM prompts don't enforce "mark unknown if no evidence" (fabrication risk)
- ❌ No guidance to LLM to not invent CAC/LTV/revenue without evidence
- ❌ Validation experiments are template-driven ("What is X?") not specific
- ❌ Agents don't use collaborative context fully (collect it but don't leverage it)

**Locations**:
- `app/agents/competition_agent.py` (doesn't use customer context)
- `app/agents/customer_agent.py` (doesn't use market context)
- `app/agents/market_agent.py` (doesn't use competition context)
- `app/services/agent_services.py` (prompts need UNKNOWN_HANDLING_INSTRUCTION)
- `app/agents/decision_agent.py` (validation_plan_node)

**Impact**:
- Agents may fabricate data without evidence
- Validation plan is generic (not specific to founder's situation)
- Cross-agent dependencies not addressed

**Solution**:
- Update Phase 2 agents to explicitly use shared reasoning context
- Add UNKNOWN_HANDLING_INSTRUCTION to all LLM prompts
- Generate specific validation experiments (target segment, sample size, instructions)

---

### 4. Evidence Architecture

**Issues**:
- ❌ Contradiction detection is incomplete (basic contradictions only)
- ❌ Unknown propagation doesn't calculate downstream impact
- ❌ Provenance tracking incomplete (evidence type not tracked: verified vs. LLM-inferred)
- ❌ Claim deduplication logic not explicit
- ❌ Evidence lineage in report is weak (can't trace risk → claim → evidence → source)

**Location**:
- `app/services/collaborative_reasoning.py` (contradiction detection)
- `app/models/evidence.py` (no provenance_type field)
- `app/services/report_service.py` (limited lineage)

**Impact**:
- Contradictions not surfaced to founder
- Unknowns treated equally (some block everything, some don't matter)
- Can't trace why risk was identified

**Solution**:
- Enhance contradiction detector (customer vs pricing, market vs financial, feasibility vs timeline)
- Track unknown impact graph (unknown TAM → impacts financial, decision, valuation)
- Add provenance_type to Evidence (verified_source, llm_inferred, founder_stated)
- Include evidence_ids in all report outputs

---

### 5. Decision Logic

**Issues**:
- ❌ Confidence score is simplistic (weighted average by claim status, ignores importance)
- ❌ Unknown percentage is single threshold (0.4) but unknowns have different impact
- ❌ No distinction between critical unknowns (TAM, customer, competitive advantage) and nice-to-know
- ❌ Contradiction handling is weak (detected but not weighted in decision)
- ❌ Feasibility not integrated in decision (can BUILD even if technical feasibility unknown)
- ❌ Red team findings don't force VALIDATE_MORE for HIGH findings (only CRITICAL/FATAL)

**Location**:
- `app/services/decision_rules.py` (decide() function)
- Thresholds: BUILD_CONFIDENCE_THRESHOLD = 0.65, unknown_percentage > 0.4

**Impact**:
- Decision may be BUILD even when critical unknowns exist
- Contradictions not properly weighted
- Feasibility gaps ignored

**Solution**:
- Implement WeightedConfidenceCalculator (weight by impact: customer > market > business)
- Identify critical unknowns (TAM, customer, competitive advantage)
- Add rule: critical contradictions → VALIDATE_MORE (regardless of confidence)
- Add rule: feasibility failure/unknown → VALIDATE_MORE
- Add rule: HIGH red team → VALIDATE_MORE (not just CRITICAL)

---

### 6. Report Generation

**Issues**:
- ❌ Report assumes synthesis succeeded (no check on synthesis.status)
- ❌ Confidence visualization doesn't explain meaning to non-technical founder
- ❌ Report doesn't show contradictions (most important for resolution)
- ❌ Report doesn't explain impact of unknowns (founder doesn't know if unknown matters)
- ❌ Degradation not clearly communicated (report shows results as if complete)
- ❌ Evidence lineage is missing (founder can't trace claims to sources)

**Location**:
- `app/services/report_service.py`
- `app/schemas/report.py`

**Impact**:
- Founder misinterprets confidence level
- Contradictions not addressed
- Report feels complete even if degraded

**Solution**:
- Add degradation banner (status, missing components, impact)
- Add contradictions section (severity, title, resolution suggestion)
- Add confidence interpretation ("45% = speculative, needs heavy validation")
- Add impact explanation ("unknown customer blocks: revenue model, market fit, financial projections")
- Include evidence_ids and basis for all claims/risks
- Generate specific validation experiments (target segment, sample size, duration, instructions)

---

## Quick Lookup: "How do I find issue X?"

| Issue | Files | Lines | Symptom |
|-------|-------|-------|---------|
| Status logic fragmentation | workflow.py | 68-148 | Inconsistent status messages |
| N+1 queries | analysis_service.py | reconstruct_* | Slow report generation |
| Contradiction detection | collaborative_reasoning.py | ~100-150 | Contradictions not shown |
| Unknown handling | agent_services.py | ~50-100 | LLM fabricates numbers |
| Confidence scoring | decision_rules.py | ~100-150 | Wrong decisions |
| Report degradation | report_service.py | ~50-100 | Report looks complete when degraded |

---

## Production Readiness Score (Current)

| Component | Score | Status |
|-----------|-------|--------|
| Graph Orchestration | 3/10 | ❌ Fragmented, no retry |
| Persistence | 5/10 | ⚠️ Works but N+1 queries |
| Evidence Architecture | 6/10 | ⚠️ Good foundation, incomplete |
| Agent Reasoning | 6/10 | ⚠️ Works but not collaborative |
| Decision Logic | 6/10 | ⚠️ Deterministic but simplistic |
| Report Generation | 5/10 | ⚠️ Functional, poor communication |
| **OVERALL** | **5.2/10** | **⚠️ NOT PRODUCTION-READY** |

**Target after improvements**: 8.5/10 (Production-ready for founders & investors)

---

## Implementation Priority

1. **HIGH (Week 1-2)**: Graph Orchestration, Persistence Optimization
   - Foundation for reliability
   - Fixes transient failures, performance

2. **HIGH (Week 3-4)**: Evidence Architecture
   - Contradiction detection, unknown propagation
   - Enables better decision logic

3. **MEDIUM (Week 5-6)**: Agent Reasoning
   - Collaborative context usage
   - Rigorous LLM prompts

4. **MEDIUM (Week 7-8)**: Decision Logic
   - Weighted confidence
   - Critical unknown handling

5. **MEDIUM (Week 9-10)**: Report Generation
   - Uncertainty communication
   - Contradiction visibility

6. **LOW (Week 11-12)**: QA, Testing, Documentation

---

## References

- Full Review: `PRODUCTION_ARCHITECTURE_REVIEW.md`
- Phase A Plan: `IMPLEMENTATION_PLAN_PHASE_A.md`
- Repo Memory: `/memories/repo/vision2real-wave1-completion.md`, `/memories/repo/vision2real-wave2-implementation.md`
