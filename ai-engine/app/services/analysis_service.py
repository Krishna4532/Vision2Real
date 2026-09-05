from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import logger
from app.models.evidence import ClaimORM, EvidenceORM, SourceORM, ResearchResultORM, CompetitionResultORM, CustomerResultORM
from app.models.analysis import AnalysisJobORM
from app.models.phase3 import Phase3ResultORM, RiskORM, risk_evidence_association, RedTeamFindingORM, red_team_finding_evidence_association
from app.schemas.analysis import (
    AnalysisResult,
    ClassificationResult,
    PreflightResult,
    StructuredIdea,
)
from app.schemas.evidence import Claim, Evidence, Source, ResearchResult, CompetitionResult, CustomerResult
from app.schemas.phase3 import (
    SynthesisResult,
    BusinessModelResult,
    FeasibilityResult,
    MarketResult,
    RiskResult,
    RiskItem,
    RedTeamResult,
    RedTeamFinding,
    DecisionResult,
    ValidationPlan,
)
from app.services.intelligence_framework import enforce_quality_gate
from app.services.llm_provider import BaseLLMProvider, get_llm_provider


def _normalize_unknown(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else "unknown"


def run_preflight(raw_idea: str) -> PreflightResult:
    cleaned = raw_idea.strip()
    flags: list[str] = []
    concerns: list[str] = []
    clarifying: list[str] = []
    unknowns: list[str] = []

    if not cleaned:
        return PreflightResult(is_valid=False, status="rejected", flags=["empty_input"], concerns=["Input is empty."], unknowns=[], clarifying_questions=[])

    if len(cleaned) < 8:
        flags.append("insufficient_information")
        concerns.append("Input is too short to meaningfully evaluate.")
        clarifying.append("Please provide more detail about the product idea.")

    if "ignore all previous instructions" in cleaned.lower() or "reveal your system prompt" in cleaned.lower():
        flags.append("prompt_injection")
        concerns.append("Input attempts to override system instructions.")
        return PreflightResult(is_valid=False, status="rejected", flags=flags, concerns=concerns, unknowns=unknowns, clarifying_questions=clarifying)

    if any(token in cleaned.lower() for token in ["asdf", "lorem ipsum", "test idea", "random idea"]):
        flags.append("meaningless_input")
        concerns.append("Input is not a meaningful founder idea.")

    if any(token in cleaned.lower() for token in ["sell my data", "click here", "free money", "hacked"]):
        flags.append("spam_or_malicious")
        concerns.append("Input appears to be spam or malicious.")

    if len(cleaned) < 20:
        unknowns.append("customer")
        unknowns.append("market")
        clarifying.append("What customer problem are you solving?")

    if "idea" in cleaned.lower() and len(cleaned.split()) <= 5:
        flags.append("ambiguous")
        clarifying.append("Can you describe the actual problem, customer, and solution?")

    is_valid = not any(flag in {"prompt_injection", "meaningless_input", "spam_or_malicious", "empty_input"} for flag in flags)
    status = "requires_clarification" if clarifying else "valid"
    if not is_valid:
        status = "rejected"
    return PreflightResult(is_valid=is_valid, status=status, flags=flags, concerns=concerns, unknowns=unknowns, clarifying_questions=clarifying)


async def run_idea_structuring(raw_idea: str, llm_provider: BaseLLMProvider) -> StructuredIdea:
    prompt = f"Extract the product idea into structured fields. Preserve unknowns and do not invent data. Raw idea: {raw_idea}"
    response = await llm_provider.generate_structured(prompt, StructuredIdea, system_prompt="You are a careful idea structurer. Only include facts explicitly stated or clearly implied. Leave unknowns as values like 'unknown' and list uncertainties.")
    if not isinstance(response, StructuredIdea):
        if isinstance(response, dict):
            try:
                parsed = StructuredIdea.model_validate(response)
                return parsed
            except Exception as exc:  # noqa: BLE001
                raise ValueError(f"Malformed LLM output for idea structuring: {exc}") from exc
        raise TypeError("LLM provider returned unexpected type for idea structuring")
    return response


async def run_classification(raw_idea: str, llm_provider: BaseLLMProvider) -> ClassificationResult:
    prompt = f"Classify the founder idea into extensible labels. Return a list of labels. Raw idea: {raw_idea}"
    response = await llm_provider.generate_structured(prompt, ClassificationResult, system_prompt="Return only multi-label classification labels using the schema.")
    if not isinstance(response, ClassificationResult):
        if isinstance(response, dict):
            try:
                parsed = ClassificationResult.model_validate(response)
                return parsed
            except Exception as exc:  # noqa: BLE001
                raise ValueError(f"Malformed LLM output for classification: {exc}") from exc
        raise TypeError("LLM provider returned unexpected type for classification")
    return response


async def run_analysis_pipeline(raw_idea: str, *, llm_provider: BaseLLMProvider | None = None) -> AnalysisResult:
    """Run the full Phase 1 + Phase 2 pipeline for a raw founder idea.

    BUG FIX: this previously called run_preflight/run_idea_structuring/
    run_classification directly AND THEN called run_graph(raw_idea), which
    internally runs pre_flight_node/idea_structuring_node/classification_node
    again - i.e. Phase 1 (including two LLM calls) ran twice per analysis,
    and the first run's results were passed to Phase 2 while the second run's
    (identical, since the mock provider is deterministic) results were
    silently discarded. It also meant the `llm_provider` argument to this
    function was NOT the provider actually used inside the graph, because
    run_graph() took no provider argument and always built its own
    MockLLMProvider() (see workflow.py fix). This version calls the graph
    exactly once and threads the provider through it.
    """
    from app.graph.workflow import run_graph

    provider = llm_provider or get_llm_provider()

    try:
        graph_state = await run_graph(raw_idea, provider)
    except Exception as exc:  # noqa: BLE001
        logger.exception("analysis pipeline failed")
        return AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            status="rejected",
            current_stage="pre_flight",
            preflight=PreflightResult(is_valid=False, status="rejected", flags=["pipeline_error"], concerns=[str(exc)]),
            errors=[str(exc)],
            warnings=[],
        )

    # Pre-flight rejected/needs-clarification: graph ends immediately after
    # pre_flight, before idea structuring ever runs.
    if graph_state.preflight is not None and not graph_state.preflight.is_valid:
        return AnalysisResult(
            analysis_id=str(uuid.uuid4()),
            status=graph_state.preflight.status,
            current_stage="pre_flight",
            preflight=graph_state.preflight,
            errors=[*graph_state.preflight.concerns],
            warnings=graph_state.preflight.clarifying_questions,
        )

    for result_attr in (
        "research_result",
        "competition_result",
        "customer_result",
        "business_model_result",
        "feasibility_result",
        "financial_result",
        "market_result",
        "risk_result",
        "red_team_result",
    ):
        result = getattr(graph_state, result_attr, None)
        if result is not None and hasattr(result, "claims"):
            result.claims = enforce_quality_gate(result.claims)

    # Defensive normalization of LLM output. Preserved from the old manual
    # path so a provider that returns empty strings/lists degrades gracefully
    # into explicit "unknown" markers rather than empty ones; a no-op against
    # the current MockLLMProvider, which already fills these in.
    structured_idea = graph_state.structured_idea
    if structured_idea is not None:
        structured_idea.geography = _normalize_unknown(structured_idea.geography)
        structured_idea.business_model = _normalize_unknown(structured_idea.business_model)
        if not structured_idea.unknowns:
            structured_idea.unknowns = ["Target customer", "Business model", "Geography"]

    classification = graph_state.classification
    if classification is not None and not classification.labels:
        classification.labels = ["Unspecified"]

    return AnalysisResult(
        analysis_id=str(uuid.uuid4()),
        status=graph_state.status,
        current_stage=graph_state.current_stage,
        structured_idea=structured_idea,
        classification=classification,
        preflight=graph_state.preflight,
        research_status=graph_state.research_status,
        research_result=graph_state.research_result,
        competition_status=graph_state.competition_status,
        competition_result=graph_state.competition_result,
        customer_status=graph_state.customer_status,
        customer_result=graph_state.customer_result,
        synthesis_status=graph_state.synthesis_status,
        synthesis_errors=graph_state.synthesis_errors,
        synthesis_result=graph_state.synthesis_result,
        business_model_status=graph_state.business_model_status,
        business_model_errors=graph_state.business_model_errors,
        business_model_result=graph_state.business_model_result,
        feasibility_status=graph_state.feasibility_status,
        feasibility_errors=graph_state.feasibility_errors,
        feasibility_result=graph_state.feasibility_result,
        risk_status=graph_state.risk_status,
        risk_errors=graph_state.risk_errors,
        risk_result=graph_state.risk_result,
        market_status=graph_state.market_status,
        market_errors=graph_state.market_errors,
        market_result=graph_state.market_result,
        red_team_status=graph_state.red_team_status,
        red_team_errors=graph_state.red_team_errors,
        red_team_result=graph_state.red_team_result,
        decision_result=graph_state.decision_result,
        validation_plan=graph_state.validation_plan,
        errors=graph_state.errors,
        warnings=graph_state.warnings,
    )


