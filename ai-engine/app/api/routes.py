from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.analysis import AnalysisJobORM
from app.schemas.analysis import AnalysisRequest, AnalysisResult, AnalysisStatus
from app.schemas.report import FounderReport
from app.services.analysis_service import run_analysis_pipeline, save_analysis_findings, reconstruct_analysis_result
from app.services.llm_provider import get_llm_provider
from app.services.report_service import generate_founder_report

from app.api.auth_routes import router as auth_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.ideas_routes import router as ideas_router
from app.api.validation_routes import router as validation_router
from app.api.reality_sprint_routes import router as reality_sprint_router
from app.api.build_request_routes import router as build_request_router
from app.api.notification_routes import router as notification_router
from app.api.settings_routes import router as settings_router
from app.api.v1.admin import admin_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(dashboard_router)
router.include_router(ideas_router)
router.include_router(validation_router)
router.include_router(reality_sprint_router)
router.include_router(build_request_router)
router.include_router(notification_router)
router.include_router(settings_router)
router.include_router(admin_router)



@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.get("/analysis/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)):
    result = await reconstruct_analysis_result(analysis_id, db)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="analysis not found")
    return result


@router.get("/analysis/{analysis_id}/report", response_model=FounderReport)
async def get_analysis_report(analysis_id: str, db: AsyncSession = Depends(get_db)):
    """Phase 6: founder-facing report, deterministically transformed from the
    already-persisted analysis. Does not run any agent, LLM, or search call -
    see report_service.generate_founder_report for the isolation guarantee.
    """
    report = await generate_founder_report(analysis_id, db)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="analysis not found")
    return report


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
            "synthesis_status": pipeline_result.synthesis_status,
            "business_model_status": pipeline_result.business_model_status,
            "feasibility_status": pipeline_result.feasibility_status,
            "market_status": pipeline_result.market_status,
            "risk_status": pipeline_result.risk_status,
            "red_team_status": pipeline_result.red_team_status,
            "decision": pipeline_result.decision_result.decision if pipeline_result.decision_result else None,
        },
    )

