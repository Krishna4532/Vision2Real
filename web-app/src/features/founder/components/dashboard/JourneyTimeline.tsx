/**
 * Vision2Real – Founder Journey Card (Stage 6.6 Redesign)
 * High-density visual progress experience with overall Progress %, connected animated pipeline,
 * and context-aware recommendation action cards.
 */

import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import type { DerivedJourneyStep } from '@/services/dashboard/types';

interface JourneyTimelineProps {
  steps: DerivedJourneyStep[];
  activeBuild?: {
    title: string;
    phase: string;
    progressPercentage: number;
    currentMilestone?: string;
  } | null;
  latestValidationScore?: number | null;
}

export const JourneyTimeline = memo(function JourneyTimeline({
  steps,
  activeBuild,
  latestValidationScore,
}: JourneyTimelineProps) {
  const navigate = useNavigate();

  // Compute progress percentage
  const { progressPercent, completedCount, currentStep } = useMemo(() => {
    if (!steps || steps.length === 0) {
      return { progressPercent: 0, completedCount: 0, currentStep: null };
    }
    const completed = steps.filter((s) => s.status === 'completed').length;
    const curr = steps.find((s) => s.status === 'current') || null;
    const pct = Math.round((completed / steps.length) * 100);
    return { progressPercent: pct, completedCount: completed, currentStep: curr };
  }, [steps]);

  if (!steps || steps.length === 0) return null;

  return (
    <motion.section
      id="journey"
      className="v2r-journey-card"
      aria-label="Founder Journey Experience"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
    >
      {/* 1. Header Row */}
      <div className="v2r-journey-card__header">
        <div className="v2r-journey-card__header-left">
          <div className="v2r-journey-card__badge-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 0012 3a14.98 14.98 0 00-9.75 3.55 14.98 14.98 0 006.16 12.12" />
            </svg>
          </div>
          <div>
            <h3 className="v2r-journey-card__title">Founder Journey</h3>
            <span className="v2r-journey-card__subtitle">
              {completedCount} of {steps.length} milestones complete
            </span>
          </div>
        </div>

        <div className="v2r-journey-card__header-right">
          <div className="v2r-journey-card__progress-pill">
            <div className="v2r-journey-card__progress-fill" style={{ width: `${progressPercent}%` }} />
            <span className="v2r-journey-card__progress-text">{progressPercent}% Completed</span>
          </div>
        </div>
      </div>

      {/* 2. Connected 3-Step Pipeline */}
      <div className="v2r-journey-card__pipeline">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div key={step.id} className="v2r-journey-card__pipeline-step-wrapper">
              <div className={`v2r-journey-card__step-node v2r-journey-card__step-node--${step.status}`}>
                {/* Node Icon */}
                <div className={`v2r-journey-card__node-dot v2r-journey-card__node-dot--${step.status}`}>
                  {isCompleted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="v2r-journey-card__pulse-dot" />
                  ) : (
                    <span className="v2r-journey-card__upcoming-dot" />
                  )}
                </div>

                {/* Step Content */}
                <div className="v2r-journey-card__node-info">
                  <span className="v2r-journey-card__node-num">Step 0{index + 1}</span>
                  <strong className={`v2r-journey-card__node-name v2r-journey-card__node-name--${step.status}`}>
                    {step.name}
                  </strong>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`v2r-journey-card__connector ${
                    isCompleted ? 'v2r-journey-card__connector--completed' : ''
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted && <div className="v2r-journey-card__connector-glow" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Contextual Action Banner */}
      <div className="v2r-journey-card__action-banner">
        {activeBuild ? (
          /* Case A: Build Request in Progress */
          <div className="v2r-journey-card__action-content">
            <div>
              <div className="v2r-journey-card__tag v2r-journey-card__tag--active">
                ⚡ Active Software Project
              </div>
              <h4 className="v2r-journey-card__action-title">{activeBuild.title}</h4>
              <p className="v2r-journey-card__action-desc">
                Current Phase: <strong>{activeBuild.phase}</strong> • Progress: {activeBuild.progressPercentage}%
                {activeBuild.currentMilestone && ` • Milestone: ${activeBuild.currentMilestone}`}
              </p>
            </div>
            <button
              className="v2r-journey-card__action-btn"
              onClick={() => navigate('/founder/build-requests')}
            >
              Track Software Build →
            </button>
          </div>
        ) : currentStep ? (
          /* Case B: Recommended Next Step (e.g. Reality Sprint) */
          <div className="v2r-journey-card__action-content">
            <div>
              <div className="v2r-journey-card__tag">
                🎯 Next Recommended Action
              </div>
              <h4 className="v2r-journey-card__action-title">{currentStep.name}</h4>
              <p className="v2r-journey-card__action-desc">{currentStep.description}</p>
              <div className="v2r-journey-card__meta-row">
                <span>⏱️ Est. Duration: <strong>1–2 Days</strong></span>
                <span>📋 Output: <strong>Architecture & Feature Spec</strong></span>
                {latestValidationScore && (
                  <span>📊 AI Scorecard: <strong>{latestValidationScore}/100</strong></span>
                )}
              </div>
            </div>
            <button
              className="v2r-journey-card__action-btn"
              onClick={() => navigate(currentStep.href)}
            >
              {currentStep.cta} →
            </button>
          </div>
        ) : (
          /* Case C: All Complete */
          <div className="v2r-journey-card__action-content">
            <div>
              <div className="v2r-journey-card__tag v2r-journey-card__tag--complete">
                🎉 All Journey Steps Complete
              </div>
              <h4 className="v2r-journey-card__action-title">Your startup is built and operating</h4>
              <p className="v2r-journey-card__action-desc">
                Monitor live notifications, system metrics, and engineering deliverables.
              </p>
            </div>
            <button
              className="v2r-journey-card__action-btn"
              onClick={() => navigate('/founder/build-requests')}
            >
              View Software Deliverables →
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
});