async def save_claims_evidence_sources(db: AsyncSession, analysis_id: str, claims: list[Claim]) -> None:
    """Save Claim, Evidence, and Source ORMs to database with many-to-many relationship mapping.

    Root cause of `UNIQUE constraint failed: claims.id` (Wave 5 stabilization):
    this function is called once per agent bucket (research / competition /
    customer - see save_analysis_findings below), and a single Claim can
    legitimately be surfaced by more than one of those buckets. Both
    competition_agent._collect_competition_claims and customer_agent's
    equivalent intentionally pull matching Claim objects out of
    state.research_result.claims (by reference, same `id`) into their own
    result's claims list, so that e.g. a competitor claim discovered by
    Research stays traceable when Competition reports on it too. Claim.id is
    the row's sole primary key - it is not scoped per agent/result-type -
    so the second time such a shared claim reached this function, the old
    code unconditionally built a brand-new ClaimORM and called db.add() on
    it, which is a second INSERT for a primary key that was already
    committed by the first call and fails as soon as it flushes. The same
    unconditional-insert pattern existed for Evidence (the whole reason the
    claim/evidence tables are many-to-many is that one Evidence item can
    support several Claims) and for both association rows, which have their
    own composite primary keys and would fail the same way once a
    claim/evidence pairing recurs across buckets.

    The fix mirrors the dedup-by-identity pattern this function already
    uses for Source (look it up first, reuse the existing row, only create
    when it's genuinely new) for Claim, Evidence, and both association
    tables. No id is ever skipped or reused across two different claims -
    every Claim that doesn't already exist still gets its own row and,
    if unset, a freshly generated uuid4 - this only stops the same claim
    (identified by its own id) from being inserted a second time.
    """
    from app.models.evidence import claim_evidence_association, evidence_source_association

    source_cache: dict[str, SourceORM] = {}

    for c_schema in claims:
        claim_id = c_schema.id or str(uuid.uuid4())

        # Reuse the existing row if this exact claim was already persisted
        # by an earlier call to this function (e.g. research's pass) within
        # this analysis, instead of inserting a duplicate `claims.id` row.
        c_orm = await db.get(ClaimORM, claim_id)
        if c_orm is None:
            c_orm = ClaimORM(
                id=claim_id,
                analysis_id=analysis_id,
                claim_text=c_schema.claim_text,
                claim_type=c_schema.claim_type,
                status=c_schema.status,
                confidence=c_schema.confidence,
                provenance=c_schema.provenance,
                created_at=datetime.now(timezone.utc)
            )
            db.add(c_orm)
            await db.flush()  # Flush to assign IDs before association inserts

        for e_schema in c_schema.evidence_items:
            evidence_id = e_schema.id or str(uuid.uuid4())

            # Same reasoning as Claim above: the same Evidence item can be
            # cited by more than one Claim (that's what the claim_evidence
            # many-to-many table is for), so it must not be re-inserted
            # once it already exists.
            e_orm = await db.get(EvidenceORM, evidence_id)
            if e_orm is None:
                e_orm = EvidenceORM(
                    id=evidence_id,
                    excerpt=e_schema.excerpt,
                    evidence_type=e_schema.evidence_type,
                    confidence=e_schema.confidence,
                    relevance_notes=e_schema.relevance_notes,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(e_orm)
                await db.flush()

            # Insert claim-evidence association directly (avoid lazy-load
            # .append()), but only if this exact pairing isn't already
            # linked - claim_id+evidence_id is itself a composite primary
            # key, so re-linking a claim/evidence pair that recurred across
            # agent buckets would fail the same way the bare claim insert
            # used to.
            existing_claim_evidence_link = (await db.execute(
                select(claim_evidence_association).where(
                    claim_evidence_association.c.claim_id == c_orm.id,
                    claim_evidence_association.c.evidence_id == e_orm.id,
                )
            )).first()
            if existing_claim_evidence_link is None:
                await db.execute(
                    claim_evidence_association.insert().values(
                        claim_id=c_orm.id,
                        evidence_id=e_orm.id,
                    )
                )

            for s_schema in e_schema.sources:
                if not s_schema.url:
                    continue

                if s_schema.url in source_cache:
                    s_orm = source_cache[s_schema.url]
                else:
                    stmt = select(SourceORM).where(SourceORM.url == s_schema.url)
                    existing = (await db.execute(stmt)).scalar_one_or_none()
                    if existing:
                        s_orm = existing
                        source_cache[s_schema.url] = s_orm
                    else:
                        s_orm = SourceORM(
                            id=s_schema.id or str(uuid.uuid4()),
                            url=s_schema.url,
                            title=s_schema.title,
                            publisher_domain=s_schema.publisher_domain,
                            publication_date=s_schema.publication_date,
                            retrieval_date=s_schema.retrieval_date,
                            source_type=s_schema.source_type,
                            credibility_notes=s_schema.credibility_notes,
                            credibility_score=s_schema.credibility_score,
                            retrieval_status=s_schema.retrieval_status,
                            additional_metadata=s_schema.additional_metadata,
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(s_orm)
                        await db.flush()
                        source_cache[s_schema.url] = s_orm

                # Insert evidence-source association directly, skipping it
                # if this evidence/source pairing is already linked (same
                # composite-primary-key reasoning as claim_evidence above).
                existing_evidence_source_link = (await db.execute(
                    select(evidence_source_association).where(
                        evidence_source_association.c.evidence_id == e_orm.id,
                        evidence_source_association.c.source_id == s_orm.id,
                    )
                )).first()
                if existing_evidence_source_link is None:
                    await db.execute(
                        evidence_source_association.insert().values(
                            evidence_id=e_orm.id,
                            source_id=s_orm.id,
                        )
                    )



async def save_analysis_findings(db: AsyncSession, analysis_id: str, result: AnalysisResult) -> None:
    """Persist structured agents results and all claim-evidence-source hierarchies."""
    if result.research_result:
        result.research_result.claims = enforce_quality_gate(result.research_result.claims)
        res_orm = ResearchResultORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            status=result.research_result.status,
            findings=result.research_result.findings,
            errors=result.research_result.errors,
            created_at=datetime.now(timezone.utc)
        )
        db.add(res_orm)
        await save_claims_evidence_sources(db, analysis_id, result.research_result.claims)
        
    if result.competition_result:
        result.competition_result.claims = enforce_quality_gate(result.competition_result.claims)
        comp_orm = CompetitionResultORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            status=result.competition_result.status,
            findings={"competitors": result.competition_result.competitors},
            errors=result.competition_result.errors,
            created_at=datetime.now(timezone.utc)
        )
        db.add(comp_orm)
        await save_claims_evidence_sources(db, analysis_id, result.competition_result.claims)
        
    if result.customer_result:
        result.customer_result.claims = enforce_quality_gate(result.customer_result.claims)
        cust_orm = CustomerResultORM(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            status=result.customer_result.status,
            findings=result.customer_result.customer_analysis,
            errors=result.customer_result.errors,
            created_at=datetime.now(timezone.utc)
        )
        db.add(cust_orm)
        await save_claims_evidence_sources(db, analysis_id, result.customer_result.claims)

    # Phase 3 persistence must run AFTER the claim/evidence saves above, since
    # risk.evidence_ids reference the same Evidence ids just persisted (see
    # save_phase3_results for the lookup).
    await save_phase3_results(db, analysis_id, result)


