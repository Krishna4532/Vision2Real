/**
 * Vision2Real – Reality Sprint Skeleton Loaders
 * Animated shimmering placeholders preventing layout shifts during network fetches.
 */

export function SprintCardSkeleton() {
  return (
    <div
      className="v2r-sprint-skeleton-card"
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60%' }}>
          <div className="v2r-skeleton-bar" style={{ width: '35%', height: '14px' }} />
          <div className="v2r-skeleton-bar" style={{ width: '75%', height: '24px' }} />
        </div>
        <div className="v2r-skeleton-bar" style={{ width: '100px', height: '28px', borderRadius: '999px' }} />
      </div>

      <div className="v2r-skeleton-bar" style={{ width: '90%', height: '16px' }} />
      <div className="v2r-skeleton-bar" style={{ width: '70%', height: '16px' }} />

      <div style={{ margin: 'var(--space-xs) 0' }}>
        <div className="v2r-skeleton-bar" style={{ width: '100%', height: '8px', borderRadius: '999px' }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-md)',
          paddingTop: 'var(--space-sm)',
        }}
      >
        <div className="v2r-skeleton-bar" style={{ height: '36px' }} />
        <div className="v2r-skeleton-bar" style={{ height: '36px' }} />
        <div className="v2r-skeleton-bar" style={{ height: '36px' }} />
        <div className="v2r-skeleton-bar" style={{ height: '36px' }} />
      </div>
    </div>
  );
}

export function SprintDashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <SprintCardSkeleton />
      <SprintCardSkeleton />
      <SprintCardSkeleton />
    </div>
  );
}

export function SprintDetailSkeleton() {
  return (
    <div className="v2r-sprint-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Banner Skeleton */}
      <div
        className="v2r-skeleton-bar"
        style={{
          width: '100%',
          height: '140px',
          borderRadius: 'var(--radius-xl)',
        }}
      />

      {/* Main Section Skeleton */}
      <div
        className="v2r-skeleton-bar"
        style={{
          width: '100%',
          height: '220px',
          borderRadius: 'var(--radius-xl)',
        }}
      />

      {/* Timeline Section Skeleton */}
      <div
        className="v2r-skeleton-bar"
        style={{
          width: '100%',
          height: '280px',
          borderRadius: 'var(--radius-xl)',
        }}
      />
    </div>
  );
}
