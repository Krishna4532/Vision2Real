import { memo } from 'react';
import type { CSSProperties } from 'react';

export type BadgeVariant =
  | 'DRAFT'
  | 'READY_FOR_VALIDATION'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REALITY_SPRINT'
  | 'BUILD_REQUESTED'
  | 'IN_DEVELOPMENT'
  | 'LAUNCHED'
  | 'ARCHIVED'
  | 'UNVALIDATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ACTIVE'
  | string;

interface StatusBadgeProps {
  status: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY_FOR_VALIDATION: 'Ready for Validation',
  VALIDATING: 'Validating...',
  VALIDATED: 'Validated',
  REALITY_SPRINT: 'Reality Sprint',
  BUILD_REQUESTED: 'Build Requested',
  IN_DEVELOPMENT: 'In Development',
  LAUNCHED: 'Launched',
  ARCHIVED: 'Archived',
  UNVALIDATED: 'Unvalidated',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ACTIVE: 'Active',
};

const STAGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  DRAFT: { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.25)' },
  READY_FOR_VALIDATION: { bg: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)' },
  VALIDATING: { bg: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  VALIDATED: { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.25)' },
  REALITY_SPRINT: { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  BUILD_REQUESTED: { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  IN_DEVELOPMENT: { bg: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
  LAUNCHED: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.35)' },
  ARCHIVED: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.25)' },
  UNVALIDATED: { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.2)' },
};

export const StatusBadge = memo(function StatusBadge({
  status,
  size = 'sm',
  className = '',
  style,
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toUpperCase();
  const label = STAGE_LABELS[normalizedKey] || status;
  const colors = STAGE_STYLES[normalizedKey] || {
    bg: 'rgba(99, 102, 241, 0.1)',
    color: '#818cf8',
    border: 'rgba(99, 102, 241, 0.25)',
  };

  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      className={`v2r-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: colors.color,
          boxShadow: `0 0 6px ${colors.color}`,
        }}
      />
      {label}
    </span>
  );
});