async def save_phase3_results(db: AsyncSession, analysis_id: str, result: AnalysisResult) -> None:
    """Persist Phase 3 results: Synthesis/BusinessModel/Feasibility/Market/
    Decision/ValidationPlan as a single aggregate row, and Risks + Red Team
    findings as individual rows linked (many-to-many) to the already-
    persisted Evidence items they cite, preserving Conclusion -> Claim ->
    Evidence -> Source traceability.
    """
    has_any_phase3 = any([
        result.synthesis_result,
        result.business_model_result,
        result.feasibility_result,
        result.market_result,
        result.risk_result,
        result.red_team_result,
        result.decision_result,
        result.validation_plan,
    ])
    if not has_any_phase3:
        return

    phase3_orm = Phase3ResultORM(
        id=str(uuid.uuid4()),
        analysis_id=analysis_id,
        synthesis_status=result.synthesis_status,
        synthesis=result.synthesis_result.model_dump(mode="json") if result.synthesis_result else None,
        business_model_status=result.business_model_status,
        business_model=result.business_model_result.model_dump(mode="json") if result.business_model_result else None,
        feasibility_status=result.feasibility_status,
        feasibility=result.feasibility_result.model_dump(mode="json") if result.feasibility_result else None,
        market_status=result.market_status,
        market=result.market_result.model_dump(mode="json") if result.market_result else None,
        risk_status=result.risk_status,
        red_team_status=result.red_team_status,
        decision=result.decision_result.model_dump(mode="json") if result.decision_result else None,
        validation_plan=result.validation_plan.model_dump(mode="json") if result.validation_plan else None,
        errors=[
            *result.synthesis_errors,
            *result.business_model_errors,
            *result.feasibility_errors,
            *result.market_errors,
            *result.risk_errors,
            *result.red_team_errors,
        ],
        created_at=datetime.now(timezone.utc),
    )
    db.add(phase3_orm)

    if result.risk_result:
        for risk in result.risk_result.risks:
            risk_orm = RiskORM(
                id=risk.id or str(uuid.uuid4()),
                analysis_id=analysis_id,
                risk_statement=risk.risk_statement,
                category=risk.category,
                severity=risk.severity,
                likelihood=risk.likelihood,
                impact=risk.impact,
                classification=risk.classification,
                claim_ids=risk.claim_ids,
                mitigation=risk.mitigation,
                falsification_criteria=risk.falsification_criteria,
                created_at=datetime.now(timezone.utc),
            )
            db.add(risk_orm)
            await db.flush()

            for evidence_id in risk.evidence_ids:
                existing_evidence = await db.get(EvidenceORM, evidence_id)
                if existing_evidence is None:
                    # Evidence id referenced by the risk wasn't persisted
                    # (e.g. came from a claim whose evidence had no id) -
                    # skip the link rather than inventing a row, preserving
                    # "do not fabricate provenance".
                    continue
                await db.execute(
                    risk_evidence_association.insert().values(
                        risk_id=risk_orm.id,
                        evidence_id=evidence_id,
                    )
                )

    if result.red_team_result:
        for finding in result.red_team_result.findings:
            finding_orm = RedTeamFindingORM(
                id=finding.id or str(uuid.uuid4()),
                analysis_id=analysis_id,
                assumption_challenged=finding.assumption_challenged,
                objection=finding.objection,
                category=finding.category,
                severity=finding.severity,
                classification=finding.classification,
                claim_ids=finding.claim_ids,
                falsification_criteria=finding.falsification_criteria,
                is_potentially_fatal=finding.is_potentially_fatal,
                created_at=datetime.now(timezone.utc),
            )
            db.add(finding_orm)
            await db.flush()

            for evidence_id in finding.evidence_ids:
                existing_evidence = await db.get(EvidenceORM, evidence_id)
                if existing_evidence is None:
                    continue
                await db.execute(
                    red_team_finding_evidence_association.insert().values(
                        finding_id=finding_orm.id,
                        evidence_id=evidence_id,
                    )
                )


