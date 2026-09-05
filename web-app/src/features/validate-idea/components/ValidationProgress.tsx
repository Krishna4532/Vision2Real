/**
 * Vision2Real – Validation Progress Section
 * Operational view displaying live AI multi-specialist collaboration stages,
 * status indicators, parallel execution status, and live backend message streams.
 */

import { useMemo } from 'react';
import { ValidationStage } from './ValidationStage';
import type { ValidationStage as IValidationStage } from '@/types/validation';

interface ValidationProgressProps {
  stages: IValidationStage[];
  isTakingLonger?: boolean;
}

export function ValidationProgress({ stages, isTakingLonger = false }: ValidationProgressProps) {
  const displayStages = useMemo(() => {
    const activeRunningIndex = stages.findIndex((stage) => stage.status === 'running');
    const firstUnfinishedIndex = stages.findIndex((stage) => stage.status !== 'completed');
    const resolvedActiveIndex = activeRunningIndex >= 0 ? activeRunningIndex : firstUnfinishedIndex >= 0 ? firstUnfinishedIndex : stages.length - 1;

    return stages.map((stage, index) => {
      if (stage.status === 'failed') {
        return { ...stage, status: 'failed' as const, progress: 100 };
      }

      if (stage.status === 'completed') {
        return { ...stage, status: 'completed' as const, progress: 100 };
      }

      const isCurrentActive = index === resolvedActiveIndex && stage.status === 'running';

      if (isCurrentActive) {
        const baseProgress = Math.min(88, 32 + index * 12 + (stage.progress ?? 8));
        return {
          ...stage,
          status: 'running' as const,
          progress: Math.max(25, Math.min(88, baseProgress)),
        };
      }

      if (index < resolvedActiveIndex) {
        return { ...stage, status: 'completed' as const, progress: 100 };
      }

      return { ...stage, status: 'pending' as const, progress: 0 };
    });
  }, [stages]);

  return (
    <div className="v2r-progress-section" id="validation-progress">
      <div className="v2r-progress-header">
        <div className="v2r-progress-header__badge">
          <span className="v2r-progress-header__pulse" aria-hidden="true" />
          <span>AI Specialists Active</span>
        </div>
        <h2 className="v2r-progress-header__title">Vision2Real is validating your idea</h2>
        <p className="v2r-progress-header__subtitle">
          Our AI specialists are collaborating in parallel to evaluate your startup idea.
        </p>
      </div>

      <div className="v2r-stages-list" role="region" aria-label="Validation stages progress">
        {displayStages.map((stage) => (
          <ValidationStage key={stage.code} stage={stage} />
        ))}
      </div>

      {isTakingLonger && (
        <div className="v2r-long-running-banner" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            Validation is taking longer than expected. You may safely leave this page and return later
            without losing your progress.
          </span>
        </div>
      )}
    </div>
  );
}
