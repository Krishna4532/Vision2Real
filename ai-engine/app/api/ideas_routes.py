from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.schemas.idea import (
    IdeaCreate,
    IdeaPaginationResponse,
    IdeaResponse,
    IdeaStatsResponse,
    IdeaUpdate,
)
from app.services.idea_service import IdeaService

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.get("", response_model=IdeaPaginationResponse)
async def list_ideas(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    industry: str | None = Query(None),
    stage: str | None = Query(None),
    sort_by: str = Query("newest"),
    include_archived: bool = Query(False),
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaPaginationResponse:
    """List authenticated founder ideas with filtering, search, sorting, and offset pagination."""
    service = IdeaService(db)
    return await service.list_ideas(
        founder=user,
        page=page,
        limit=limit,
        search=search,
        industry=industry,
        stage=stage,
        sort_by=sort_by,
        include_archived=include_archived,
    )


@router.get("/stats", response_model=IdeaStatsResponse)
async def get_idea_stats(
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaStatsResponse:
    """Fetch aggregated portfolio statistics for authenticated founder."""
    service = IdeaService(db)
    return await service.get_idea_stats(user)


@router.get("/{identifier}", response_model=IdeaResponse)
async def get_idea(
    identifier: str,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Get single startup idea details by ID or Slug."""
    service = IdeaService(db)
    return await service.get_idea(user, identifier)


@router.post("", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    data: IdeaCreate,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Create a new startup idea for authenticated founder."""
    service = IdeaService(db)
    return await service.create_idea(user, data)


@router.patch("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: str,
    data: IdeaUpdate,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Update startup idea details."""
    service = IdeaService(db)
    return await service.update_idea(user, idea_id, data)


@router.post("/{idea_id}/archive", response_model=IdeaResponse)
async def archive_idea(
    idea_id: str,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Archive a startup idea."""
    service = IdeaService(db)
    return await service.archive_idea(user, idea_id)


@router.post("/{idea_id}/restore", response_model=IdeaResponse)
async def restore_idea(
    idea_id: str,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Restore an archived startup idea."""
    service = IdeaService(db)
    return await service.restore_idea(user, idea_id)


@router.delete("/{idea_id}", response_model=IdeaResponse)
async def delete_idea(
    idea_id: str,
    user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaResponse:
    """Soft-delete / archive startup idea."""
    service = IdeaService(db)
    return await service.archive_idea(user, idea_id)