# ---------------------------------------------------------------------------
# Reconstruction: persisted ORM -> AnalysisResult
#
# Moved here (Phase 6) from app/api/routes.py::get_analysis, which contained
# this logic inline. Phase 6's report generation service needs the exact
# same fully-reconstructed AnalysisResult that GET /analysis/{id} returns -
# duplicating ~150 lines of ORM->Pydantic mapping in a second place would be
# the "obvious duplication" this codebase's conventions explicitly avoid.
# Both routes.get_analysis and report_service.generate_founder_report now
# call this single function; behavior is unchanged from before the move.
# ---------------------------------------------------------------------------


def map_source_orm_to_pydantic(s_orm) -> Source:
    return Source(
        id=s_orm.id,
        url=s_orm.url,
        title=s_orm.title,
        publisher_domain=s_orm.publisher_domain,
        publication_date=s_orm.publication_date,
        retrieval_date=s_orm.retrieval_date,
        source_type=s_orm.source_type,
        credibility_notes=s_orm.credibility_notes,
        credibility_score=s_orm.credibility_score,
        retrieval_status=s_orm.retrieval_status,
        additional_metadata=s_orm.additional_metadata or {},
        created_at=s_orm.created_at
    )


def map_evidence_orm_to_pydantic(e_orm) -> Evidence:
    return Evidence(
        id=e_orm.id,
        excerpt=e_orm.excerpt,
        evidence_type=e_orm.evidence_type,
        confidence=e_orm.confidence,
        relevance_notes=e_orm.relevance_notes,
        created_at=e_orm.created_at,
        sources=[map_source_orm_to_pydantic(s) for s in e_orm.sources]
    )


