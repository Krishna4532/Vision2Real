/**
 * Vision2Real – Reality Sprint Helper Utilities
 * Derived startup name resolver, relative + formatted dual date string generator,
 * byte size formatter, copy-to-clipboard helper, and timestamp-verified activity history.
 */

import { toast } from 'sonner';
import type { RealitySprintRequest } from '@/services/api/realitySprint';

/**
 * Derived Startup Name Fallback Strategy:
 * Priority 1: Startup Name (if present & non-empty)
 * Priority 2: Title (if present & non-empty)
 * Priority 3: Reality Sprint #<id prefix>
 * Never returns "Untitled", "Unknown", or "N/A".
 */
export function getDisplayStartupName(sprint: {
  startup_name?: string | null;
  title?: string | null;
  id?: string | null;
}): string {
  if (sprint.startup_name && sprint.startup_name.trim().length > 0) {
    return sprint.startup_name.trim();
  }
  if (sprint.title && sprint.title.trim().length > 0) {
    return sprint.title.trim();
  }
  const prefix = sprint.id ? sprint.id.substring(0, 8).toUpperCase() : 'REQ';
  return `Reality Sprint #${prefix}`;
}

/**
 * Format bytes into human readable file size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format date string into Dual Display Format:
 * Example: "2 days ago (July 15, 2026)"
 */
export function formatDualDate(dateInput: string | Date | null | undefined): {
  relative: string;
  absolute: string;
  combined: string;
} {
  if (!dateInput) {
    return { relative: 'Recently', absolute: 'N/A', combined: 'Recently' };
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { relative: 'Recently', absolute: 'N/A', combined: 'Recently' };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = 'Just now';
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    relative = `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else if (diffDays > 0) {
    relative = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffHours > 0) {
    relative = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffMin > 0) {
    relative = `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
  }

  const absolute = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    relative,
    absolute,
    combined: `${relative} · ${absolute}`,
  };
}

/**
 * One-click copy helper with toast notification
 */
export async function copyToClipboard(text: string, label = 'Request ID'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  } catch (err) {
    toast.error('Failed to copy to clipboard.');
  }
}

/**
 * Verified Activity Event structure (Stage 5.3)
 * Strict Zero Mock Policy: Contains only real timestamped occurrences.
 */
export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  formattedDate: {
    relative: string;
    absolute: string;
    combined: string;
  };
}

/**
 * Extract Activity History derived strictly from backend timestamps.
 * Returns sorted chronologically descending (newest first).
 */
export function getActivityHistory(sprint: RealitySprintRequest): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  if (sprint.submitted_at || sprint.created_at) {
    const ts = sprint.submitted_at || sprint.created_at;
    events.push({
      id: `${sprint.id}-submitted`,
      type: 'SUBMITTED',
      title: 'Sprint Request Submitted',
      description: 'Reality Sprint submitted and queued for architect scoping.',
      timestamp: ts,
      icon: '🚀',
      formattedDate: formatDualDate(ts),
    });
  }

  if (sprint.review_started_at) {
    events.push({
      id: `${sprint.id}-review`,
      type: 'UNDER_REVIEW',
      title: 'Architect Review Initiated',
      description: 'Lead architects are scoping parameters and de-risking sprint goals.',
      timestamp: sprint.review_started_at,
      icon: '🔍',
      formattedDate: formatDualDate(sprint.review_started_at),
    });
  }

  if (sprint.accepted_at) {
    events.push({
      id: `${sprint.id}-accepted`,
      type: 'ACCEPTED',
      title: 'Sprint Brief Approved',
      description: 'Scope and critical user journey milestones approved.',
      timestamp: sprint.accepted_at,
      icon: '🎯',
      formattedDate: formatDualDate(sprint.accepted_at),
    });
  }

  if (sprint.scheduled_at) {
    events.push({
      id: `${sprint.id}-scheduled`,
      type: 'SCHEDULED',
      title: 'Engineering Slot Scheduled',
      description: 'Dedicated prototyping window locked into build queue.',
      timestamp: sprint.scheduled_at,
      icon: '📅',
      formattedDate: formatDualDate(sprint.scheduled_at),
    });
  }

  if (sprint.started_at) {
    events.push({
      id: `${sprint.id}-started`,
      type: 'IN_PROGRESS',
      title: 'Rapid Prototyping Started',
      description: 'Active code scaffolding, architecture execution, and validation in progress.',
      timestamp: sprint.started_at,
      icon: '⚡',
      formattedDate: formatDualDate(sprint.started_at),
    });
  }

  if (sprint.completed_at) {
    events.push({
      id: `${sprint.id}-completed`,
      type: 'COMPLETED',
      title: 'Reality Sprint Completed',
      description: 'Prototype deliverables and validation packages compiled.',
      timestamp: sprint.completed_at,
      icon: '✅',
      formattedDate: formatDualDate(sprint.completed_at),
    });
  }

  if (sprint.cancelled_at) {
    events.push({
      id: `${sprint.id}-cancelled`,
      type: 'CANCELLED',
      title: 'Sprint Cancelled',
      description: 'Sprint request was cancelled or withdrawn.',
      timestamp: sprint.cancelled_at,
      icon: '⛔',
      formattedDate: formatDualDate(sprint.cancelled_at),
    });
  }

  // Sort descending by timestamp
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Determine the most recent activity label and timestamp for dashboard cards.
 */
export function getLastActivity(sprint: RealitySprintRequest): {
  label: string;
  formattedDate: { relative: string; absolute: string; combined: string };
} {
  const history = getActivityHistory(sprint);
  if (history.length > 0) {
    const latest = history[0];
    return {
      label: latest.title,
      formattedDate: latest.formattedDate,
    };
  }

  const fallbackDate = formatDualDate(sprint.updated_at || sprint.created_at);
  return {
    label: 'Updated',
    formattedDate: fallbackDate,
  };
}
