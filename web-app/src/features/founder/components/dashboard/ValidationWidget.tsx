/**
 * Vision2Real – ValidationWidget (Stage 6.3)
 * Shows the latest validation from the real Validation API.
 * Prop: ValidationListItem | null
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import type { ValidationListItem } from '@/services/validation/types';

interface ValidationWidgetProps {
  validation: ValidationListItem | null;
  loading?: boolean;
  error?: string | null;
}

function deriveTitle(v: ValidationListItem): string {
  if (!v.idea_description) return 'Idea Validation';
  const words = v.idea_description.trim().split(/\s+/);
  const title = words.slice(0, 6).join(' ');
  return words.length > 6 ? `${title}…` : title;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

const REC_COLORS: Record<string, string> = {
  PROCEED: '#10b981',
  'PROCEED WITH CAUTION': '#f59e0b',
  PIVOT: '#f97316',
  PAUSE: '#ef4444',
  'DO NOT PROCEED': '#ef4444',
};

export const ValidationWidget = memo(function ValidationWidget({
  validation,
  loading,
  error,
}: ValidationWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="v2r-widget">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Latest Validation</h3>
        </div>
        <div className="v2r-skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2r-widget">
        <div className="v2r-widget__header">
          <h3 className="v2r-widget__title">Latest Validation</h3>
        </div>
        <div className="v2r-widget__error">
          <span>{error}</span>
          <button className="v2r-widget__retry" onClick={() => navigate('/founder/validations')}>
            View Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="v2r-widget"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="v2r-widget__header">
        <h3 className="v2r-widget__title">Latest Validation</h3>
        {validation && (
          <span
            className="v2r-widget__badge"
            style={{ color: validation.status === 'COMPLETED' ? '#10b981' : '#6366f1' }}
          >
            {validation.status === 'COMPLETED' ? 'Completed' : 'Processing'}
          </span>
        )}
      </div>

      {validation ? (
        <>
          <div className="v2r-widget__body">
            <div>
              <span className="v2r-widget__label">Idea</span>
              <p className="v2r-widget__value">{deriveTitle(validation)}</p>
            </div>

            {validation.overall_score != null && (
              <div>
                <span className="v2r-widget__label">Score</span>
                <div className="v2r-score">
                  <span
                    className="v2r-score__value"
                    style={{ color: getScoreColor(validation.overall_score) }}
                  >
                    {validation.overall_score}
                  </span>
                  <span className="v2r-score__max">/ 100</span>
                </div>
              </div>
            )}

            {validation.recommendation && (
              <div>
                <span className="v2r-widget__label">Recommendation</span>
                <p
                  className="v2r-widget__value"
                  style={{ color: REC_COLORS[validation.recommendation?.toUpperCase()] ?? '#6366f1' }}
                >
                  {validation.recommendation}
                </p>
              </div>
            )}

            <div>
              <span className="v2r-widget__label">Submitted</span>
              <p className="v2r-widget__value" style={{ fontSize: 'var(--text-xs)' }}>
                {new Date(validation.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="v2r-widget__footer">
            <button
              className="v2r-widget__ghost-btn"
              onClick={() => navigate(`/founder/validations/${validation.id}`)}
            >
              View Report →
            </button>
          </div>
        </>
      ) : (
        <div className="v2r-widget__empty">
          <div className="v2r-widget__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
            </svg>
          </div>
          <span className="v2r-widget__empty-text">
            Run your first validation to get evidence-based market insights.
          </span>
          <button
            className="v2r-widget__primary-btn"
            onClick={() => navigate('/validate-idea')}
          >
            Run Validation
          </button>
        </div>
      )}
    </motion.div>
  );
});
