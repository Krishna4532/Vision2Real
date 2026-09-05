/**
 * Vision2Real – NotificationEmptyState (Stage 6.4)
 * Production empty state for Notification Center.
 */

import { memo } from 'react';

interface NotificationEmptyStateProps {
  category: string;
  readFilter: string;
  searchQuery: string;
}

export const NotificationEmptyState = memo(function NotificationEmptyState({
  category,
  readFilter,
  searchQuery,
}: NotificationEmptyStateProps) {
  const isFiltered = category !== 'ALL' || readFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="v2r-notification-empty-state">
      <div className="v2r-notification-empty-state__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
      <h3 className="v2r-notification-empty-state__title">
        {isFiltered ? 'No matching notifications' : 'No notifications yet'}
      </h3>
      <p className="v2r-notification-empty-state__desc">
        {isFiltered
          ? 'Try adjusting your search query or filter tab to find what you are looking for.'
          : 'You are all caught up! You will receive alerts when AI specialists complete evidence research, reality sprint roadmaps, or software deliverables.'}
      </p>
    </div>
  );
});
