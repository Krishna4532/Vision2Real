import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Brain,
  UserCheck,
  UserX,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  AdminValidationListItem,
  PaginatedValidationsResponse,
} from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

type SortField = 'created_at' | 'overall_score';
type SortOrder = 'asc' | 'desc';

// ── Sub-Components ────────────────────────────────────────────────────────────

function ValidationStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let className = 'v2r-admin-badge--unverified';
  if (s === 'COMPLETED') className = 'v2r-admin-badge--completed';
  else if (s === 'PROCESSING') className = 'v2r-admin-badge--in-progress';
  else if (s === 'FAILED') className = 'v2r-admin-badge--inactive';
  else if (s === 'QUEUED') className = 'v2r-admin-badge--submitted';

  return <span className={`v2r-admin-badge ${className}`}>{status}</span>;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem' }}>—</span>;
  }

  let color = '#34d399'; // green for high score
  if (score < 50) color = '#f87171'; // red
  else if (score < 75) color = '#fbbf24'; // yellow

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontWeight: 700,
        fontSize: '0.8125rem',
        color,
      }}
    >
      {score.toFixed(0)} <span style={{ fontSize: '0.6875rem', opacity: 0.5 }}>/100</span>
    </span>
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
                style={{ height: 14, borderRadius: 4, width: j === 1 ? 160 : j === 2 ? 200 : 70 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminValidationsPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<PaginatedValidationsResponse | null>(null);
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
  const fetchValidations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listValidations({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError('Failed to load validations. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchValidations();
  }, [fetchValidations]);

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
  const totalValidations = data?.total ?? 0;

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
  const lastItem = data ? Math.min(page * PAGE_SIZE, totalValidations) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <FileCheck style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="v2r-admin-page-banner__title">Validation Control Center</h2>
            <p className="v2r-admin-page-banner__sub">
              Operational view of all AI idea validations generated across Vision2Real
            </p>
          </div>
        </div>
        {!loading && data && (
          <div className="v2r-admin-page-banner__meta">
            <FileCheck style={{ width: 13, height: 13 }} />
            <span>
              {totalValidations.toLocaleString()} validation{totalValidations !== 1 ? 's' : ''}
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
              id="validation-search"
              className="v2r-admin-search-input"
              type="text"
              placeholder="Search by idea description…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            id="validation-status-filter"
            className="v2r-admin-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="v2r-admin-table-wrapper" style={{ background: '#0d0f17' }}>
        <table className="v2r-admin-table">
          <thead>
            <tr>
              <th>Validation ID</th>
              <th>Founder</th>
              <th>Idea Snippet</th>
              <th>Status</th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('overall_score')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Score <SortIcon field="overall_score" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th>AI Model</th>
              <th>Latency</th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('created_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Created <SortIcon field="created_at" active={sortBy} order={sortOrder} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="v2r-admin-empty">
                    <div className="v2r-admin-empty__icon">
                      <FileCheck style={{ width: 22, height: 22 }} />
                    </div>
                    <p className="v2r-admin-empty__title">No validations found</p>
                    <p className="v2r-admin-empty__sub">
                      {search || statusFilter
                        ? 'Try adjusting your search or filter.'
                        : 'No AI validations have been run yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.items.map((val: AdminValidationListItem) => (
                <tr
                  key={val.id}
                  onClick={() => navigate(`/admin/validations/${val.id}`)}
                  title={`Inspect validation ${val.id}`}
                >
                  {/* Validation ID */}
                  <td>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.75rem',
                        color: '#818cf8',
                        background: 'rgba(109, 93, 246, 0.1)',
                        padding: '0.15rem 0.375rem',
                        borderRadius: '0.25rem',
                      }}
                    >
                      {truncateId(val.id)}
                    </code>
                  </td>

                  {/* Founder */}
                  <td>
                    {val.founder ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <UserCheck style={{ width: 13, height: 13, color: '#60a5fa', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8125rem' }}>
                            {val.founder.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                            {val.founder.email}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(255,255,255,0.4)' }}>
                        <UserX style={{ width: 13, height: 13, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Guest Session</span>
                      </div>
                    )}
                  </td>

                  {/* Idea Snippet */}
                  <td>
                    <div
                      style={{
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {val.idea_snippet || '—'}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <ValidationStatusBadge status={val.status} />
                  </td>

                  {/* Score */}
                  <td>
                    <ScoreBadge score={val.overall_score} />
                  </td>

                  {/* AI Model */}
                  <td>
                    {val.llm_model ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        <Brain style={{ width: 12, height: 12, color: '#a78bfa' }} />
                        {val.llm_model}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>

                  {/* Latency */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {val.processing_time_ms
                      ? `${(val.processing_time_ms / 1000).toFixed(1)}s`
                      : '—'}
                  </td>

                  {/* Created */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(val.created_at)}
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
              Showing {firstItem}–{lastItem} of {totalValidations.toLocaleString()} validations
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
