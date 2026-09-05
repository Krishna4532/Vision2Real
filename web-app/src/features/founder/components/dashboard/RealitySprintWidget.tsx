/**
 * Vision2Real – RealitySprintWidget (Stage 6.3)
 * Shows the latest Reality Sprint from the real Reality Sprint API.
 * Prop: RealitySprintRequest | null
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import type { RealitySprintRequest } from '@/services/api/realitySprint';
import { getStatusConfig } from '@/features/founder/utils/realitySprintStatus';

interface RealitySprintWidgetProps {
  sprint: RealitySprintRequest | null;
  loading?: boolean;
  error?: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export const RealitySprintWidget = memo(function RealitySprintWidget({
  sprint,
  loading,
  error,
}: RealitySprintWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="v2r-widget">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Reality Sprint</h3>
        </div>
        <div className="v2r-skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2r-widget">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Reality Sprint</h3>
        </div>
        <div className="v2r-widget__error">
          <span>{error}</span>
          <button className="v2r-widget__retry" onClick={() => navigate('/founder/sprint')}>
            View Sprints
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = sprint ? getStatusConfig(sprint.status) : null;

  return (
    <motion.div
      className="v2r-widget v2r-sprint-widget"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="v2r-widget__header">
        <h3 className="v2r-widget__title">Reality Sprint</h3>
        {statusConfig && (
          <span
            className="v2r-widget__badge"
            style={{ color: statusConfig.dotColor }}
          >
            {statusConfig.label}
          </span>
        )}
      </div>

      {sprint ? (
        <>
          <div className="v2r-widget__body">
            <div>
              <span className="v2r-widget__label">Sprint</span>
              <p className="v2r-widget__value">
                {sprint.title.length > 60 ? `${sprint.title.substring(0, 57)}…` : sprint.title}
              </p>
            </div>

            {sprint.startup_name && (
              <div>
                <span className="v2r-widget__label">Startup</span>
                <p className="v2r-widget__value">{sprint.startup_name}</p>
              </div>
            )}

            <div>
              <span className="v2r-widget__label">Submitted</span>
              <p className="v2r-widget__value" style={{ fontSize: 'var(--text-xs)' }}>
                {formatDate(sprint.submitted_at || sprint.created_at)}
              </p>
            </div>

            <div>
              <span className="v2r-widget__label">Last Activity</span>
              <p className="v2r-widget__value" style={{ fontSize: 'var(--text-xs)' }}>
                {getRelativeTime(sprint.updated_at)}
              </p>
            </div>
          </div>

          <div className="v2r-widget__footer">
            <button
              className="v2r-widget__ghost-btn"
              onClick={() => navigate(`/founder/sprint/${sprint.id}`)}
            >
              View Sprint →
            </button>
          </div>
        </>
      ) : (
        <div className="v2r-widget__empty">
          <div className="v2r-widget__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="v2r-widget__empty-text">
            Start a Reality Sprint to get your product specification and technical roadmap.
          </span>
          <button
            className="v2r-widget__primary-btn"
            onClick={() => navigate('/build-product')}
          >
            Start Reality Sprint
          </button>
        </div>
      )}
    </motion.div>
  );
});
