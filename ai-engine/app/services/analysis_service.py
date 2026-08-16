from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.evidence import ClaimORM, EvidenceORM, SourceORM, ResearchResultORM, CompetitionResultORM, CustomerResultORM
from app.schemas.analysis import (
    AnalysisResult,
    ClassificationResult,
    PreflightResult,
    StructuredIdea,
)
from app.schemas.evidence import Claim
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
        errors=graph_state.errors,
        warnings=graph_state.warnings,
    )


async def save_claims_evidence_sources(db: AsyncSession, analysis_id: str, claims: list[Claim]) -> None:
    """Save Claim, Evidence, and Source ORMs to database with many-to-many relationship mapping."""
    from app.models.evidence import claim_evidence_association, evidence_source_association

    source_cache: dict[str, SourceORM] = {}

    for c_schema in claims:
        c_orm = ClaimORM(
            id=c_schema.id or str(uuid.uuid4()),
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
            e_orm = EvidenceORM(
                id=e_schema.id or str(uuid.uuid4()),
                excerpt=e_schema.excerpt,
                evidence_type=e_schema.evidence_type,
                confidence=e_schema.confidence,
                relevance_notes=e_schema.relevance_notes,
                created_at=datetime.now(timezone.utc)
            )
            db.add(e_orm)
            await db.flush()

            # Insert claim-evidence association directly (avoid lazy-load .append())
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

                # Insert evidence-source association directly
                await db.execute(
                    evidence_source_association.insert().values(
                        evidence_id=e_orm.id,
                        source_id=s_orm.id,
                    )
                )



async def save_analysis_findings(db: AsyncSession, analysis_id: str, result: AnalysisResult) -> None:
    """Persist structured agents results and all claim-evidence-source hierarchies."""
    if result.research_result:
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
