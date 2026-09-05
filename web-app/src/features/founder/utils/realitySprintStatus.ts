/**
 * Vision2Real – Reality Sprint Status Utility
 * Centralized status mapping, progress engine, banner guidance,
 * and lifecycle step definitions for the Founder Workspace.
 */

import type { RealitySprintStatus } from '@/services/api/realitySprint';

export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
  description: string;
}

export const REALITY_SPRINT_STATUS_MAP: Record<RealitySprintStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'v2r-status-badge--draft',
    dotColor: '#94a3b8',
    description: 'Request details are being compiled.',
  },
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'v2r-status-badge--submitted',
    dotColor: '#3b82f6',
    description: 'Sprint request has been received by Vision2Real engineering team.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass: 'v2r-status-badge--review',
    dotColor: '#f59e0b',
    description: 'Lead architects are scoping sprint parameters and journey validation steps.',
  },
  ACCEPTED: {
    label: 'Accepted',
    badgeClass: 'v2r-status-badge--accepted',
    dotColor: '#10b981',
    description: 'Sprint brief is approved and queued for engineering schedule.',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'v2r-status-badge--scheduled',
    dotColor: '#a855f7',
    description: 'Engineering slot locked. Sprint work scheduled to launch.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'v2r-status-badge--progress',
    dotColor: '#6366f1',
    description: 'Active rapid prototyping and validation sprint in execution.',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'v2r-status-badge--completed',
    dotColor: '#34d399',
    description: 'Validation deliverables and prototype ready in Founder Workspace.',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'v2r-status-badge--cancelled',
    dotColor: '#ef4444',
    description: 'Sprint request was withdrawn or cancelled.',
  },
};

export function getStatusConfig(status: RealitySprintStatus | string): StatusConfig {
  const upper = (status || 'SUBMITTED').toUpperCase() as RealitySprintStatus;
  return (
    REALITY_SPRINT_STATUS_MAP[upper] || {
      label: status,
      badgeClass: 'v2r-status-badge--submitted',
      dotColor: '#3b82f6',
      description: 'Request status in system.',
    }
  );
}

/**
 * Visual Progress Engine (Stage 5.3)
 * Purely visual status-to-percentage mapping.
 * Never stored in database.
 */
export const STATUS_PROGRESS_MAP: Record<RealitySprintStatus, number> = {
  DRAFT: 5,
  SUBMITTED: 10,
  UNDER_REVIEW: 25,
  ACCEPTED: 45,
  SCHEDULED: 60,
  IN_PROGRESS: 80,
  COMPLETED: 100,
  CANCELLED: 0,
};

export function getSprintProgress(status: RealitySprintStatus | string): number {
  const upper = (status || 'SUBMITTED').toUpperCase() as RealitySprintStatus;
  return STATUS_PROGRESS_MAP[upper] ?? 10;
}

/**
 * Status Banner Guidance (Stage 5.3)
 * Dynamic message headlines, subtexts, and accent styles for the detail view banner.
 */
export interface StatusBannerConfig {
  headline: string;
  subtext: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
}

export const STATUS_BANNER_MAP: Record<RealitySprintStatus, StatusBannerConfig> = {
  DRAFT: {
    headline: 'Draft Sprint Request',
    subtext: 'Your request draft is saved. Finalize details and submit to trigger architecture review.',
    icon: '📝',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  SUBMITTED: {
    headline: 'Your request has been received.',
    subtext: 'Our engineering and architecture team will review your brief and requirements within 24 hours.',
    icon: '📬',
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  UNDER_REVIEW: {
    headline: 'Our team is reviewing your Reality Sprint.',
    subtext: 'Lead architects are scoping parameters, evaluating user journeys, and setting up validation milestones.',
    icon: '🔍',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  ACCEPTED: {
    headline: 'Great news! Your sprint has been accepted.',
    subtext: 'The sprint brief is approved. We are finalizing resource allocation and scheduling your build slot.',
    icon: '🎯',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  SCHEDULED: {
    headline: 'Your sprint has been scheduled.',
    subtext: 'Your dedicated sprint window is locked in. Active prototype generation and engineering starts on time.',
    icon: '📅',
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  IN_PROGRESS: {
    headline: 'Our team is actively working.',
    subtext: 'Rapid prototyping, critical user journey validation, and code scaffolding are actively underway.',
    icon: '⚡',
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  COMPLETED: {
    headline: 'Your Reality Sprint is complete.',
    subtext: 'Validation materials, technical deliverables, and prototype artifacts are compiled and ready for review.',
    icon: '🚀',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  CANCELLED: {
    headline: 'This sprint has been cancelled.',
    subtext: 'This sprint request was withdrawn or cancelled. You can clone or submit a new Reality Sprint anytime.',
    icon: '⛔',
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
};

export function getStatusBannerConfig(status: RealitySprintStatus | string): StatusBannerConfig {
  const upper = (status || 'SUBMITTED').toUpperCase() as RealitySprintStatus;
  return (
    STATUS_BANNER_MAP[upper] || {
      headline: 'Sprint Status Update',
      subtext: 'Track your sprint progress and status updates live.',
      icon: 'ℹ️',
      color: '#60a5fa',
      bg: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.25)',
    }
  );
}

/**
 * Canonical lifecycle stages in chronological progression.
 */
export const LIFECYCLE_STAGES = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

/**
 * Priority Badge System (Stage 5 Production Fix)
 * Ensures HIGH, NORMAL, and LOW are all rendered with consistent styling.
 */
export interface PriorityBadgeConfig {
  label: string;
  badgeClass: string;
  color: string;
  bg: string;
  borderColor: string;
}

export function getPriorityBadgeConfig(priority: string | undefined | null): PriorityBadgeConfig {
  const upper = (priority || 'NORMAL').toUpperCase();
  switch (upper) {
    case 'HIGH':
      return {
        label: 'High Priority',
        badgeClass: 'v2r-priority-badge--high',
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
      };
    case 'LOW':
      return {
        label: 'Low Priority',
        badgeClass: 'v2r-priority-badge--low',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
      };
    case 'NORMAL':
    default:
      return {
        label: 'Normal Priority',
        badgeClass: 'v2r-priority-badge--normal',
        color: '#818cf8',
        bg: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
      };
  }
}

