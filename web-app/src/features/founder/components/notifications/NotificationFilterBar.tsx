/**
 * Vision2Real – NotificationFilterBar (Stage 6.4)
 * Category tabs, read/unread filters, 300ms debounced search, and Mark All Read control.
 */

import { memo, useState, useEffect } from 'react';

interface NotificationFilterBarProps {
  activeCategory: string;
  activeReadFilter: string;
  searchQuery: string;
  unreadCount: number;
  onCategoryChange: (category: string) => void;
  onReadFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onMarkAllRead: () => void;
  onDeleteRead?: () => void;
}

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'VALIDATION', label: 'Validation' },
  { id: 'REALITY_SPRINT', label: 'Reality Sprint' },
  { id: 'BUILD_REQUEST', label: 'Build My Product' },
  { id: 'SYSTEM', label: 'System' },
];

export const NotificationFilterBar = memo(function NotificationFilterBar({
  activeCategory,
  activeReadFilter,
  searchQuery,
  unreadCount,
  onCategoryChange,
  onReadFilterChange,
  onSearchChange,
  onMarkAllRead,
  onDeleteRead,
}: NotificationFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // 300ms Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, onSearchChange]);

  return (
    <div className="v2r-notification-filter-bar">
      {/* Category Tabs */}
      <nav className="v2r-notification-filter-bar__tabs" aria-label="Filter notifications by category">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`v2r-notification-filter-bar__tab ${activeCategory === tab.id ? 'v2r-notification-filter-bar__tab--active' : ''}`}
            onClick={() => onCategoryChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="v2r-notification-filter-bar__controls">
        {/* Search input */}
        <div className="v2r-notification-filter-bar__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search alerts…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>

        {/* Read / Unread pills */}
        <div className="v2r-notification-filter-bar__pills">
          <button
            className={`v2r-notification-filter-bar__pill ${activeReadFilter === 'ALL' ? 'v2r-notification-filter-bar__pill--active' : ''}`}
            onClick={() => onReadFilterChange('ALL')}
          >
            All
          </button>
          <button
            className={`v2r-notification-filter-bar__pill ${activeReadFilter === 'UNREAD' ? 'v2r-notification-filter-bar__pill--active' : ''}`}
            onClick={() => onReadFilterChange('UNREAD')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Bulk Mark All Read & Clear Read */}
        {unreadCount > 0 && (
          <button className="v2r-notification-filter-bar__mark-all-btn" onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
        {onDeleteRead && (
          <button
            className="v2r-notification-filter-bar__mark-all-btn"
            style={{ color: '#ef4444', marginLeft: 4 }}
            onClick={onDeleteRead}
            title="Clear all read notifications"
          >
            Clear Read
          </button>
        )}
      </div>
    </div>
  );
});
