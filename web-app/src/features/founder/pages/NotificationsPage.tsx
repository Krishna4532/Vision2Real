/**
 * Vision2Real – NotificationsPage (Stage 6.4)
 * Production-ready Notification Center replacing placeholder.
 * Features category tabs, read/unread filters, debounced search, soft dismissal,
 * mark all read, paginated cards, skeleton loader, and empty states.
 */

import { memo } from 'react';
import { useNotifications } from '@/features/founder/hooks/useNotifications';
import { NotificationFilterBar } from '@/features/founder/components/notifications/NotificationFilterBar';
import { NotificationCard } from '@/features/founder/components/notifications/NotificationCard';
import { NotificationSkeleton } from '@/features/founder/components/notifications/NotificationSkeleton';
import { NotificationEmptyState } from '@/features/founder/components/notifications/NotificationEmptyState';
import './NotificationsPage.css';

export const NotificationsPage = memo(function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    totalPages,
    currentPage,
    isLoading,
    error,
    categoryFilter,
    readFilter,
    searchQuery,
    setCategoryFilter,
    setReadFilter,
    setSearchQuery,
    setPage,
    markAsRead,
    markAllAsRead,
    deleteReadNotifications,
    dismissNotification,
    refresh,
  } = useNotifications();

  return (
    <div className="v2r-notifications-page">
      {/* Header */}
      <div className="v2r-notifications-page__header">
        <div>
          <h1 className="v2r-notifications-page__title">Notification Center</h1>
          <p className="v2r-notifications-page__subtitle">
            Real-time updates on validation research, reality sprint roadmaps, and software builds.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <NotificationFilterBar
        activeCategory={categoryFilter}
        activeReadFilter={readFilter}
        searchQuery={searchQuery}
        unreadCount={unreadCount}
        onCategoryChange={setCategoryFilter}
        onReadFilterChange={setReadFilter}
        onSearchChange={setSearchQuery}
        onMarkAllRead={markAllAsRead}
        onDeleteRead={deleteReadNotifications}
      />

      {/* Error state */}
      {error && (
        <div className="v2r-widget__error">
          <span>{error}</span>
          <button className="v2r-widget__retry" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Notification List / Loading / Empty */}
      {isLoading && notifications.length === 0 ? (
        <NotificationSkeleton />
      ) : notifications.length > 0 ? (
        <div className="v2r-notifications-page__list">
          {notifications.map((item) => (
            <NotificationCard
              key={item.id}
              notification={item}
              onMarkRead={markAsRead}
              onDismiss={dismissNotification}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="v2r-pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button
                className="v2r-widget__ghost-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ← Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="v2r-widget__ghost-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <NotificationEmptyState
          category={categoryFilter}
          readFilter={readFilter}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
});
