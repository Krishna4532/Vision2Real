/**
 * Vision2Real – Founder Dashboard Types (Stage 6.3)
 *
 * All types are derived from real API responses — no phantom /dashboard endpoint.
 * Aggregated from:
 *   - Validation API    (validationService.listValidations / getAnalytics)
 *   - Reality Sprint API (realitySprintApi.listRealitySprints / getAnalytics)
 *   - Build Requests API (buildRequestApi.listBuildRequests / getAnalytics)
 */

import type { ValidationListItem } from '@/services/validation/types';
import type { RealitySprintRequest, RealitySprintAnalyticsData } from '@/services/api/realitySprint';
import type { BuildRequestListItem, BuildRequestAnalytics } from '@/services/api/buildRequest';

// ── Re-export convenience types used in components ──────────────────────────
export type { ValidationListItem, RealitySprintRequest, BuildRequestListItem };

// ── Legacy Compatibility Types ───────────────────────────────────────────────
export interface IdeaSummary {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  category: string | null;
}

export interface DashboardStats {
  ideas_count: number;
  validations_count: number;
  reports_count: number;
  projects_count: number;
}

// ── KPI Stats aggregated from analytics endpoints ───────────────────────────
export interface DashboardValidationStats {
  total: number;
  completed: number;
  processing: number;
}

export interface DashboardSprintStats {
  total: number;
  active: number;
  latestStatus: string | null;
}

export interface DashboardBuildStats {
  total: number;
  active: number;
  averageProgress: number;
}

export interface DashboardQuickStats {
  validation: DashboardValidationStats;
  sprint: DashboardSprintStats;
  build: DashboardBuildStats;
  lastActivityAt: string | null;
}

// ── Derived journey step (computed from real counts) ─────────────────────────
export type JourneyStepStatus = 'completed' | 'current' | 'upcoming';

export interface DerivedJourneyStep {
  id: string;
  name: string;
  description: string;
  status: JourneyStepStatus;
  href: string;
  cta: string;
}

// ── Activity feed item ───────────────────────────────────────────────────────
export type ActivitySourceType = 'validation' | 'sprint' | 'build' | 'message';

export interface DashboardActivityItem {
  id: string;
  type: ActivitySourceType;
  title: string;
  description: string;
  timestamp: string;       // ISO 8601 — used for sort and relative display
  link: string;            // deep link to detail page
}

// ── Full aggregated dashboard overview ──────────────────────────────────────
export interface DashboardOverview {
  latestValidation: ValidationListItem | null;
  latestSprint: RealitySprintRequest | null;
  activeBuildRequest: BuildRequestListItem | null;
  allSprints: RealitySprintRequest[];
  allBuildRequests: BuildRequestListItem[];
  allValidations: ValidationListItem[];
  recentActivity: DashboardActivityItem[];
}

// ── Complete dashboard state returned by useDashboard ───────────────────────
export interface DashboardState {
  stats: DashboardQuickStats | null;
  overview: DashboardOverview | null;
  journey: DerivedJourneyStep[];
  isLoading: boolean;
  statsError: string | null;
  overviewError: string | null;
  lastRefreshedAt: Date | null;
  refresh: () => void;
}

// ── Analytics used internally for stats derivation ──────────────────────────
export type { RealitySprintAnalyticsData, BuildRequestAnalytics };
