import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hammer,
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
  Layers,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  AdminBuildRequestListItem,
  PaginatedBuildRequestsResponse,
} from '@/services/api/adminApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type SortField = 'created_at' | 'title' | 'status' | 'priority' | 'progress_percentage' | 'updated_at';
type SortOrder = 'asc' | 'desc';

function BuildStatusBadge({ status }: { status: string }) {
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
  } else if (s === 'APPROVED' || s === 'ACCEPTED') {
    className = 'v2r-admin-badge--verified';
    icon = <CheckCircle2 style={{ width: 12, height: 12 }} />;
  } else if (s === 'REJECTED' || s === 'CANCELLED') {
    className = 'v2r-admin-badge--inactive';
    icon = <XCircle style={{ width: 12, height: 12 }} />;
  } else if (s === 'SUBMITTED' || s === 'PENDING' || s === 'UNDER_REVIEW') {
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
  let barColor = '#22d3ee';
  if (progress === 100) barColor = '#34d399';
  else if (progress >= 50) barColor = '#38bdf8';

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
    <ArrowUp style={{ width: 12, height: 12, color: '#22d3ee' }} />
  ) : (
    <ArrowDown style={{ width: 12, height: 12, color: '#22d3ee' }} />
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

export function AdminBuildRequestsPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<PaginatedBuildRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listBuildRequests({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError('Failed to load Build Requests. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
    setPage(1);
  };

  const totalPages = data?.total_pages ?? 1;
  const totalRequests = data?.total ?? 0;

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

  const firstItem = data ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = data ? Math.min(page * PAGE_SIZE, totalRequests) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Hammer style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="v2r-admin-page-banner__title">Build Request Operations</h2>
            <p className="v2r-admin-page-banner__sub">
              Operational control center for full software/product development requests across Vision2Real
            </p>
          </div>
        </div>
        {!loading && data && (
          <div className="v2r-admin-page-banner__meta" style={{ borderColor: 'rgba(6, 182, 212, 0.3)', color: '#22d3ee' }}>
            <Hammer style={{ width: 13, height: 13 }} />
            <span>
              {totalRequests.toLocaleString()} build request{totalRequests !== 1 ? 's' : ''}
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
              id="build-request-search"
              className="v2r-admin-search-input"
              type="text"
              placeholder="Search project title, startup, founder…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            id="build-request-status-filter"
            className="v2r-admin-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted / Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Priority filter */}
          <select
            id="build-request-priority-filter"
            className="v2r-admin-filter-select"
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">Urgent Priority</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
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
                  Project Title <SortIcon field="title" active={sortBy} order={sortOrder} />
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
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('progress_percentage')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Progress <SortIcon field="progress_percentage" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('priority')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Priority <SortIcon field="priority" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('created_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Submitted <SortIcon field="created_at" active={sortBy} order={sortOrder} />
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
                    <div className="v2r-admin-empty__icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                      <Hammer style={{ width: 22, height: 22 }} />
                    </div>
                    <p className="v2r-admin-empty__title">No Build Requests found</p>
                    <p className="v2r-admin-empty__sub">
                      {search || statusFilter || priorityFilter
                        ? 'Try adjusting your search or filters.'
                        : 'No build requests have been submitted yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.items.map((req: AdminBuildRequestListItem) => (
                <tr
                  key={req.id}
                  onClick={() => navigate(`/admin/build-requests/${req.id}`)}
                  title={`Inspect build request ${req.project_title}`}
                >
                  {/* Title & Startup */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8125rem' }}>
                        {req.project_title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                        {req.startup_name && (
                          <span style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 600 }}>
                            {req.startup_name}
                          </span>
                        )}
                        {req.product_category && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {req.product_category}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Founder */}
                  <td>
                    {req.founder ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <UserCheck style={{ width: 13, height: 13, color: '#60a5fa', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8125rem' }}>
                            {req.founder.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                            {req.founder.email}
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
                    <BuildStatusBadge status={req.status} />
                  </td>

                  {/* Progress */}
                  <td>
                    <div>
                      <ProgressBar progress={req.progress_percentage} />
                      {req.current_phase && (
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Layers style={{ width: 10, height: 10, color: '#22d3ee' }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                            {req.current_phase}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td>
                    <span className="v2r-admin-badge v2r-admin-badge--sprint">
                      {req.priority}
                    </span>
                  </td>

                  {/* Created */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(req.created_at)}
                  </td>

                  {/* Updated */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(req.updated_at)}
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
              Showing {firstItem}–{lastItem} of {totalRequests.toLocaleString()} build requests
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
