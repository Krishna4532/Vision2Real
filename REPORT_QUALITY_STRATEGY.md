# Vision2Real: From Demo to Due Diligence Engine

**Objective**: When a founder uploads an idea, Vision2Real produces a report that matches what a top-tier VC associate or startup consultant would produce after a full day of research.

**Status**: Strategic pivot from Phase A → Report-First Architecture

---

## The 7 Architectural Principles (Non-Negotiable)

1. **No fabrication** — If evidence is missing, say "Unknown"
2. **Evidence before conclusions** — Every conclusion must be supported by claims and sources
3. **Cross-agent collaboration** — Agents challenge and refine each other's outputs
4. **Contradictions are first-class citizens** — Surface them rather than hiding them
5. **Uncertainty affects decisions** — Unknowns lower confidence and influence recommendations
6. **Founder-first reporting** — Every section helps the founder make better decisions
7. **Production-ready architecture** — Modular, deterministic, observable, extensible

---

## Current State → Target State

### Stage 1: Understand the Idea ✅
- Preflight (rejection/clarification detection)
- Structuring (extract structured fields)
- Classification (market category, customer segment)

**Status**: Good. No changes needed.

---

### Stage 2: Independent Investigation
**Current**: Basic research/competition/customer agents

**Target**: Domain experts with deep reasoning

#### Research Agent Should Answer
- [ ] What is this startup?
- [ ] What problem exists?
- [ ] How serious is the pain?
- [ ] How is it solved today?
- [ ] What trends matter?
- [ ] What evidence exists?

**Implementation**: Upgrade research_agent.py
- Better search query generation
- Evidence quality assessment
- Trend detection
- Gaps identification

#### Competition Agent Should Answer
- [ ] Direct competitors
- [ ] Indirect competitors
- [ ] Substitutes
- [ ] Switching costs
- [ ] Moats & positioning
- [ ] Pricing & differentiation
- [ ] Market saturation
- [ ] Barriers to entry

**Implementation**: Upgrade competition_agent.py
- Competitive positioning matrix
- Pricing comparison table
- Market saturation assessment
- Switching cost analysis

#### Customer Agent Should Answer
- [ ] ICP (Ideal Customer Profile)
- [ ] JTBD (Jobs to Be Done)
- [ ] Buying triggers
- [ ] Willingness to pay
- [ ] Adoption friction
- [ ] Acquisition channels
- [ ] Retention challenges
- [ ] Behavioral insights

**Implementation**: Upgrade customer_agent.py
- ICP persona development
- JTBD framework application
- Behavioral mapping
- Acquisition funnel design

**Every statement must cite evidence.**

---

### Stage 3: Collaborative Reasoning ⚠️ MISSING
**Current**: Agents run independently

**Target**: Agents debate and refine outputs

#### Cross-Agent Validation
Research → Competition → Customer → Synthesis

Example:
```
Research: Growing market
Competition: Extremely saturated
Customer: Low willingness to pay
Business Model: Subscription SaaS

System detects contradiction:
"Subscription model conflicts with observed willingness to pay 
in already saturated market"

System generates validation experiment:
"Survey 50 target customers on pricing tolerance"
```

**Implementation**: Create `app/services/cross_agent_reasoning.py`
- Agent output validation service
- Contradiction detection (automated)
- Evidence gap identification
- Validation experiment generation

**Key Functions**:
- `validate_agent_output(agent_name, output)` → checks for contradictions, gaps
- `synthesize_across_agents(research, competition, customer)` → identifies conflicts
- `generate_validation_experiments(contradictions, unknowns)` → ROI-ordered list

---

### Stage 4: Specialist Analysis
**Current**: Agents exist but don't consume upstream context

**Target**: Agents reason over full context

#### Business Model Agent
Should consume:
- [ ] Research findings
- [ ] Competition analysis
- [ ] Customer ICP & JTBD
- [ ] Contradictions
- [ ] Unknowns

And produce:
- [ ] Revenue model
- [ ] Unit economics assumptions
- [ ] Defensibility assessment
- [ ] Scalability analysis

**NOT**: Fabricate financial assumptions

**Implementation**: Upgrade business_model_agent.py
- Consume SharedReasoningContext
- Validate pricing vs customer research
- Flag contradictions
- Mark all UNKNOWN fields explicitly

#### Risk Agent
**Current**: Invents risks

**Target**: Derives risks from evidence

