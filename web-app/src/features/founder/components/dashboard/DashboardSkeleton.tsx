/**
 * Vision2Real – DashboardSkeleton (Stage 6.3)
 * Production skeleton that mirrors the live dashboard layout exactly — no layout shift.
 */

import { memo } from 'react';

function Bone({ h, w = '100%', radius = 'var(--radius-lg)' }: { h: string; w?: string; radius?: string }) {
  return (
    <div
      className="v2r-skeleton"
      style={{ height: h, width: w, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="v2r-dashboard" aria-label="Loading dashboard…" aria-busy="true">
      {/* Welcome banner */}
      <Bone h="128px" />

      {/* KPI section — 3 groups of 3 cards */}
      <div className="v2r-kpi-section">
        {[0, 1, 2].map((g) => (
          <div key={g} className="v2r-kpi-group">
            <Bone h="18px" w="120px" radius="var(--radius-sm)" />
            <div className="v2r-kpi-group__cards">
              {[0, 1, 2].map((c) => (
                <Bone key={c} h="90px" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active Work widget */}
      <Bone h="160px" />

      {/* Activity feed + widgets row */}
      <div className="v2r-dashboard__main-row">
        <div className="v2r-dashboard__activity-col">
          <Bone h="20px" w="160px" radius="var(--radius-sm)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="v2r-skeleton-activity-row">
                <Bone h="36px" w="36px" radius="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }}>
                  <Bone h="14px" w="60%" radius="var(--radius-sm)" />
                  <Bone h="12px" w="85%" radius="var(--radius-sm)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="v2r-dashboard__side-col">
          <Bone h="180px" />
          <Bone h="180px" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="v2r-quick-actions">
        {[0, 1, 2, 3, 4].map((i) => (
          <Bone key={i} h="72px" />
        ))}
      </div>
    </div>
  );
});
