from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.analysis import AnalysisJobORM  # noqa: E402,F401
from app.models.evidence import ClaimORM, EvidenceORM, SourceORM, ResearchResultORM, CompetitionResultORM, CustomerResultORM  # noqa: E402,F401
from app.models.phase3 import Phase3ResultORM, RiskORM, RedTeamFindingORM  # noqa: E402,F401
from app.models.auth import UserORM, RefreshTokenORM  # noqa: E402,F401
from app.models.idea import Idea, IdeaActivity  # noqa: E402,F401
from app.models.validation import Validation, ValidationInput, ValidationAttachment, ValidationEvent, ValidationReport  # noqa: E402,F401
from app.models.reality_sprint import RealitySprint, RealitySprintAttachment, RealitySprintActivity  # noqa: E402,F401
from app.models.build_request import (  # noqa: E402,F401
    BuildRequest,
    BuildRequestAttachment,
    BuildRequestTimelineEvent,
    BuildRequestMessage,
)
from app.models.notification import (  # noqa: E402,F401
    Notification,
    NotificationPreference,
    PushSubscription,
    MarketingCampaign,
    CampaignDeliveryLog,
    NotificationTemplate,
)
from app.models.user_settings import UserSettings  # noqa: E402,F401
from app.models.admin_settings import PlatformSettings, AdminAuditLog  # noqa: E402,F401

