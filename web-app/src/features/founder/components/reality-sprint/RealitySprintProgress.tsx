/**
 * Vision2Real – Reality Sprint Progress Indicator
 * Animated progress bar indicating visual completion percentage derived from backend status.
 */

import { motion } from 'framer-motion';
import { getSprintProgress, getStatusConfig } from '../../utils/realitySprintStatus';
import type { RealitySprintStatus } from '@/services/api/realitySprint';

interface RealitySprintProgressProps {
  status: RealitySprintStatus | string;
  showLabel?: boolean;
  height?: number;
  className?: string;
}

export function RealitySprintProgress({
  status,
  showLabel = true,
  height = 6,
  className = '',
}: RealitySprintProgressProps) {
  const progress = getSprintProgress(status);
  const statusCfg = getStatusConfig(status);

  return (
    <div
      className={`v2r-sprint-progress ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Sprint progress: ${progress}% (${statusCfg.label})`}
      style={{ width: '100%' }}
    >
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: statusCfg.dotColor,
                display: 'inline-block',
              }}
            />
            <span>{statusCfg.label} Stage</span>
          </span>
          <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
            {progress}%
          </span>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%',
            backgroundColor: statusCfg.dotColor,
            borderRadius: '999px',
            boxShadow: `0 0 10px ${statusCfg.dotColor}50`,
          }}
        />
      </div>
    </div>
  );
}
