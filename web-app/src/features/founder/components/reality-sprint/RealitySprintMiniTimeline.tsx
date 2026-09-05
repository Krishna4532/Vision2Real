/**
 * Vision2Real – Reality Sprint Mini Timeline
 * Compact visual lifecycle preview rendered inside dashboard cards.
 */

import { getStatusConfig } from '../../utils/realitySprintStatus';
import type { RealitySprintStatus } from '@/services/api/realitySprint';

interface RealitySprintMiniTimelineProps {
  status: RealitySprintStatus | string;
}

const STAGES = [
  { key: 'SUBMITTED', shortLabel: 'Submitted' },
  { key: 'UNDER_REVIEW', shortLabel: 'Review' },
  { key: 'ACCEPTED', shortLabel: 'Accepted' },
  { key: 'SCHEDULED', shortLabel: 'Scheduled' },
  { key: 'IN_PROGRESS', shortLabel: 'Building' },
  { key: 'COMPLETED', shortLabel: 'Done' },
];

const STAGE_ORDER: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  UNDER_REVIEW: 2,
  ACCEPTED: 3,
  SCHEDULED: 4,
  IN_PROGRESS: 5,
  COMPLETED: 6,
  CANCELLED: -1,
};

export function RealitySprintMiniTimeline({ status }: RealitySprintMiniTimelineProps) {
  const upper = (status || 'SUBMITTED').toUpperCase();
  const currentLevel = STAGE_ORDER[upper] ?? 1;
  const isCancelled = upper === 'CANCELLED';
  const statusCfg = getStatusConfig(status);

  if (isCancelled) {
    return (
      <div
        className="v2r-mini-timeline"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          fontSize: 'var(--text-xs)',
          color: '#f87171',
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>⛔</span>
        <span>Sprint request cancelled</span>
      </div>
    );
  }

  return (
    <div
      className="v2r-mini-timeline"
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: '4px',
        padding: '6px 0',
      }}
      aria-label={`Lifecycle stage: ${statusCfg.label}`}
    >
      {STAGES.map((st, idx) => {
        const stepNum = idx + 1;
        const isPassed = currentLevel > stepNum;
        const isCurrent = currentLevel === stepNum;

        const nodeColor = isPassed
          ? '#10b981'
          : isCurrent
          ? statusCfg.dotColor
          : 'rgba(255, 255, 255, 0.15)';

        return (
          <div
            key={st.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: idx === STAGES.length - 1 ? '0 0 auto' : '1',
            }}
          >
            {/* Step node & label */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                position: 'relative',
              }}
              title={`${st.shortLabel}: ${isPassed ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}`}
            >
              <div
                style={{
                  width: isCurrent ? '10px' : '8px',
                  height: isCurrent ? '10px' : '8px',
                  borderRadius: '50%',
                  backgroundColor: nodeColor,
                  boxShadow: isCurrent ? `0 0 8px ${statusCfg.dotColor}` : 'none',
                  transition: 'all 0.3s ease',
                  border: isCurrent ? '2px solid rgba(255,255,255,0.8)' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isCurrent ? '700' : '500',
                  color: isCurrent
                    ? 'var(--color-text-primary)'
                    : isPassed
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}
              >
                {st.shortLabel}
              </span>
            </div>

            {/* Connecting line */}
            {idx < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  margin: '0 4px',
                  marginBottom: '14px', // Align with the dot center
                  backgroundColor: isPassed
                    ? '#10b981'
                    : isCurrent
                    ? `rgba(255, 255, 255, 0.2)`
                    : 'rgba(255, 255, 255, 0.08)',
                  transition: 'background-color 0.3s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
