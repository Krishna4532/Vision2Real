/**
 * Vision2Real – Validation Stage Item Component
 * Renders individual stage status (Pending, Running with live message, Completed, Failed)
 * with subtle premium motion for active running stages.
 */

import { motion } from 'motion/react';
import type { ValidationStage as IValidationStage } from '@/types/validation';

interface ValidationStageProps {
  stage: IValidationStage;
}

export function ValidationStage({ stage }: ValidationStageProps) {
  const { code, name, description, status, liveMessage, progress = 0 } = stage;

  return (
    <motion.div
      layout
      className={`v2r-stage-row v2r-stage-row--${status}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="v2r-stage-row__left">
        <span className="v2r-stage-row__code">{code === 'final' ? 'END' : code}</span>
        <div className="v2r-stage-row__content">
          <div className="v2r-stage-row__name">{name}</div>
          <div className="v2r-stage-row__description">{description}</div>

          <div className="v2r-stage-row__progress" aria-hidden="true">
            <motion.div
              className="v2r-stage-row__progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>

          {/* Live backend message stream */}
          {status === 'running' && liveMessage && (
            <div className="v2r-stage-row__live-msg">
              <span className="v2r-stage-row__live-spinner" aria-hidden="true" />
              <span>{liveMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="v2r-stage-row__right">
        <div className={`v2r-status-pill v2r-status-pill--${status}`}>
          {status === 'pending' && 'Pending'}
          {status === 'running' && (
            <>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  display: 'inline-block',
                }}
              />
              Running
            </>
          )}
          {status === 'completed' && '✓ Completed'}
          {status === 'failed' && '✕ Failed'}
        </div>
      </div>
    </motion.div>
  );
}
