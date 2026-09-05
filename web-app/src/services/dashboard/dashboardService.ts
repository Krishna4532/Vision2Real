/**
 * Vision2Real – Dashboard Aggregation Service (Stage 6.3)
 *
 * Aggregates data from Validation, Reality Sprint, and Build Request APIs.
 * NO new backend endpoints are created. All data comes from existing APIs.
 *
 * Exported methods:
 *   getDashboardOverview(signal?)  — parallel list calls, top items, merged activity
 *   getDashboardStats(signal?)     — parallel analytics calls, KPI derivation
 *   deriveJourneySteps(stats)      — pure function, derives 3-step journey from counts
 */

import { validationService } from '@/services/validation/validationService';
import { realitySprintApi } from '@/services/api/realitySprint';
import { buildRequestApi } from '@/services/api/buildRequest';
import type {
  DashboardOverview,
  DashboardQuickStats,
  DashboardActivityItem,
  DerivedJourneyStep,
  ActivitySourceType,
} from './types';
import type { ValidationListItem } from '@/services/validation/types';
import type { RealitySprintRequest } from '@/services/api/realitySprint';
import type { BuildRequestListItem } from '@/services/api/buildRequest';

// ── Activity derivation helpers ──────────────────────────────────────────────

function validationToActivity(v: ValidationListItem): DashboardActivityItem {
  const isComplete = v.status === 'COMPLETED';
  const score = v.overall_score != null ? ` · Score ${v.overall_score}/100` : '';
  return {
    id: `val-${v.id}`,
    type: 'validation' as ActivitySourceType,
    title: isComplete ? `Validation Completed${score}` : 'Validation In Progress',
    description: v.idea_description
      ? v.idea_description.length > 80
        ? `${v.idea_description.substring(0, 77)}…`
        : v.idea_description
      : 'Idea validation submitted',
    timestamp: v.updated_at || v.created_at,
    link: `/founder/validations/${v.id}`,
  };
}

function sprintToActivity(s: RealitySprintRequest): DashboardActivityItem {
  const statusLabel: Record<string, string> = {
    SUBMITTED: 'Reality Sprint Submitted',
    UNDER_REVIEW: 'Reality Sprint Under Review',
    ACCEPTED: 'Reality Sprint Accepted',
    SCHEDULED: 'Reality Sprint Scheduled',
    IN_PROGRESS: 'Reality Sprint In Progress',
    COMPLETED: 'Reality Sprint Delivered',
    CANCELLED: 'Reality Sprint Cancelled',
    DRAFT: 'Reality Sprint Draft Created',
  };
  return {
    id: `sprint-${s.id}`,
    type: 'sprint' as ActivitySourceType,
    title: statusLabel[s.status] ?? `Reality Sprint — ${s.status}`,
    description: s.title || s.description?.substring(0, 80) || 'Reality Sprint request',
    timestamp: s.updated_at || s.created_at,
    link: `/founder/sprint/${s.id}`,
  };
}

function buildToActivity(b: BuildRequestListItem): DashboardActivityItem {
  const phaseLabel: Record<string, string> = {
    SUBMITTED: 'Build Request Submitted',
    ACCEPTED: 'Build Request Accepted',
    PLANNING: 'Project Entered Planning Phase',
    UI_DESIGN: 'Project Entered UI Design Phase',
    BACKEND: 'Project Entered Backend Development',
    FRONTEND: 'Project Entered Frontend Development',
    TESTING: 'Project Entered Testing & QA',
    DEPLOYMENT: 'Project Entered Deployment',
    COMPLETED: 'Build Project Delivered',
    CANCELLED: 'Build Request Cancelled',
  };
  const hasUnread = (b.founder_unread_count ?? 0) > 0;
  return {
    id: hasUnread ? `build-msg-${b.id}` : `build-${b.id}`,
    type: hasUnread ? ('message' as ActivitySourceType) : ('build' as ActivitySourceType),
    title: hasUnread
      ? `New Message from Vision2Real Team`
      : (phaseLabel[b.status] ?? `Build Request — ${b.status}`),
    description: b.title || 'Build request',
    timestamp: b.updated_at || b.created_at,
    link: `/founder/build-requests/${b.id}`,
  };
}

