/**
 * Vision2Real – Reality Sprint Activity Feed
 * Strict Zero Mock Policy: Renders events derived purely from existing non-null backend timestamps.
 */

import { getActivityHistory } from '../../utils/sprintHelpers';
import type { RealitySprintRequest } from '@/services/api/realitySprint';

interface RealitySprintActivityFeedProps {
  sprint: RealitySprintRequest;
}

export function RealitySprintActivityFeed({ sprint }: RealitySprintActivityFeedProps) {
  const activities = getActivityHistory(sprint);

  if (activities.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          fontStyle: 'italic',
          background: 'rgba(30, 41, 59, 0.3)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
        }}
      >
        No activity events recorded yet. Lifecycle updates will appear automatically as your sprint progresses.
      </div>
    );
  }

  return (
    <div className="v2r-activity-feed" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {activities.map((item, idx) => {
        return (
          <div
            key={item.id || idx}
            className="v2r-activity-item"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-xs)',
                  marginBottom: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {item.title}
                </span>

                <span
                  style={{
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {item.formattedDate.relative} ({item.formattedDate.absolute})
                </span>
              </div>

              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                {item.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
