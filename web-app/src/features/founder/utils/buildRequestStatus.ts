/**
 * Vision2Real – Centralized Build Request Status Configuration
 * Single source of truth for status badges, icons, themes, progress percentages,
 * and timeline state across all Founder Workspace Build Request components.
 */

import type { BuildRequestStatus, Priority } from '@/services/api/buildRequest';

export interface StatusConfig {
  key: BuildRequestStatus;
  label: string;
  badgeClass: string;
  bgStyle: string;
  textStyle: string;
  borderStyle: string;
  icon: string;
  defaultProgress: number;
  description: string;
}

export const BUILD_STATUS_CONFIGS: Record<BuildRequestStatus, StatusConfig> = {
  SUBMITTED: {
    key: 'SUBMITTED',
    label: 'Submitted',
    badgeClass: 'v2r-badge--submitted',
    bgStyle: 'rgba(59, 130, 246, 0.15)',
    textStyle: '#60a5fa',
    borderStyle: 'rgba(59, 130, 246, 0.35)',
    icon: '📥',
    defaultProgress: 5,
    description: 'Build Request received and awaiting engineering review.',
  },
  ACCEPTED: {
    key: 'ACCEPTED',
    label: 'Accepted',
    badgeClass: 'v2r-badge--accepted',
    bgStyle: 'rgba(16, 185, 129, 0.15)',
    textStyle: '#34d399',
    borderStyle: 'rgba(16, 185, 129, 0.35)',
    icon: '✅',
    defaultProgress: 15,
    description: 'Build Request accepted and queued for technical blueprinting.',
  },
  PLANNING: {
    key: 'PLANNING',
    label: 'Planning',
    badgeClass: 'v2r-badge--planning',
    bgStyle: 'rgba(139, 92, 246, 0.15)',
    textStyle: '#a78bfa',
    borderStyle: 'rgba(139, 92, 246, 0.35)',
    icon: '📐',
    defaultProgress: 25,
    description: 'System architecture, database schema, and API specs in planning.',
  },
  UI_DESIGN: {
    key: 'UI_DESIGN',
    label: 'UI/UX Design',
    badgeClass: 'v2r-badge--ui_design',
    bgStyle: 'rgba(236, 72, 153, 0.15)',
    textStyle: '#f472b6',
    borderStyle: 'rgba(236, 72, 153, 0.35)',
    icon: '🎨',
    defaultProgress: 40,
    description: 'Component system, user interfaces, and wireframes in design.',
  },
  BACKEND: {
    key: 'BACKEND',
    label: 'Backend Dev',
    badgeClass: 'v2r-badge--backend',
    bgStyle: 'rgba(245, 158, 11, 0.15)',
    textStyle: '#fbbf24',
    borderStyle: 'rgba(245, 158, 11, 0.35)',
    icon: '⚙️',
    defaultProgress: 55,
    description: 'Database models, API services, and core backend logic build.',
  },
  FRONTEND: {
    key: 'FRONTEND',
    label: 'Frontend Dev',
    badgeClass: 'v2r-badge--frontend',
    bgStyle: 'rgba(6, 182, 212, 0.15)',
    textStyle: '#22d3ee',
    borderStyle: 'rgba(6, 182, 212, 0.35)',
    icon: '💻',
    defaultProgress: 70,
    description: 'Interactive web application components and page integration.',
  },
  TESTING: {
    key: 'TESTING',
    label: 'Testing & QA',
    badgeClass: 'v2r-badge--testing',
    bgStyle: 'rgba(168, 85, 247, 0.15)',
    textStyle: '#c084fc',
    borderStyle: 'rgba(168, 85, 247, 0.35)',
    icon: '🧪',
    defaultProgress: 85,
    description: 'Automated test suite execution, integration tests, and security QA.',
  },
  DEPLOYMENT: {
    key: 'DEPLOYMENT',
    label: 'Deployment',
    badgeClass: 'v2r-badge--deployment',
    bgStyle: 'rgba(20, 184, 166, 0.15)',
    textStyle: '#2dd4bf',
    borderStyle: 'rgba(20, 184, 166, 0.35)',
    icon: '🚀',
    defaultProgress: 95,
    description: 'CI/CD pipeline staging, production build, and cloud hosting setup.',
  },
  COMPLETED: {
    key: 'COMPLETED',
    label: 'Delivered',
    badgeClass: 'v2r-badge--completed',
    bgStyle: 'rgba(16, 185, 129, 0.2)',
    textStyle: '#10b981',
    borderStyle: 'rgba(16, 185, 129, 0.45)',
    icon: '🎉',
    defaultProgress: 100,
    description: 'Full-stack software application completed and handed off to founder.',
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'Cancelled',
    badgeClass: 'v2r-badge--cancelled',
    bgStyle: 'rgba(239, 68, 68, 0.15)',
    textStyle: '#f87171',
    borderStyle: 'rgba(239, 68, 68, 0.35)',
    icon: '🛑',
    defaultProgress: 0,
    description: 'Build Request has been cancelled.',
  },
};

export function getStatusConfig(status: BuildRequestStatus): StatusConfig {
  return BUILD_STATUS_CONFIGS[status] || BUILD_STATUS_CONFIGS.SUBMITTED;
}

export function getPriorityConfig(priority: Priority): { label: string; bgStyle: string; textStyle: string } {
  switch (priority) {
    case 'HIGH':
      return { label: 'HIGH', bgStyle: 'rgba(239, 68, 68, 0.12)', textStyle: '#ef4444' };
    case 'LOW':
      return { label: 'LOW', bgStyle: 'rgba(100, 116, 139, 0.12)', textStyle: '#64748b' };
    default:
      return { label: 'NORMAL', bgStyle: 'rgba(148, 163, 184, 0.12)', textStyle: '#94a3b8' };
  }
}

/**
 * Calculates human-readable relative time string (e.g. "2 hours ago", "3 days ago")
 */
export function getRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const diffMs = Date.now() - time;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Formats file sizes nicely (e.g. "1.2 MB", "450 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