Example:
```
Research: No regulation found
→ Risk: Regulatory uncertainty (UNKNOWN)
→ Validation: Consult legal expert

Competition: Entrenched competitor
→ Risk: Market displacement
→ Validation: Interview 3 enterprise customers
```

**Implementation**: Upgrade risk_agent.py
- Derive risks from contradictions
- Derive risks from unknown propagation
- Derive risks from low confidence
- Each risk maps to validation experiment

#### Market Agent
**Current**: Estimates TAM/SAM/SOM

**Target**: Only calculates when evidence exists

Example:
```
Market:
- TAM: $2.5B (based on analyst reports, customer research)
- SAM: Unknown (customer segmentation unclear)
- SOM: $50M (conservative given market saturation)

Confidence:
- TAM: 70% (multiple data sources)
- SAM: 20% (need customer research)
- SOM: 40% (execution risk high)
```

**Implementation**: Upgrade market_agent.py
- Require evidence for each estimate
- Show confidence scores
- Mark UNKNOWN fields
- Flag assumptions

#### Red Team Agent
**Current**: Generic criticism

**Target**: Real attacks on assumptions

**Implementation**: Upgrade red_team_agent.py
- Attack customer assumption
- Attack market assumption
- Attack financial assumption
- Attack technical feasibility
- Attack competitive positioning

---

### Stage 5: Global Reasoning
**Current**: Decision gate + validation plan (basic)

**Target**: Investment committee-level reasoning

System should automatically answer:

1. **What are the biggest contradictions?**
   - Customer vs Pricing
   - Market Size vs Financial
   - Feasibility vs Timeline
   - Competition vs Positioning

2. **What assumptions matter most?**
   - Customer adoption rate
   - Market size estimate
   - Pricing model
   - Technical feasibility
   - Competitive response

3. **Which findings are strongest?**
   - Most evidence-backed
   - Highest confidence
   - Most corroborated

4. **Which evidence is weakest?**
   - Unverified claims
   - Contradicted by other agents
   - Low credibility sources

5. **What would change the recommendation?**
   - If market actually $10B → BUILD
   - If customer WTP is $5/month → PIVOT
   - If 3 entrenched competitors → STOP

6. **What experiments reduce uncertainty fastest?**
   - Ordered by ROI (learning per dollar/time)
   - Concrete, actionable
   - Timeline to results

7. **What is the probability this startup succeeds?**
   - Based on evidence strength
   - Market size confidence
   - Competitive position
   - Team assessment

**Implementation**: Create `app/services/global_reasoning_engine.py`
- Contradiction scoring
- Assumption importance ranking
- Evidence quality assessment
- Recommendation sensitivity analysis
- Success probability calculation

---

### Stage 6: Founder Report
**Current**: Basic report dump

**Target**: Professional due diligence report

#### Structure (5 Sections + Appendix)

**Executive Summary (3 paragraphs)**
- What this startup does
- Market opportunity size & confidence
- Key risk/opportunity

**Investment Recommendation**
- BUILD / VALIDATE / PIVOT / STOP
- With reasoning

**Confidence Score**
- Not just: 78%
- But why:
  - Customer validation: 85% (3 deep interviews)
  - Market size: 45% (analyst reports only, need primary research)
  - Financial assumptions: 30% (no unit economics data)
  - Overall: 53% (below 60% threshold)

**Strengths (Evidence-Backed)**
- Founded by Y Combinator alum (LinkedIn verified)
- $2M warm leads in pipeline (customer research confirmed)
- Unique IP in regulatory compliance (patent filed)

**Weaknesses (Evidence-Backed)**
- Market penetration requires $5M marketing (no proof)
- 3 entrenched competitors with $500M ARR (Crunchbase)
- Pricing: $5/month but ICP budget is $500/month (contradiction)

**Contradictions**
- Customer research shows enterprise focus, but pricing is SMB
- Market size estimates vary 10x depending on segment
- Financial projections don't match unit economics assumptions

**Unknowns**
- Primary customer not confirmed (research shows SMB/Enterprise possible)
- Regulatory environment not researched
- Competitive response unknown
- Team has no SaaS exit experience

**Validation Roadmap**
Ordered by ROI:

| Experiment | Learning | Cost | Time | Confidence Gain |
|-----------|----------|------|------|-----------------|
| 20 customer interviews | Product-market fit | $2k | 2 weeks | +20% |
| Landing page test | CAC & conversion | $1k | 1 week | +10% |
| Pricing survey | WTP | $500 | 3 days | +15% |
| Regulatory consult | Legal risk | $5k | 2 weeks | +12% |