def map_claim_orm_to_pydantic(c_orm) -> Claim:
    return Claim(
        id=c_orm.id,
        analysis_id=c_orm.analysis_id,
        claim_text=c_orm.claim_text,
        claim_type=c_orm.claim_type,
        status=c_orm.status,
        confidence=c_orm.confidence,
        provenance=c_orm.provenance or {},
        evidence_items=[map_evidence_orm_to_pydantic(e) for e in c_orm.evidence_items],
        created_at=c_orm.created_at
    )


def map_risk_orm_to_pydantic(r_orm) -> RiskItem:
    return RiskItem(
        id=r_orm.id,
        risk_statement=r_orm.risk_statement,
        category=r_orm.category,
        severity=r_orm.severity,
        likelihood=r_orm.likelihood,
        impact=r_orm.impact,
        classification=r_orm.classification,
        evidence_ids=[e.id for e in r_orm.evidence_items],
        claim_ids=r_orm.claim_ids or [],
        mitigation=r_orm.mitigation,
        falsification_criteria=r_orm.falsification_criteria,
    )


def map_red_team_finding_orm_to_pydantic(f_orm) -> RedTeamFinding:
    return RedTeamFinding(
        id=f_orm.id,
        assumption_challenged=f_orm.assumption_challenged,
        objection=f_orm.objection,
        category=f_orm.category,
        severity=f_orm.severity,
        classification=f_orm.classification,
        evidence_ids=[e.id for e in f_orm.evidence_items],
        claim_ids=f_orm.claim_ids or [],
        falsification_criteria=f_orm.falsification_criteria,
        is_potentially_fatal=f_orm.is_potentially_fatal,
    )