function mergeAndSortActivity(
  validations: ValidationListItem[],
  sprints: RealitySprintRequest[],
  builds: BuildRequestListItem[],
  limit = 15
): DashboardActivityItem[] {
  const items: DashboardActivityItem[] = [
    ...validations.slice(0, 5).map(validationToActivity),
    ...sprints.slice(0, 5).map(sprintToActivity),
    ...builds.slice(0, 5).map(buildToActivity),
  ];
  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ── Journey derivation ────────────────────────────────────────────────────────

export function deriveJourneySteps(stats: {
  validationsTotal: number;
  sprintsTotal: number;
  buildsTotal: number;
}): DerivedJourneyStep[] {
  const { validationsTotal, sprintsTotal, buildsTotal } = stats;

  const step1Done = validationsTotal > 0;
  const step2Done = sprintsTotal > 0;
  const step3Done = buildsTotal > 0;

  const getStatus = (done: boolean, prevDone: boolean): 'completed' | 'current' | 'upcoming' => {
    if (done) return 'completed';
    if (prevDone) return 'current';
    return 'upcoming';
  };

  return [
    {
      id: 'validate',
      name: 'Run Validation',
      description: 'Validate your product idea with AI-powered market research and evidence.',
      status: step1Done ? 'completed' : 'current',
      href: '/validate-idea',
      cta: 'Run Validation',
    },
    {
      id: 'sprint',
      name: 'Start Reality Sprint',
      description: 'Get a detailed product specification, architecture, and roadmap.',
      status: getStatus(step2Done, step1Done),
      href: '/build-product',
      cta: 'Start Reality Sprint',
    },
    {
      id: 'build',
      name: 'Build My Product',
      description: 'Submit your product for full-stack development and delivery.',
      status: getStatus(step3Done, step2Done),
      href: '/build-product',
      cta: 'Build My Product',
    },
  ];
}

// ── Main service ──────────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * Fetch all list data in parallel and derive the merged dashboard overview.
   * Uses Promise.allSettled so one failure does not block the rest.
   */
  async getDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
    const [validationsResult, sprintsResult, buildsResult] = await Promise.allSettled([
      validationService.listValidations({ page: 1, page_size: 10, sort_by: 'created_at', sort_order: 'desc' }, { signal }),
      realitySprintApi.listRealitySprints({ page: 1, page_size: 10, sort_by: 'created_at', sort_order: 'desc' }, { signal }),
      buildRequestApi.listBuildRequests({ page: 1, page_size: 10, sort_by: 'created_at', sort_order: 'desc', include_archived: false }, { signal }),
    ]);

    const validations: ValidationListItem[] =
      validationsResult.status === 'fulfilled' ? validationsResult.value.items : [];
    const sprints: RealitySprintRequest[] =
      sprintsResult.status === 'fulfilled' ? sprintsResult.value.data : [];
    const builds: BuildRequestListItem[] =
      buildsResult.status === 'fulfilled' ? buildsResult.value.data : [];

    // Latest validation: most recent by created_at
    const latestValidation = validations.length > 0 ? validations[0] : null;

    // Latest sprint: most recent
    const latestSprint = sprints.length > 0 ? sprints[0] : null;

    // Active build request: highest priority active status, fallback to most recent
    const activeBuildStatuses = new Set(['ACCEPTED', 'PLANNING', 'UI_DESIGN', 'BACKEND', 'FRONTEND', 'TESTING', 'DEPLOYMENT']);
    const activeBuild = builds.find((b) => activeBuildStatuses.has(b.status)) ?? null;

    const recentActivity = mergeAndSortActivity(validations, sprints, builds);

    return {
      latestValidation,
      latestSprint,
      activeBuildRequest: activeBuild,
      allSprints: sprints,
      allBuildRequests: builds,
      allValidations: validations,
      recentActivity,
    };
  },

  /**
   * Fetch analytics from all 3 APIs in parallel and derive KPI stats.
   * Uses Promise.allSettled so one failure produces null/zero values, not an error.
   */
  async getDashboardStats(signal?: AbortSignal): Promise<DashboardQuickStats> {
    const [valListResult, sprintAnalyticsResult, buildAnalyticsResult, buildListResult] = await Promise.allSettled([
      validationService.listValidations({ page: 1, page_size: 1 }, { signal }),
      realitySprintApi.getAnalytics({ signal }),
      buildRequestApi.getAnalytics({ signal }),
      buildRequestApi.listBuildRequests({ page: 1, page_size: 20, include_archived: false }, { signal }),
    ]);

    // Validation stats (from list — no dedicated analytics endpoint)
    const valTotal = valListResult.status === 'fulfilled' ? valListResult.value.total : 0;
    // We need completed/processing counts — fetch with status filters would be too expensive
    // Instead: derive from the overview items (best effort from page 1)
    // This is intentionally approximate — for exact counts we rely on overview data
    const validationStats = {
      total: valTotal,
      completed: 0, // will be enriched in DashboardPage from overview data
      processing: 0,
    };

    // Sprint stats
    const sprintAnalytics = sprintAnalyticsResult.status === 'fulfilled' ? sprintAnalyticsResult.value : null;
    const sprintStats = {
      total: sprintAnalytics?.total_requests ?? 0,
      active: sprintAnalytics
        ? (sprintAnalytics.submitted ?? 0) +
          (sprintAnalytics.under_review ?? 0) +
          (sprintAnalytics.accepted ?? 0) +
          (sprintAnalytics.scheduled ?? 0) +
          (sprintAnalytics.in_progress ?? 0)
        : 0,
      latestStatus: null as string | null,
    };

    // Build stats
    const buildAnalytics = buildAnalyticsResult.status === 'fulfilled' ? buildAnalyticsResult.value : null;
    const builds = buildListResult.status === 'fulfilled' ? buildListResult.value.data : [];
    const activeBuildStatuses = new Set(['ACCEPTED', 'PLANNING', 'UI_DESIGN', 'BACKEND', 'FRONTEND', 'TESTING', 'DEPLOYMENT']);
    const activeBuildCount = builds.filter((b) => activeBuildStatuses.has(b.status)).length;

    const buildStats = {
      total: buildAnalytics?.total_requests ?? builds.length,
      active: buildAnalytics?.active_requests ?? activeBuildCount,
      averageProgress: buildAnalytics?.average_progress ?? 0,
    };

    // Last activity: most recent updated_at across everything
    const timestamps: string[] = [];
    if (sprintAnalytics?.latest_request) timestamps.push(sprintAnalytics.latest_request);
    if (buildAnalytics?.latest_request) timestamps.push(buildAnalytics.latest_request);
    if (builds.length > 0) timestamps.push(builds[0].updated_at);
    timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastActivityAt = timestamps[0] ?? null;

    return {
      validation: validationStats,
      sprint: sprintStats,
      build: buildStats,
      lastActivityAt,
    };
  },
};
