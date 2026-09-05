/**
 * Vision2Real – DashboardPage (Stage 6.6 Performance Optimized & Polished)
 * Real-time founder command center with code-split lazy loading for below-the-fold widgets,
 * stale-while-revalidate caching, and high-density Founder Journey experience.
 */

import { memo, lazy, Suspense } from 'react';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { useDashboard } from '@/features/founder/hooks/useDashboard';
import { DashboardSkeleton } from '@/features/founder/components/dashboard/DashboardSkeleton';
import { WelcomeBanner } from '@/features/founder/components/dashboard/WelcomeBanner';
import { KpiSection } from '@/features/founder/components/dashboard/KpiSection';
import { BuildWidget } from '@/features/founder/components/dashboard/BuildWidget';
import { RealitySprintWidget } from '@/features/founder/components/dashboard/RealitySprintWidget';
import { ValidationWidget } from '@/features/founder/components/dashboard/ValidationWidget';
import { QuickActions } from '@/features/founder/components/dashboard/QuickActions';
import '@/features/founder/components/dashboard/FounderDashboard.css';

// Lazy-load below-the-fold components for bundle code-splitting
const JourneyTimeline = lazy(() =>
  import('@/features/founder/components/dashboard/JourneyTimeline').then((m) => ({
    default: m.JourneyTimeline,
  }))
);

const ActivityWidget = lazy(() =>
  import('@/features/founder/components/dashboard/ActivityWidget').then((m) => ({
    default: m.ActivityWidget,
  }))
);

// ── Onboarding Empty State ───────────────────────────────────────────────────

const OnboardingJourney = memo(function OnboardingJourney() {
  return (
    <div className="v2r-onboarding-journey" aria-label="Get started with Vision2Real">
      <div className="v2r-onboarding-journey__header">
        <h2 className="v2r-onboarding-journey__title">Welcome to Vision2Real</h2>
        <p className="v2r-onboarding-journey__subtitle">
          Follow the 3-step founder journey to bring your product to life.
        </p>
      </div>
      <div className="v2r-onboarding-journey__steps">
        {[
          {
            step: '01',
            icon: '🔬',
            title: 'Run Product Validation',
            desc: 'Get AI-powered market research and evidence-based insights on your idea.',
            href: '/validate-idea',
            cta: 'Run Validation',
          },
          {
            step: '02',
            icon: '⚡',
            title: 'Start Reality Sprint',
            desc: 'Receive a complete product specification, architecture plan, and roadmap.',
            href: '/build-product',
            cta: 'Start Reality Sprint',
          },
          {
            step: '03',
            icon: '🚀',
            title: 'Build My Product',
            desc: 'Submit your idea for full-stack development and delivery by the Vision2Real team.',
            href: '/build-product',
            cta: 'Build My Product',
          },
        ].map((s) => (
          <div key={s.step} className="v2r-onboarding-journey__card">
            <div className="v2r-onboarding-journey__card-step">{s.step}</div>
            <div className="v2r-onboarding-journey__card-icon">{s.icon}</div>
            <h3 className="v2r-onboarding-journey__card-title">{s.title}</h3>
            <p className="v2r-onboarding-journey__card-desc">{s.desc}</p>
            <a href={s.href} className="v2r-onboarding-journey__card-cta">
              {s.cta} →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Error Banner ─────────────────────────────────────────────────────────────

const ErrorBanner = memo(function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="v2r-dashboard-error" role="alert">
      <div className="v2r-dashboard-error__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <strong>Failed to load some dashboard data</strong>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {message}
        </p>
      </div>
      <button className="v2r-widget__retry" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
});

// ── Main Page ────────────────────────────────────────────────────────────────

export const DashboardPage = memo(function DashboardPage() {
  const { user } = useAuth();
  const {
    overview,
    stats,
    journey,
    isLoading,
    overviewError,
    statsError,
    lastRefreshedAt,
    refresh,
  } = useDashboard();

  if (isLoading && !overview && !stats) {
    return <DashboardSkeleton />;
  }

  // Determine if the founder is completely new
  const isNewFounder =
    !isLoading &&
    overview !== null &&
    overview.allValidations.length === 0 &&
    overview.allSprints.length === 0 &&
    overview.allBuildRequests.length === 0;

  // Active build details for Journey card
  const activeBuild = overview?.activeBuildRequest
    ? {
        title: overview.activeBuildRequest.startup_name || 'Software Project',
        phase: overview.activeBuildRequest.current_phase || 'Development',
        progressPercentage: overview.activeBuildRequest.progress_percentage || 0,
        currentMilestone: overview.activeBuildRequest.current_milestone || undefined,
      }
    : null;

  const latestValidationScore = overview?.latestValidation?.overall_score || null;

  return (
    <div className="v2r-dashboard">
      {/* 1 — Welcome Banner */}
      {user && (
        <WelcomeBanner
          user={user}
          lastRefreshedAt={lastRefreshedAt}
          onRefresh={refresh}
          isRefreshing={isLoading}
        />
      )}

      {/* Error banners — independent, non-blocking */}
      {overviewError && (
        <ErrorBanner message={overviewError} onRetry={refresh} />
      )}
      {statsError && !overviewError && (
        <ErrorBanner message={statsError} onRetry={refresh} />
      )}

      {/* 2 — KPI Cards */}
      <KpiSection stats={stats} loading={isLoading && !stats} />

      {/* 3 — Redesigned Founder Journey Card */}
      {!isNewFounder && journey.length > 0 && (
        <Suspense fallback={<div className="v2r-skeleton" style={{ height: 220, borderRadius: 'var(--radius-2xl)' }} />}>
          <JourneyTimeline
            steps={journey}
            activeBuild={activeBuild}
            latestValidationScore={latestValidationScore}
          />
        </Suspense>
      )}

      {/* 4 — Active Work (Build Request) */}
      {!isNewFounder && (
        <BuildWidget
          build={overview?.activeBuildRequest ?? null}
          loading={isLoading && !overview}
          error={overviewError}
        />
      )}

      {/* 5 — Main content row */}
      {!isNewFounder ? (
        <div className="v2r-dashboard__main-row">
          {/* Activity Feed */}
          <div className="v2r-dashboard__activity-col">
            <Suspense fallback={<div className="v2r-skeleton" style={{ height: 280, borderRadius: 'var(--radius-2xl)' }} />}>
              <ActivityWidget
                activity={overview?.recentActivity ?? []}
                loading={isLoading && !overview}
              />
            </Suspense>
          </div>

          {/* Side widgets */}
          <div className="v2r-dashboard__side-col">
            <RealitySprintWidget
              sprint={overview?.latestSprint ?? null}
              loading={isLoading && !overview}
              error={overviewError}
            />
            <ValidationWidget
              validation={overview?.latestValidation ?? null}
              loading={isLoading && !overview}
              error={overviewError}
            />
          </div>
        </div>
      ) : (
        /* New Founder — Onboarding Journey */
        <OnboardingJourney />
      )}

      {/* 6 — Quick Actions */}
      <QuickActions />
    </div>
  );
});
