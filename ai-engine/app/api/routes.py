from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.analysis import AnalysisJobORM
from app.schemas.analysis import AnalysisRequest, AnalysisResult, AnalysisStatus, StructuredIdea, ClassificationResult, PreflightResult
from app.schemas.evidence import ResearchResult, CompetitionResult, CustomerResult, Claim, Evidence, Source
from app.services.analysis_service import run_analysis_pipeline, save_analysis_findings
from app.services.llm_provider import get_llm_provider

router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health_check():
    return {"status": "ok"}


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


@router.post("/analysis", response_model=AnalysisStatus, status_code=status.HTTP_201_CREATED)
async def create_analysis(payload: AnalysisRequest, db: AsyncSession = Depends(get_db)):
    analysis_id = str(uuid.uuid4())
    job = AnalysisJobORM(
        id=analysis_id,
        raw_idea=payload.idea,
        status="pending",
        current_stage="pre_flight",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    pipeline_result = await run_analysis_pipeline(payload.idea, llm_provider=get_llm_provider())

    job.status = pipeline_result.status
    job.current_stage = pipeline_result.current_stage
    job.structured_result = pipeline_result.structured_idea.model_dump() if pipeline_result.structured_idea else None
    job.classification = pipeline_result.classification.model_dump() if pipeline_result.classification else None
    job.preflight = pipeline_result.preflight.model_dump() if pipeline_result.preflight else None
    job.research_status = pipeline_result.research_status
    job.competition_status = pipeline_result.competition_status
    job.customer_status = pipeline_result.customer_status
    job.errors = pipeline_result.errors
    job.warnings = pipeline_result.warnings
    job.updated_at = datetime.now(timezone.utc)
    
    # Save claims, evidence, sources, and agent results
    await save_analysis_findings(db, analysis_id, pipeline_result)
    await db.commit()

    return AnalysisStatus(
        analysis_id=analysis_id,
        status=job.status,
        current_stage=job.current_stage,
        details={
            "raw_idea": payload.idea,
            "structured_idea": pipeline_result.structured_idea.model_dump() if pipeline_result.structured_idea else None,
            "classification": pipeline_result.classification.model_dump() if pipeline_result.classification else None,
            "preflight": pipeline_result.preflight.model_dump() if pipeline_result.preflight else None,
            "research_status": pipeline_result.research_status,
            "competition_status": pipeline_result.competition_status,
            "customer_status": pipeline_result.customer_status,
            "errors": pipeline_result.errors,
            "warnings": pipeline_result.warnings,
        },
    )


@router.get("/analysis/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.get(AnalysisJobORM, analysis_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="analysis not found")

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
            search_queries=[], # Not stored on ORM
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
        
        errors=result.errors or [],
        warnings=result.warnings or [],
    )
