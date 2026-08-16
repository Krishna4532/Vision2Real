from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.analysis import AnalysisJobORM  # noqa: E402,F401
from app.models.evidence import ClaimORM, EvidenceORM, SourceORM, ResearchResultORM, CompetitionResultORM, CustomerResultORM  # noqa: E402,F401
