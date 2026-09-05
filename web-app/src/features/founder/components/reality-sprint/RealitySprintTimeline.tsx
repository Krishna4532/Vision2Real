/**
 * Vision2Real – Reality Sprint Expanded Lifecycle Timeline
 * Production-ready vertical/horizontal stepper displaying genuine backend timestamps,
 * completed checkmarks, glowing active stage, and clean cancellation indication.
 */

import { motion } from 'framer-motion';
import { formatDualDate } from '../../utils/sprintHelpers';
import { getStatusConfig } from '../../utils/realitySprintStatus';
import type { RealitySprintRequest } from '@/services/api/realitySprint';

interface RealitySprintTimelineProps {
  sprint: RealitySprintRequest;
}

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  timestamp: string | null | undefined;
  isReached: boolean;
  isCurrent: boolean;
  isPassed: boolean;
}

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

export function RealitySprintTimeline({ sprint }: RealitySprintTimelineProps) {
  const currentStatus = sprint.status;
  const currentLevel = STAGE_ORDER[currentStatus] ?? 1;
  const isCancelled = currentStatus === 'CANCELLED';
  const statusCfg = getStatusConfig(currentStatus);

  const rawSteps: Array<{
    key: string;
    label: string;
    description: string;
    timestamp: string | null | undefined;
    level: number;
  }> = [
    {
      key: 'SUBMITTED',
      label: 'Submitted',
      description: 'Sprint request created & submitted for review',
      timestamp: sprint.submitted_at || sprint.created_at,
      level: 1,
    },
    {
      key: 'UNDER_REVIEW',
      label: 'Under Review',
      description: 'Lead architects scoping parameters & user journey',
      timestamp: sprint.review_started_at,
      level: 2,
    },
    {
      key: 'ACCEPTED',
      label: 'Accepted',
      description: 'Scope and critical user journey milestones approved',
      timestamp: sprint.accepted_at,
      level: 3,
    },
    {
      key: 'SCHEDULED',
      label: 'Scheduled',
      description: 'Prototyping slot confirmed in engineering calendar',
      timestamp: sprint.scheduled_at,
      level: 4,
    },
    {
      key: 'IN_PROGRESS',
      label: 'In Progress',
      description: 'Active rapid prototyping and validation sprint in execution',
      timestamp: sprint.started_at,
      level: 5,
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      description: 'Validation deliverables and prototype ready',
      timestamp: sprint.completed_at,
      level: 6,
    },
  ];

  const steps: TimelineStep[] = rawSteps.map((s) => {
    const isPassed = !isCancelled && currentLevel > s.level;
    const isCurrent = !isCancelled && currentLevel === s.level;
    const isReached = isPassed || isCurrent || !!s.timestamp;

    return {
      key: s.key,
      label: s.label,
      description: s.description,
      timestamp: s.timestamp,
      isReached,
      isCurrent,
      isPassed,
    };
  });

  return (
    <div className="v2r-expanded-timeline" style={{ width: '100%' }}>
      {isCancelled && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: 'var(--space-md) var(--space-lg)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>⛔</span>
          <div>
            <div style={{ fontWeight: 'var(--weight-bold)', color: '#f87171', fontSize: 'var(--text-sm)' }}>
              Sprint Request Cancelled
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              {sprint.cancelled_at
                ? `Cancelled on ${formatDualDate(sprint.cancelled_at).combined}`
                : 'This sprint request was withdrawn before completion.'}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          position: 'relative',
        }}
      >
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const dateInfo = step.timestamp ? formatDualDate(step.timestamp) : null;

          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                position: 'relative',
                opacity: step.isReached ? 1 : 0.45,
                transition: 'opacity 0.3s ease',
              }}
            >
              {/* Connector line behind the node */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    top: '28px',
                    left: '15px',
                    width: '2px',
                    bottom: '-16px',
                    backgroundColor: step.isPassed
                      ? '#10b981'
                      : step.isCurrent
                      ? 'rgba(99, 102, 241, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Node Icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  zIndex: 1,
                  flexShrink: 0,
                  backgroundColor: step.isPassed
                    ? '#10b981'
                    : step.isCurrent
                    ? statusCfg.dotColor
                    : 'rgba(30, 41, 59, 0.8)',
                  color: step.isPassed || step.isCurrent ? '#ffffff' : 'var(--color-text-muted)',
                  border: step.isCurrent
                    ? '3px solid rgba(255, 255, 255, 0.9)'
                    : step.isPassed
                    ? '2px solid rgba(16, 185, 129, 0.5)'
                    : '2px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: step.isCurrent
                    ? `0 0 16px ${statusCfg.dotColor}80`
                    : 'none',
                }}
              >
                {step.isPassed ? (
                  '✓'
                ) : step.isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ●
                  </motion.div>
                ) : (
                  '○'
                )}
              </div>

              {/* Step Details */}
              <div
                style={{
                  flex: 1,
                  paddingBottom: isLast ? '0' : 'var(--space-md)',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-xs)',
                    marginBottom: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: step.isCurrent ? '700' : '600',
                        color: step.isCurrent
                          ? 'var(--color-text-primary)'
                          : step.isReached
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-muted)',
                      }}
                    >
                      {step.label}
                    </span>

                    {step.isCurrent && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1px 8px',
                          borderRadius: '999px',
                          backgroundColor: `${statusCfg.dotColor}25`,
                          color: statusCfg.dotColor,
                          border: `1px solid ${statusCfg.dotColor}50`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Current Stage
                      </span>
                    )}
                  </div>

                  {dateInfo ? (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {dateInfo.relative} ({dateInfo.absolute})
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Pending execution
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: step.isReached ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                    lineHeight: '1.5',
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
