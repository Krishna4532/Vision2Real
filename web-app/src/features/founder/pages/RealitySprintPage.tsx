/**
 * Vision2Real – Reality Sprint Founder Workspace Dashboard (Stage 5.3)
 * Production-ready dashboard displaying live metrics, searchable and paginated requests,
 * animated progress engines, mini lifecycle timelines, verified last activity, and zero mock data.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  realitySprintApi,
  type RealitySprintRequest,
  type RealitySprintAnalyticsData,
} from '@/services/api/realitySprint';
import { getStatusConfig, getPriorityBadgeConfig } from '../utils/realitySprintStatus';
import { getDisplayStartupName, formatDualDate, getLastActivity } from '../utils/sprintHelpers';
import { RealitySprintProgress } from '../components/reality-sprint/RealitySprintProgress';
import { RealitySprintMiniTimeline } from '../components/reality-sprint/RealitySprintMiniTimeline';
import { SprintDashboardSkeleton } from '../components/reality-sprint/RealitySprintSkeleton';
import './RealitySprintPage.css';

export function RealitySprintPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '20', 10);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const targetMarketFilter = searchParams.get('target_market') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

  // Component Data State
  const [requests, setRequests] = useState<RealitySprintRequest[]>([]);
  const [analytics, setAnalytics] = useState<RealitySprintAnalyticsData | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template prefill confirmation modal state
  const [confirmSprintModal, setConfirmSprintModal] = useState<RealitySprintRequest | null>(null);

  // Sync parameters helper
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

  const abortControllerRef = useRef<AbortController | null>(null);
  // Fix 6 — local search input state, debounced 400ms before syncing URL params
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external URL param → local input on navigation
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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

  // Fetch Data Routine
  const loadDashboardData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsLoading(true);
      }
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const [listRes, analyticsRes] = await Promise.all([
          realitySprintApi.listRealitySprints(
            {
              page,
              page_size: pageSize,
              search: search || undefined,
              status: statusFilter || undefined,
              priority: priorityFilter || undefined,
              target_market: targetMarketFilter || undefined,
              sort_by: sortBy,
              sort_order: sortOrder,
            },
            { signal: controller.signal }
          ),
          realitySprintApi.getAnalytics({ signal: controller.signal }),
        ]);

        setRequests(listRes.data);
        setTotalPages(listRes.pagination.total_pages);
        setTotalCount(listRes.pagination.total);
        setAnalytics(analyticsRes);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Failed to load Reality Sprint dashboard data:', err);
        setError(
          err?.response?.data?.detail ||
            'Failed to load Reality Sprint requests from server. Please check your network connection.'
        );
        toast.error('Failed to load Reality Sprint requests.');
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search, statusFilter, priorityFilter, targetMarketFilter, sortBy, sortOrder]
  );

  // Initial load & automatic refresh on focus / signal
  useEffect(() => {
    loadDashboardData();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'v2r_reality_sprints_last_updated') {
        loadDashboardData(true);
      }
    };
    const handleCacheInvalidation = (e: Event) => {
      const customEv = e as CustomEvent;
      if (!customEv.detail || customEv.detail.type === 'sprint') {
        loadDashboardData(true);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('v2r_cache_invalidation', handleCacheInvalidation);

    // Restore scroll position if returning from detail view
    const savedScrollPos = sessionStorage.getItem('v2r_sprint_scroll_pos');
    if (savedScrollPos) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
        sessionStorage.removeItem('v2r_sprint_scroll_pos');
      }, 100);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('v2r_cache_invalidation', handleCacheInvalidation);
    };
  }, [loadDashboardData]);

  // Save scroll position when navigating to detail view
  const handleCardClick = (sprintId: string) => {
    sessionStorage.setItem('v2r_sprint_scroll_pos', window.scrollY.toString());
    navigate(`/founder/reality-sprints/${sprintId}`);
  };

  // Submit Similar Sprint Confirmation Handler
  const handleConfirmSubmitSimilar = () => {
    if (!confirmSprintModal) return;

    const prefillData = {
      description: confirmSprintModal.description,
      title: confirmSprintModal.title,
      startup_name: confirmSprintModal.startup_name,
      founder_stage: confirmSprintModal.founder_stage,
      target_customer: confirmSprintModal.target_customer,
      target_market: confirmSprintModal.target_market,
    };

    sessionStorage.setItem('v2r_sprint_prefill', JSON.stringify(prefillData));
    setConfirmSprintModal(null);
    navigate('/build-product', { state: { prefillSprint: prefillData } });
  };

  const hasNoRequests = useMemo(() => {
    return !isLoading && requests.length === 0 && !search && !statusFilter;
  }, [isLoading, requests.length, search, statusFilter]);

  return (
    <div className="v2r-sprints-container">
      {/* HERO SECTION */}
      <section className="v2r-sprints-hero">
        <div>
          <h1 className="v2r-sprints-hero__title">Reality Sprint Workspace</h1>
          <p className="v2r-sprints-hero__subtitle">
            Live lifecycle tracking for every Reality Sprint request. Monitor architectural scoping, rapid prototyping velocity, and critical user journey milestones.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/build-product', { state: { journeyPath: 'reality_sprint' } })}
        >
          <span>+ New Reality Sprint</span>
        </Button>
      </section>

      {/* ANALYTICS SECTION */}
      <section>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-sm)',
          }}
        >
          AUTOMATED METRICS &amp; INSIGHTS
        </div>

        {analytics && analytics.total_requests === 0 ? (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              No Reality Sprint metrics recorded yet
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                maxWidth: '500px',
                margin: '0 auto var(--space-md)',
              }}
            >
              Submit your first Reality Sprint from Build My Product to see live velocity, completion times, and status distributions.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/build-product', { state: { journeyPath: 'reality_sprint' } })}
            >
              Start Reality Sprint
            </Button>
          </div>
        ) : (
          <div className="v2r-analytics-grid">
            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Total Requests</span>
              <span className="v2r-analytics-card__val">{analytics?.total_requests ?? 0}</span>
              <span className="v2r-analytics-card__sub">All time submitted</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Active / Pending</span>
              <span className="v2r-analytics-card__val" style={{ color: '#60a5fa' }}>
                {analytics?.pending ?? 0}
              </span>
              <span className="v2r-analytics-card__sub">In pipeline</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Under Review</span>
              <span className="v2r-analytics-card__val" style={{ color: '#fbbf24' }}>
                {analytics?.under_review ?? 0}
              </span>
              <span className="v2r-analytics-card__sub">Scoping brief</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Completed</span>
              <span className="v2r-analytics-card__val" style={{ color: '#34d399' }}>
                {analytics?.completed ?? 0}
              </span>
              <span className="v2r-analytics-card__sub">Deliverables ready</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Avg Velocity</span>
              <span className="v2r-analytics-card__val">
                {analytics?.average_completion_time !== null && analytics?.average_completion_time !== undefined
                  ? `${analytics.average_completion_time}d`
                  : '—'}
              </span>
              <span className="v2r-analytics-card__sub">Typical sprint duration</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Acceptance Rate</span>
              <span className="v2r-analytics-card__val">
                {analytics?.acceptance_rate !== null && analytics?.acceptance_rate !== undefined
                  ? `${analytics.acceptance_rate}%`
                  : '—'}
              </span>
              <span className="v2r-analytics-card__sub">Approved briefs</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Top Target Market</span>
              <span className="v2r-analytics-card__val" style={{ fontSize: 'var(--text-lg)' }}>
                {analytics?.most_requested_target_market || '—'}
              </span>
              <span className="v2r-analytics-card__sub">Most requested focus</span>
            </div>

            <div className="v2r-analytics-card">
              <span className="v2r-analytics-card__label">Top Founder Stage</span>
              <span className="v2r-analytics-card__val" style={{ fontSize: 'var(--text-lg)' }}>
                {analytics?.most_requested_founder_stage || '—'}
              </span>
              <span className="v2r-analytics-card__sub">Most frequent stage</span>
            </div>
          </div>
        )}
      </section>

      {/* CONTROLS & SEARCH BAR */}
      <section className="v2r-sprints-controls" aria-label="Search and filter reality sprints">
        <div className="v2r-sprints-controls__row">
          <div className="v2r-sprints-search-box">
            <svg
              className="v2r-sprints-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, startup name, market, description..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search Reality Sprints"
            />
          </div>

          <select
            className="v2r-sprints-filter-select"
            value={statusFilter}
            onChange={(e) => updateUrlParams({ status: e.target.value, page: 1 })}
            aria-label="Filter by sprint status"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="v2r-sprints-filter-select"
            value={priorityFilter}
            onChange={(e) => updateUrlParams({ priority: e.target.value, page: 1 })}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            className="v2r-sprints-filter-select"
            value={sortBy}
            onChange={(e) => updateUrlParams({ sort_by: e.target.value })}
            aria-label="Sort sprints by"
          >
            <option value="created_at">Sort by Date Created</option>
            <option value="updated_at">Sort by Date Updated</option>
            <option value="title">Sort by Title</option>
            <option value="status">Sort by Status</option>
            <option value="priority">Sort by Priority</option>
          </select>

          <select
            className="v2r-sprints-filter-select"
            value={sortOrder}
            onChange={(e) => updateUrlParams({ sort_order: e.target.value })}
            aria-label="Sort order"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </section>

      {/* SPRINT REQUEST LIST */}
      <section className="v2r-sprints-list" aria-label="Reality Sprint Requests">
        {isLoading ? (
          <SprintDashboardSkeleton />
        ) : error ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                color: '#f87171',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Unable to load Reality Sprints
            </div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
              Retry Connection
            </Button>
          </div>
        ) : hasNoRequests ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-3xl)',
              background: 'rgba(30, 41, 59, 0.4)',
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ fontSize: '3.2rem', marginBottom: 'var(--space-md)' }}>🚀</div>
            <h2
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Create Your First Reality Sprint
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                maxWidth: '540px',
                margin: '0 auto var(--space-xl)',
                lineHeight: '1.6',
              }}
            >
              Validate your critical user journey, prototype architecture, or MVP feature with Vision2Real before committing to full production builds.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/build-product', { state: { journeyPath: 'reality_sprint' } })}
            >
              <span>Start Reality Sprint</span>
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              background: 'rgba(30, 41, 59, 0.3)',
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>🔍</div>
            <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-xs)' }}>
              No sprints matched your search criteria
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
              Try adjusting your search terms or clearing active status filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateUrlParams({ search: null, status: null, priority: null, page: 1 })}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {requests.map((sprint) => {
              const statusCfg = getStatusConfig(sprint.status);
              const startupDisplayName = getDisplayStartupName(sprint);
              const createdDate = formatDualDate(sprint.created_at);
              const updatedDate = formatDualDate(sprint.updated_at);
              const lastAct = getLastActivity(sprint);
              const durationLabel = sprint.estimated_duration_days
                ? `${sprint.estimated_duration_days} days`
                : '—';
              const priorityCfg = getPriorityBadgeConfig(sprint.priority);

              return (
                <motion.div
                  key={sprint.id}
                  className="v2r-sprint-card"
                  tabIndex={0}
                  role="button"
                  aria-label={`View sprint ${sprint.title} for ${startupDisplayName}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  onClick={() => handleCardClick(sprint.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(sprint.id);
                    }
                  }}
                >
                  {/* Card Header: Startup, Title, Status Badge, Priority */}
                  <div className="v2r-sprint-card__header">
                    <div>
                      <div className="v2r-sprint-card__startup">{startupDisplayName}</div>
                      <h3 className="v2r-sprint-card__title">{sprint.title}</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <span className={`v2r-status-badge ${statusCfg.badgeClass}`}>
                        <span className="v2r-status-badge__dot" style={{ backgroundColor: statusCfg.dotColor }} />
                        {statusCfg.label}
                      </span>

                      <span
                        style={{
                          fontSize: 'var(--text-2xs)',
                          fontWeight: 'var(--weight-bold)',
                          padding: '0.2rem 0.55rem',
                          background: priorityCfg.bg,
                          color: priorityCfg.color,
                          borderRadius: '999px',
                          border: `1px solid ${priorityCfg.borderColor}`,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {priorityCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Brief Description */}
                  <p className="v2r-sprint-card__description">{sprint.description}</p>

                  {/* Progress & Quick Stepper (Stage 5.3) */}
                  <div className="v2r-sprint-card__tracking">
                    <RealitySprintProgress status={sprint.status} />
                    <RealitySprintMiniTimeline status={sprint.status} />
                  </div>

                  {/* Rich Metadata Grid */}
                  <div className="v2r-sprint-card__meta-grid">
                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Founder Stage</span>
                      <span className="v2r-sprint-card__meta-val">{sprint.founder_stage || 'Idea'}</span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Target Market</span>
                      <span className="v2r-sprint-card__meta-val">{sprint.target_market || 'General'}</span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Est. Duration</span>
                      <span className="v2r-sprint-card__meta-val">{durationLabel}</span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Attachments</span>
                      <span className="v2r-sprint-card__meta-val">
                        {sprint.attachments?.length ? `${sprint.attachments.length} Files` : 'None'}
                      </span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Submitted</span>
                      <span className="v2r-sprint-card__meta-val" title={createdDate.absolute}>{createdDate.relative}</span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Updated</span>
                      <span className="v2r-sprint-card__meta-val" title={updatedDate.absolute}>{updatedDate.relative}</span>
                    </div>

                    <div className="v2r-sprint-card__meta-item">
                      <span className="v2r-sprint-card__meta-label">Last Activity</span>
                      <span className="v2r-sprint-card__meta-val" title={`${lastAct.label} (${lastAct.formattedDate.combined})`}>
                        {lastAct.formattedDate.relative}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="v2r-sprint-card__actions" onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      Request ID: <span style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{sprint.id.substring(0, 13)}...</span>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmSprintModal(sprint);
                        }}
                      >
                        Submit Similar Sprint
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(sprint.id);
                        }}
                      >
                        Track Sprint →
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* PAGINATION CONTROLS */}
        {!isLoading && totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--space-lg)',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Showing {requests.length} of {totalCount} Reality Sprints
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateUrlParams({ page: page - 1 })}
              >
                Previous
              </Button>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 var(--space-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-primary)',
                }}
              >
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
          </div>
        )}
      </section>

      {/* CONFIRMATION MODAL FOR SUBMIT SIMILAR SPRINT */}
      <AnimatePresence>
        {confirmSprintModal && (
          <div className="v2r-modal-backdrop" onClick={() => setConfirmSprintModal(null)}>
            <motion.div
              className="v2r-modal-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Submit Similar Reality Sprint?
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-lg)',
                  lineHeight: '1.5',
                }}
              >
                Create another Reality Sprint using <strong>{getDisplayStartupName(confirmSprintModal)}</strong> as a prefilled template?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
                <Button variant="outline" size="sm" onClick={() => setConfirmSprintModal(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleConfirmSubmitSimilar}>
                  Continue to Form
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
