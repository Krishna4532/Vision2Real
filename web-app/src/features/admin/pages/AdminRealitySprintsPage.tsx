import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  AdminRealitySprintListItem,
  PaginatedRealitySprintsResponse,
} from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type SortField = 'created_at' | 'title' | 'status' | 'updated_at';
type SortOrder = 'asc' | 'desc';

// ── Sub-Components ────────────────────────────────────────────────────────────

function SprintStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let className = 'v2r-admin-badge--unverified';
  let icon = <Clock style={{ width: 12, height: 12 }} />;

  if (s === 'COMPLETED') {
    className = 'v2r-admin-badge--completed';
    icon = <CheckCircle2 style={{ width: 12, height: 12 }} />;
  } else if (s === 'IN_PROGRESS') {
    className = 'v2r-admin-badge--in-progress';
    icon = <PlayCircle style={{ width: 12, height: 12 }} />;
  } else if (s === 'PAUSED') {
    className = 'v2r-admin-badge--unverified';
    icon = <PauseCircle style={{ width: 12, height: 12 }} />;
  } else if (s === 'ACCEPTED' || s === 'APPROVED') {
    className = 'v2r-admin-badge--verified';
    icon = <CheckCircle2 style={{ width: 12, height: 12 }} />;
  } else if (s === 'CANCELLED' || s === 'REJECTED') {
    className = 'v2r-admin-badge--inactive';
    icon = <XCircle style={{ width: 12, height: 12 }} />;
  } else if (s === 'SUBMITTED' || s === 'UNDER_REVIEW' || s === 'PENDING') {
    className = 'v2r-admin-badge--submitted';
    icon = <Clock style={{ width: 12, height: 12 }} />;
  }

  return (
    <span className={`v2r-admin-badge ${className}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  let barColor = '#6d5df6';
  if (progress === 100) barColor = '#34d399';
  else if (progress >= 50) barColor = '#818cf8';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '140px' }}>
      <div
        style={{
          flex: 1,
          height: '6px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%',
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', width: '32px' }}>
        {progress}%
      </span>
    </div>
  );
}

function SortIcon({ field, active, order }: { field: SortField; active: SortField; order: SortOrder }) {
  if (field !== active) return <ArrowUpDown style={{ width: 12, height: 12, opacity: 0.4 }} />;
  return order === 'asc' ? (
    <ArrowUp style={{ width: 12, height: 12, color: '#818cf8' }} />
  ) : (
    <ArrowDown style={{ width: 12, height: 12, color: '#818cf8' }} />
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} style={{ padding: '0.875rem 1rem' }}>
              <div
                className="v2r-admin-skeleton"
                style={{ height: 14, borderRadius: 4, width: j === 0 ? 180 : j === 1 ? 140 : 70 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminRealitySprintsPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<PaginatedRealitySprintsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listRealitySprints({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError('Failed to load Reality Sprints. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  // ── Debounced search ───────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  // ── Sort toggle ────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // ── Filter change ──────────────────────────────────────────────────────────
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = data?.total_pages ?? 1;
  const totalSprints = data?.total ?? 0;

  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = [];
    const delta = 1;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    if (left > 1) {
      buttons.push(
        <button key={1} className="v2r-admin-pagination__btn" onClick={() => setPage(1)}>
          1
        </button>
      );
      if (left > 2) {
        buttons.push(
          <span key="left-ellipsis" style={{ color: 'rgba(255,255,255,0.3)', padding: '0 0.25rem' }}>
            …
          </span>
        );
      }
    }

    for (let i = left; i <= right; i++) {
      buttons.push(
        <button
          key={i}
          className={`v2r-admin-pagination__btn ${i === page ? 'v2r-admin-pagination__btn--active' : ''}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    if (right < totalPages) {
      if (right < totalPages - 1) {
        buttons.push(
          <span key="right-ellipsis" style={{ color: 'rgba(255,255,255,0.3)', padding: '0 0.25rem' }}>
            …
          </span>
        );
      }
      buttons.push(
        <button key={totalPages} className="v2r-admin-pagination__btn" onClick={() => setPage(totalPages)}>
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const firstItem = data ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = data ? Math.min(page * PAGE_SIZE, totalSprints) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <Zap style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="v2r-admin-page-banner__title">Reality Sprint Operations</h2>
            <p className="v2r-admin-page-banner__sub">
              Operational control plane for all Reality Sprints across Vision2Real
            </p>
          </div>
        </div>
        {!loading && data && (
          <div className="v2r-admin-page-banner__meta">
            <Zap style={{ width: 13, height: 13 }} />
            <span>
              {totalSprints.toLocaleString()} sprint{totalSprints !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="v2r-admin-error-card">{error}</div>}

      {/* Toolbar */}
      <div className="v2r-admin-card" style={{ padding: '1rem 1.25rem' }}>
        <div className="v2r-admin-toolbar">
          {/* Search */}
          <div className="v2r-admin-search-wrapper">
            <Search className="v2r-admin-search-icon" />
            <input
              id="sprint-search"
              className="v2r-admin-search-input"
              type="text"
              placeholder="Search title, startup, founder…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            id="sprint-status-filter"
            className="v2r-admin-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted / Pending</option>
            <option value="ACCEPTED">Approved / Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Rejected / Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="v2r-admin-table-wrapper" style={{ background: '#0d0f17' }}>
        <table className="v2r-admin-table">
          <thead>
            <tr>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('title')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Sprint Title <SortIcon field="title" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th>Founder</th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('status')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Status <SortIcon field="status" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th>Progress</th>
              <th>Priority</th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('created_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Created <SortIcon field="created_at" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('updated_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Updated <SortIcon field="updated_at" active={sortBy} order={sortOrder} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="v2r-admin-empty">
                    <div className="v2r-admin-empty__icon">
                      <Zap style={{ width: 22, height: 22 }} />
                    </div>
                    <p className="v2r-admin-empty__title">No Reality Sprints found</p>
                    <p className="v2r-admin-empty__sub">
                      {search || statusFilter
                        ? 'Try adjusting your search or filter.'
                        : 'No Reality Sprints have been submitted yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.items.map((sprint: AdminRealitySprintListItem) => (
                <tr
                  key={sprint.id}
                  onClick={() => navigate(`/admin/reality-sprints/${sprint.id}`)}
                  title={`Inspect sprint ${sprint.title}`}
                >
                  {/* Title & Startup */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8125rem' }}>
                        {sprint.title}
                      </div>
                      {sprint.startup_name && (
                        <div style={{ fontSize: '0.75rem', color: '#818cf8' }}>{sprint.startup_name}</div>
                      )}
                    </div>
                  </td>

                  {/* Founder */}
                  <td>
                    {sprint.founder ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <UserCheck style={{ width: 13, height: 13, color: '#60a5fa', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8125rem' }}>
                            {sprint.founder.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                            {sprint.founder.email}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(255,255,255,0.4)' }}>
                        <UserX style={{ width: 13, height: 13, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Unassigned</span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <SprintStatusBadge status={sprint.status} />
                  </td>

                  {/* Progress */}
                  <td>
                    <ProgressBar progress={sprint.progress} />
                  </td>

                  {/* Priority */}
                  <td>
                    <span className="v2r-admin-badge v2r-admin-badge--sprint">
                      {sprint.priority}
                    </span>
                  </td>

                  {/* Created */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(sprint.created_at)}
                  </td>

                  {/* Updated */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(sprint.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="v2r-admin-card" style={{ padding: '0.875rem 1.25rem' }}>
          <div className="v2r-admin-pagination">
            <span className="v2r-admin-pagination__info">
              Showing {firstItem}–{lastItem} of {totalSprints.toLocaleString()} sprints
            </span>
            <div className="v2r-admin-pagination__controls">
              <button
                className="v2r-admin-pagination__btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              {renderPageButtons()}
              <button
                className="v2r-admin-pagination__btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
