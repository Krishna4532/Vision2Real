/**
 * Vision2Real – Founder Workspace Build Requests Dashboard (Stage 6.2 UX Polish)
 * Production-hardened dashboard with smart refresh listeners, shared status configuration,
 * Linear/GitHub style cards, 3-step workflow onboarding empty state, and full accessibility.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  buildRequestApi,
  type BuildRequestListItem,
  type BuildRequestAnalytics,
} from '@/services/api/buildRequest';
import {
  getStatusConfig,
  getPriorityConfig,
  getRelativeTime,
} from '../utils/buildRequestStatus';
import './BuildRequestsPage.css';

export function BuildRequestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '20', 10);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const categoryFilter = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

  // Component States
  const [requests, setRequests] = useState<BuildRequestListItem[]>([]);
  const [analytics, setAnalytics] = useState<BuildRequestAnalytics | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const abortControllerRef = useRef<AbortController | null>(null);
  // Fix 6 — local search input state, debounced 400ms before syncing URL params
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external URL search param → local input when navigating back
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Sync URL Params helper
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newParams).forEach(([key, value]) => {
          if (value === null || value === '' || value === undefined) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });
        return next;
      });
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        updateUrlParams({ search: value, page: 1 });
      }, 400);
    },
    [updateUrlParams]
  );

  // Core Data Fetcher
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const [listRes, analyticsRes] = await Promise.all([
          buildRequestApi.listBuildRequests(
            {
              page,
              page_size: pageSize,
              search: search || undefined,
              status: statusFilter || undefined,
              priority: priorityFilter || undefined,
              product_category: categoryFilter || undefined,
              sort_by: sortBy,
              sort_order: sortOrder,
            },
            { signal: controller.signal }
          ),
          buildRequestApi.getAnalytics({ signal: controller.signal }),
        ]);

        setRequests(listRes.data);
        setTotalCount(listRes.pagination.total);
        setTotalPages(listRes.pagination.total_pages);
        setAnalytics(analyticsRes);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        console.error('Failed to load build requests dashboard data:', err);
        setError(err?.response?.data?.detail || err?.message || 'Failed to load Build Requests from server.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, pageSize, search, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder]
  );

  // Initial Fetch on parameter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SMART REFRESH LISTENERS (Component 1) - Replaces constant timer polling
  useEffect(() => {
    const handleFocus = () => {
      fetchData(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'v2r_build_requests_last_updated') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchData]);

  const totalUnread = useMemo(
    () => requests.reduce((acc, curr) => acc + (curr.founder_unread_count || 0), 0),
    [requests]
  );

  return (
    <main className="v2r-build-requests-page" aria-label="Founder Workspace Build Requests">
      {/* HERO HEADER */}
      <header className="v2r-build-page-header">
        <div>
          <span className="v2r-build-page-header__eyebrow">FOUNDER WORKSPACE</span>
          <h1 className="v2r-build-page-header__title">Build Requests</h1>
          <p className="v2r-build-page-header__subtitle">
            Track full-stack software development deliverables, delivery phases, and production codebases in real-time.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => navigate('/build-product')}>
          <span>+ Start Build My Product</span>
        </Button>
      </header>

      {/* ANALYTICS METRICS CARDS (Component 5) */}
      <section className="v2r-build-analytics-grid" aria-label="Dashboard Metrics Overview">
        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Total Projects</div>
          <div className="v2r-analytics-card__value">
            {analytics?.total_requests !== undefined ? analytics.total_requests : '—'}
          </div>
          <div className="v2r-analytics-card__subtext">Submitted Build Requests</div>
        </div>

        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Active Projects</div>
          <div className="v2r-analytics-card__value" style={{ color: 'var(--color-accent, #6366f1)' }}>
            {analytics?.active_requests !== undefined ? analytics.active_requests : '—'}
          </div>
          <div className="v2r-analytics-card__subtext">In Development &amp; QA</div>
        </div>

        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Completed Projects</div>
          <div className="v2r-analytics-card__value" style={{ color: '#10b981' }}>
            {analytics?.completed_requests !== undefined ? analytics.completed_requests : '—'}
          </div>
          <div className="v2r-analytics-card__subtext">Delivered &amp; Deployed</div>
        </div>

        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Average Progress</div>
          <div className="v2r-analytics-card__value">
            {analytics?.average_progress !== undefined ? `${analytics.average_progress}%` : '—'}
          </div>
          <div className="v2r-analytics-card__subtext">Across All Active Work</div>
        </div>

        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Unread Messages</div>
          <div className="v2r-analytics-card__value" style={{ color: totalUnread > 0 ? '#fbbf24' : 'inherit' }}>
            {totalUnread}
          </div>
          <div className="v2r-analytics-card__subtext">Engineering Team Responses</div>
        </div>

        <div className="v2r-analytics-card">
          <div className="v2r-analytics-card__label">Latest Activity</div>
          <div className="v2r-analytics-card__value" style={{ fontSize: 'var(--text-md)', marginTop: '4px' }}>
            {analytics?.latest_request ? getRelativeTime(analytics.latest_request) : '—'}
          </div>
          <div className="v2r-analytics-card__subtext">Last Request Update</div>
        </div>
      </section>

      {/* CONTROLS & FILTERING TOOLBAR */}
      <section className="v2r-build-controls-toolbar" aria-label="Build Request Filters & Search">
        <div className="v2r-build-controls-toolbar__search">
          <svg
            className="v2r-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="v2r-search-input"
            placeholder="Search by title, startup, description, category..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search Build Requests"
          />
        </div>

        <div className="v2r-build-controls-toolbar__filters">
          {/* Status Filter */}
          <select
            className="v2r-filter-select"
            value={statusFilter}
            onChange={(e) => updateUrlParams({ status: e.target.value, page: 1 })}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PLANNING">Planning</option>
            <option value="UI_DESIGN">UI Design</option>
            <option value="BACKEND">Backend Dev</option>
            <option value="FRONTEND">Frontend Dev</option>
            <option value="TESTING">Testing &amp; QA</option>
            <option value="DEPLOYMENT">Deployment</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            className="v2r-filter-select"
            value={priorityFilter}
            onChange={(e) => updateUrlParams({ priority: e.target.value, page: 1 })}
            aria-label="Filter by Priority"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Sort By */}
          <select
            className="v2r-filter-select"
            value={sortBy}
            onChange={(e) => updateUrlParams({ sort_by: e.target.value })}
            aria-label="Sort Field"
          >
            <option value="created_at">Date Created</option>
            <option value="updated_at">Last Updated</option>
            <option value="title">Project Title</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="progress_percentage">Progress %</option>
          </select>

          {/* Sort Order */}
          <select
            className="v2r-filter-select"
            value={sortOrder}
            onChange={(e) => updateUrlParams({ sort_order: e.target.value })}
            aria-label="Sort Order"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          {/* Manual Smart Refresh Button */}
          <button
            type="button"
            className="v2r-refresh-btn"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            aria-label="Refresh Data"
            title={`Last updated ${lastRefreshedAt.toLocaleTimeString()}`}
          >
            <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </section>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            color: '#f87171',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          role="alert"
        >
          <span>⚠️ {error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            Retry
          </Button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {isLoading ? (
        <div className="v2r-build-cards-grid" aria-label="Loading build requests">
          {[1, 2, 3].map((n) => (
            <div key={n} className="v2r-build-card v2r-skeleton-pulse" style={{ height: '260px' }}>
              <div style={{ height: '18px', width: '35%', borderRadius: '4px', marginBottom: '12px' }} />
              <div style={{ height: '24px', width: '75%', borderRadius: '4px', marginBottom: '16px' }} />
              <div style={{ height: '14px', width: '100%', borderRadius: '4px', marginBottom: '12px' }} />
              <div style={{ height: '40px', width: '100%', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        /* PRODUCTION ONBOARDING EMPTY STATE (Component 6) */
        <section className="v2r-build-empty-state" aria-label="No requests onboarding workflow">
          <div className="v2r-build-empty-state__icon">⚙️</div>
          <h2 className="v2r-build-empty-state__title">No Build Requests Found</h2>
          <p className="v2r-build-empty-state__subtitle">
            {search || statusFilter || priorityFilter
              ? 'No software build requests match your current search or filter criteria.'
              : 'Submit your software vision to Vision2Real. Our team plans, designs, builds, and deploys production-grade code bases.'}
          </p>

          {!search && !statusFilter && !priorityFilter && (
            <div className="v2r-workflow-steps">
              <div className="v2r-workflow-step-card">
                <div className="v2r-workflow-step-card__num">1</div>
                <div className="v2r-workflow-step-card__title">Create Request</div>
                <div className="v2r-workflow-step-card__desc">Define your product brief, budget context, and upload specs.</div>
              </div>

              <div className="v2r-workflow-step-card">
                <div className="v2r-workflow-step-card__num">2</div>
                <div className="v2r-workflow-step-card__title">Track Progress</div>
                <div className="v2r-workflow-step-card__desc">Monitor real-time delivery phases, milestones, and dev work.</div>
              </div>

              <div className="v2r-workflow-step-card">
                <div className="v2r-workflow-step-card__num">3</div>
                <div className="v2r-workflow-step-card__title">Receive Product</div>
                <div className="v2r-workflow-step-card__desc">Receive production code, architecture blueprints, and cloud hosting.</div>
              </div>
            </div>
          )}

          <Button variant="primary" size="lg" onClick={() => navigate('/build-product')}>
            <span>+ Start Build My Product</span>
          </Button>
        </section>
      ) : (
        /* CARDS GRID — Linear / GitHub Projects Style (Component 4) */
        <div className="v2r-build-cards-grid">
          {requests.map((req) => {
            const statusConfig = getStatusConfig(req.status);
            const priorityConfig = getPriorityConfig(req.priority);

            return (
              <article
                key={req.id}
                className="v2r-build-card"
                tabIndex={0}
                onClick={() => navigate(`/founder/build-requests/${req.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/founder/build-requests/${req.id}`);
                  }
                }}
                aria-label={`Build Request: ${req.title}`}
              >
                <div className="v2r-build-card__top">
                  <div className="v2r-build-card__header">
                    <span className="v2r-build-card__startup">{req.startup_name || 'Vision2Real Project'}</span>
                    {req.founder_unread_count > 0 && (
                      <span className="v2r-badge" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
                        💬 {req.founder_unread_count} New
                      </span>
                    )}
                  </div>

                  <h3 className="v2r-build-card__title">{req.title}</h3>

                  <div className="v2r-build-card__badges">
                    <span
                      className="v2r-badge"
                      style={{
                        background: statusConfig.bgStyle,
                        color: statusConfig.textStyle,
                        border: `1px solid ${statusConfig.borderStyle}`,
                      }}
                    >
                      <span>{statusConfig.icon}</span> {statusConfig.label}
                    </span>

                    <span
                      className="v2r-badge"
                      style={{
                        background: priorityConfig.bgStyle,
                        color: priorityConfig.textStyle,
                      }}
                    >
                      {priorityConfig.label} PRIORITY
                    </span>

                    {req.product_category && (
                      <span className="v2r-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}>
                        {req.product_category}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar with Accessibility */}
                  <div className="v2r-build-card__progress-container">
                    <div className="v2r-build-card__progress-header">
                      <span>Development Progress</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent, #6366f1)' }}>
                        {req.progress_percentage}%
                      </span>
                    </div>
                    <div
                      className="v2r-build-card__progress-track"
                      role="progressbar"
                      aria-valuenow={req.progress_percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="v2r-build-card__progress-fill"
                        style={{ width: `${Math.min(100, Math.max(0, req.progress_percentage))}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Working Phase */}
                  {(req.current_phase || req.current_milestone) && (
                    <div className="v2r-build-card__phase-info">
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>
                        CURRENT PHASE &amp; MILESTONE
                      </span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
                        {req.current_phase || statusConfig.label} {req.current_milestone ? `• ${req.current_milestone}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Meta Footer */}
                <div className="v2r-build-card__meta-footer">
                  <span>Created {new Date(req.created_at).toLocaleDateString()}</span>
                  <span>Updated {getRelativeTime(req.updated_at)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <nav className="v2r-pagination-bar" aria-label="Pagination Navigation">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} requests
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateUrlParams({ page: page - 1 })}
            >
              Previous
            </Button>
            <span style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)' }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateUrlParams({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </main>
  );
}