---

### Stage 7: Evidence Appendix
**Current**: Claims without full lineage

**Target**: Full traceability

```
Recommendation: BUILD

Reason: Market size ($2.5B) + low competition + high customer WTP
  ↓
Claim: TAM is $2.5B
  ↓
Evidence: 
  - Gartner market report 2024
  - Customer interviews (10 customers, avg $500/month × 10k potential)
  ↓
Source: 
  - "2024 SaaS Market Report" (Gartner, 2024)
  - Interview notes (3 customers, 2024-09-01)
  ↓
Confidence: 65% (analyst report + primary data, but segment overlap unclear)
```

**Implementation**: Enhance report_service.py
- Add evidence lineage to every claim
- Show source credibility score
- Show confidence by evidence type
- Make it clickable/expandable in UI

---

## Implementation Priority (What to Implement First)

### Week 1: Cross-Agent Reasoning Engine
Create `app/services/cross_agent_reasoning.py`
- [ ] Contradiction detection
- [ ] Evidence gap identification
- [ ] Validation experiment generation
- [ ] Output validation service

This enables agents to challenge each other.

### Week 2: Upgrade Research & Competition Agents
- [ ] Enhanced search query generation
- [ ] Evidence quality assessment
- [ ] Competitive matrix
- [ ] Switching cost analysis

### Week 3: Upgrade Customer & Business Model Agents
- [ ] ICP persona development
- [ ] JTBD framework
- [ ] Consume cross-agent findings
- [ ] Flag contradictions

### Week 4: Global Reasoning Engine
Create `app/services/global_reasoning_engine.py`
- [ ] Assumption importance ranking
- [ ] Evidence quality assessment
- [ ] Success probability calculation
- [ ] Recommendation sensitivity analysis

### Week 5: Upgrade Report Generation
Update `app/services/report_service.py`
- [ ] Professional structure (Executive Summary, Recommendation, Confidence, etc.)
- [ ] Contradictions section
- [ ] Unknowns section
- [ ] Validation roadmap (ROI-ordered)
- [ ] Evidence lineage

---

## Key Files to Create/Update

### Create (New)
- [ ] `app/services/cross_agent_reasoning.py` (500+ lines)
- [ ] `app/services/global_reasoning_engine.py` (400+ lines)

### Update (Existing)
- [ ] `app/agents/research_agent.py` (better evidence gathering)
- [ ] `app/agents/competition_agent.py` (deeper analysis)
- [ ] `app/agents/customer_agent.py` (JTBD + ICP)
- [ ] `app/agents/business_model_agent.py` (consume context)
- [ ] `app/agents/risk_agent.py` (derive from evidence)
- [ ] `app/agents/market_agent.py` (confidence-based)
- [ ] `app/agents/red_team_agent.py` (real attacks)
- [ ] `app/services/report_service.py` (professional formatting)

---

## Success Criteria

After implementation:

1. **No fabrication**: Every claim in report is traceable to evidence
2. **Founder understanding**: Founder knows why recommendation made
3. **Actionable validation**: Roadmap tells founder exactly what to do
4. **Professional quality**: Report reads like McKinsey/Sequoia assessment
5. **Contradictions surfaced**: Not hidden, prominently featured
6. **Confidence explained**: Founder knows uncertainty level
7. **Evidence lineage complete**: Every claim clickable to sources

---

## Strategic Decision Points

### Should we keep the old tests?
**No.** Tests validate individual components. We need end-to-end report quality validation.

### Should we iterate on prompts?
**Yes.** Every agent needs better prompts that guide toward evidence-based reasoning.

### Should we add more agents?
**No.** Improve the 9 we have. Quality > Quantity.

### Should we change the database?
**No.** Current schema supports everything we need.

### Should we change the API?
**Maybe slightly.** Report response might expand, but backward compatible.

---

## The North Star

**When a founder sees Vision2Real's report:**
- [ ] They trust every number
- [ ] They understand every recommendation
- [ ] They know what to validate next
- [ ] They recognize it as professional-quality analysis
- [ ] They don't see LLM hallucinations
- [ ] They see evidence for every claim
- [ ] They see contradictions clearly
- [ ] They know the confidence level
- [ ] They can challenge it point-by-point
- [ ] They can share it with investors

That's the goal.

