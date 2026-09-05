/**
 * Vision2Real – NotificationSkeleton (Stage 6.4)
 * Loading skeleton for Notification Center.
 */

import { memo } from 'react';

export const NotificationSkeleton = memo(function NotificationSkeleton() {
  return (
    <div className="v2r-notification-skeleton-list" aria-busy="true" aria-label="Loading notifications…">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="v2r-notification-skeleton-card">
          <div className="v2r-skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="v2r-skeleton" style={{ height: 16, width: '45%', borderRadius: 4 }} />
              <div className="v2r-skeleton" style={{ height: 12, width: '15%', borderRadius: 4 }} />
            </div>
            <div className="v2r-skeleton" style={{ height: 13, width: '80%', borderRadius: 4 }} />
            <div className="v2r-skeleton" style={{ height: 12, width: '25%', borderRadius: 4, marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
});
