/**
 * Vision2Real – BuildWidget / Active Work Widget (Stage 6.3)
 * Shows the active Build Request from the real Build Requests API.
 * Prop: BuildRequestListItem | null
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import type { BuildRequestListItem } from '@/services/api/buildRequest';
import { getStatusConfig } from '@/features/founder/utils/buildRequestStatus';

interface BuildWidgetProps {
  build: BuildRequestListItem | null;
  loading?: boolean;
  error?: string | null;
}

export const BuildWidget = memo(function BuildWidget({ build, loading, error }: BuildWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="v2r-active-work">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Active Build Project</h3>
        </div>
        <div className="v2r-skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2r-active-work">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Active Build Project</h3>
        </div>
        <div className="v2r-widget__error">
          <span>{error}</span>
          <button className="v2r-widget__retry" onClick={() => navigate('/founder/build-requests')}>
            View Projects
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = build ? getStatusConfig(build.status) : null;

  return (
    <motion.section
      className="v2r-active-work"
      aria-label="Active Build Project"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="v2r-active-work__header">
        <div>
          <h2 className="v2r-active-work__title">Active Build Project</h2>
          <p className="v2r-active-work__subtitle">
            Your current software build in progress
          </p>
        </div>
        {statusConfig && (
          <span
            className="v2r-widget__badge v2r-active-work__badge"
            style={{ backgroundColor: statusConfig.bgStyle, color: statusConfig.textStyle }}
          >
            {statusConfig.icon} {statusConfig.label}
          </span>
        )}
      </div>

      {build ? (
        <>
          <div className="v2r-active-work__body">
            <div className="v2r-active-work__meta">
              <div>
                <span className="v2r-widget__label">Project</span>
                <p className="v2r-active-work__project-name">
                  {build.title.length > 60 ? `${build.title.substring(0, 57)}…` : build.title}
                </p>
                {build.startup_name && (
                  <p className="v2r-active-work__startup">{build.startup_name}</p>
                )}
              </div>

              <div className="v2r-active-work__fields">
                {build.current_phase && (
                  <div>
                    <span className="v2r-widget__label">Current Phase</span>
                    <p className="v2r-widget__value">{build.current_phase.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {build.current_milestone && (
                  <div>
                    <span className="v2r-widget__label">Milestone</span>
                    <p className="v2r-widget__value">{build.current_milestone}</p>
                  </div>
                )}
                {build.product_category && (
                  <div>
                    <span className="v2r-widget__label">Category</span>
                    <p className="v2r-widget__value">{build.product_category}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="v2r-active-work__progress">
              <div className="v2r-active-work__progress-header">
                <span className="v2r-widget__label">Build Progress</span>
                <span className="v2r-active-work__progress-pct">
                  {build.progress_percentage ?? 0}%
                </span>
              </div>
              <div
                className="v2r-progress"
                role="progressbar"
                aria-valuenow={build.progress_percentage ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Build progress: ${build.progress_percentage ?? 0}%`}
              >
                <div
                  className="v2r-progress__fill"
                  style={{ width: `${build.progress_percentage ?? 0}%` }}
                />
              </div>
            </div>

            </div>

          <div className="v2r-active-work__footer">
            <button
              className="v2r-active-work__cta-btn"
              onClick={() => navigate(`/founder/build-requests/${build.id}`)}
            >
              View Project Details →
            </button>
            <button
              className="v2r-widget__ghost-btn"
              onClick={() => navigate('/founder/build-requests')}
            >
              All Projects
            </button>
          </div>
        </>
      ) : (
        <div className="v2r-active-work__empty">
          <div className="v2r-active-work__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 14.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="v2r-active-work__empty-text">
            <strong>No active build project</strong>
            <p>Submit your product idea for full-stack development by the Vision2Real team.</p>
          </div>
          <button
            className="v2r-active-work__cta-btn"
            onClick={() => navigate('/build-product')}
          >
            Build My Product
          </button>
        </div>
      )}
    </motion.section>
  );
});