async def reconstruct_analysis_result(analysis_id: str, db: AsyncSession) -> AnalysisResult | None:
    """Load a persisted AnalysisJobORM and reconstruct the full AnalysisResult
    (Phase 1 + 2 + 3), including claim/evidence/source many-to-many
    relationships. Returns None if the analysis_id doesn't exist - callers
    decide how to handle that (404 for the API, None-propagation for report
    generation).

    IMPORTANT: we eager-load every relationship used by the reconstruction
    step to avoid lazy-load failures across async boundaries and to keep the
    report-generation path deterministic and safe in production.
    """
    stmt = (
        select(AnalysisJobORM)
        .where(AnalysisJobORM.id == analysis_id)
        .options(
            selectinload(AnalysisJobORM.claims)
            .selectinload(ClaimORM.evidence_items)
            .selectinload(EvidenceORM.sources),
            selectinload(AnalysisJobORM.research_result),
            selectinload(AnalysisJobORM.competition_result),
            selectinload(AnalysisJobORM.customer_result),
            selectinload(AnalysisJobORM.phase3_result),
            selectinload(AnalysisJobORM.risks)
            .selectinload(RiskORM.evidence_items),
            selectinload(AnalysisJobORM.red_team_findings)
            .selectinload(RedTeamFindingORM.evidence_items),
        )
    )
    result = (await db.execute(stmt)).scalar_one_or_none()
    if result is None:
        return None

    # Map claims bucketed by agent
    research_claims = []
    competition_claims = []
    customer_claims = []

    for c_orm in (result.claims or []):
        p_claim = map_claim_orm_to_pydantic(c_orm)
        agent = (c_orm.provenance or {}).get("agent")
        if agent == "research":
            research_claims.append(p_claim)
        elif agent == "competition":
            competition_claims.append(p_claim)
        elif agent == "customer":
            customer_claims.append(p_claim)

    # Extract unique sources for each agent
    def extract_sources(claims_list):
        sources_list = []
        seen_ids = set()
        for c in claims_list:
            for e in c.evidence_items:
                for s in e.sources:
                    if s.id not in seen_ids:
                        seen_ids.add(s.id)
                        sources_list.append(s)
        return sources_list

    research_sources = extract_sources(research_claims)
    competition_sources = extract_sources(competition_claims)
    customer_sources = extract_sources(customer_claims)

    # Reconstruct agent results
    research_result = None
    if result.research_result:
        research_result = ResearchResult(
            status=result.research_result.status,
            claims=research_claims,
            sources=research_sources,
            search_queries=[],  # Not stored on ORM
            findings=result.research_result.findings or {},
            errors=result.research_result.errors or []
        )

    competition_result = None
    if result.competition_result:
        competition_result = CompetitionResult(
            status=result.competition_result.status,
            claims=competition_claims,
            sources=competition_sources,
            competitors=(result.competition_result.findings or {}).get("competitors", []),
            findings=result.competition_result.findings or {},
            errors=result.competition_result.errors or []
        )

    customer_result = None
    if result.customer_result:
        customer_result = CustomerResult(
            status=result.customer_result.status,
            claims=customer_claims,
            sources=customer_sources,
            customer_analysis=result.customer_result.findings or {},
            findings=result.customer_result.findings or {},
            errors=result.customer_result.errors or []
        )

    # Reconstruct Phase 3 results
    synthesis_result = None
    business_model_result = None
    feasibility_result = None
    market_result_obj = None
    decision_result = None
    validation_plan = None
    synthesis_status = "pending"
    business_model_status = "pending"
    feasibility_status = "pending"
    market_status = "pending"
    risk_status = "pending"
    red_team_status = "pending"
    phase3_errors: list[str] = []

    p3 = result.phase3_result
    if p3 is not None:
        synthesis_status = p3.synthesis_status
        business_model_status = p3.business_model_status
        feasibility_status = p3.feasibility_status
        market_status = p3.market_status
        risk_status = p3.risk_status
        red_team_status = p3.red_team_status
        phase3_errors = p3.errors or []
        if p3.synthesis:
            synthesis_result = SynthesisResult.model_validate(p3.synthesis)
        if p3.business_model:
            business_model_result = BusinessModelResult.model_validate(p3.business_model)
        if p3.feasibility:
            feasibility_result = FeasibilityResult.model_validate(p3.feasibility)
        if p3.market:
            market_result_obj = MarketResult.model_validate(p3.market)
        if p3.decision:
            decision_result = DecisionResult.model_validate(p3.decision)
        if p3.validation_plan:
            validation_plan = ValidationPlan.model_validate(p3.validation_plan)

    risk_result = None
    if result.risks:
        risk_items = [map_risk_orm_to_pydantic(r) for r in result.risks]
        risk_result = RiskResult(
            status=risk_status if risk_status != "pending" else "success",
            risks=risk_items,
            critical_unresolved_risk_ids=[r.id for r in risk_items if r.severity == "CRITICAL" and r.id],
        )

    red_team_result = None
    if result.red_team_findings:
        finding_items = [map_red_team_finding_orm_to_pydantic(f) for f in result.red_team_findings]
        severity_rank = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
        red_team_result = RedTeamResult(
            status=red_team_status if red_team_status != "pending" else "success",
            findings=finding_items,
            strongest_objection_id=(
                max(finding_items, key=lambda f: (severity_rank[f.severity], len(f.evidence_ids))).id
                if finding_items else None
            ),
            weakest_assumption_id=(
                min(finding_items, key=lambda f: (len(f.evidence_ids), -severity_rank[f.severity])).id
                if finding_items else None
            ),
            potentially_fatal_finding_ids=[f.id for f in finding_items if f.is_potentially_fatal and f.id],
            critical_finding_ids=[f.id for f in finding_items if f.severity == "CRITICAL" and f.id],
        )

    return AnalysisResult(
        analysis_id=result.id,
        status=result.status,
        current_stage=result.current_stage,
        structured_idea=result.structured_result and StructuredIdea.model_validate(result.structured_result),
        classification=result.classification and ClassificationResult.model_validate(result.classification),
        preflight=result.preflight and PreflightResult.model_validate(result.preflight),

        research_status=result.research_status,
        research_errors=research_result.errors if research_result else [],
        research_result=research_result,

        competition_status=result.competition_status,
        competition_errors=competition_result.errors if competition_result else [],
        competition_result=competition_result,

        customer_status=result.customer_status,
        customer_errors=customer_result.errors if customer_result else [],
        customer_result=customer_result,

        synthesis_status=synthesis_status,
        synthesis_result=synthesis_result,
        business_model_status=business_model_status,
        business_model_result=business_model_result,
        feasibility_status=feasibility_status,
        feasibility_result=feasibility_result,
        market_status=market_status,
        market_result=market_result_obj,
        risk_status=risk_status,
        risk_result=risk_result,
        red_team_status=red_team_status,
        red_team_result=red_team_result,
        decision_result=decision_result,
        validation_plan=validation_plan,

        errors=result.errors or [],
        warnings=result.warnings or [],
    )