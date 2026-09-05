import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type { FounderListItem, PaginatedFoundersResponse } from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

type SortField = 'created_at' | 'full_name' | 'last_login_at';
type SortOrder = 'asc' | 'desc';

// ── Sub-Components ────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`v2r-admin-badge ${isActive ? 'v2r-admin-badge--active' : 'v2r-admin-badge--inactive'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <span className={`v2r-admin-badge ${isVerified ? 'v2r-admin-badge--verified' : 'v2r-admin-badge--unverified'}`}>
      {isVerified ? 'Verified' : 'Unverified'}
    </span>
  );
}

function AuthProviderBadge({ provider }: { provider: string }) {
  const isGoogle = provider === 'google';
  return (
    <span className={`v2r-admin-badge ${isGoogle ? 'v2r-admin-badge--google' : 'v2r-admin-badge--local'}`}>
      {isGoogle ? 'Google' : 'Email'}
    </span>
  );
}

function SortIcon({ field, active, order }: { field: SortField; active: SortField; order: SortOrder }) {
  if (field !== active) return <ArrowUpDown style={{ width: 12, height: 12, opacity: 0.4 }} />;
  return order === 'asc'
    ? <ArrowUp style={{ width: 12, height: 12, color: '#818cf8' }} />
    : <ArrowDown style={{ width: 12, height: 12, color: '#818cf8' }} />;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} style={{ padding: '0.875rem 1rem' }}>
              <div className="v2r-admin-skeleton" style={{ height: 14, borderRadius: 4, width: j === 0 ? 140 : 60 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminFoundersPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<PaginatedFoundersResponse | null>(null);
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
  const fetchFounders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listFounders({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError('Failed to load founders. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchFounders();
  }, [fetchFounders]);

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
  const totalFounders = data?.total ?? 0;

  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = [];
    const delta = 1;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    if (left > 1) {
      buttons.push(
        <button key={1} className="v2r-admin-pagination__btn" onClick={() => setPage(1)}>1</button>
      );
      if (left > 2) {
        buttons.push(<span key="left-ellipsis" style={{ color: 'rgba(255,255,255,0.3)', padding: '0 0.25rem' }}>…</span>);
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
        buttons.push(<span key="right-ellipsis" style={{ color: 'rgba(255,255,255,0.3)', padding: '0 0.25rem' }}>…</span>);
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
  const lastItem = data ? Math.min(page * PAGE_SIZE, totalFounders) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <Users style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="v2r-admin-page-banner__title">Founder Directory</h2>
            <p className="v2r-admin-page-banner__sub">
              Operational view of all registered founders across Vision2Real
            </p>
          </div>
        </div>
        {!loading && data && (
          <div className="v2r-admin-page-banner__meta">
            <Users style={{ width: 13, height: 13 }} />
            <span>{totalFounders.toLocaleString()} founder{totalFounders !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="v2r-admin-error-card">{error}</div>
      )}

      {/* Toolbar */}
      <div className="v2r-admin-card" style={{ padding: '1rem 1.25rem' }}>
        <div className="v2r-admin-toolbar">
          {/* Search */}
          <div className="v2r-admin-search-wrapper">
            <Search className="v2r-admin-search-icon" />
            <input
              id="founder-search"
              className="v2r-admin-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            id="founder-status-filter"
            className="v2r-admin-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Founders</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
                onClick={() => handleSort('full_name')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                Founder <SortIcon field="full_name" active={sortBy} order={sortOrder} />
              </th>
              <th>Status</th>
              <th>Verified</th>
              <th>Auth</th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('created_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Joined <SortIcon field="created_at" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th
                className="sortable"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('last_login_at')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Last Login <SortIcon field="last_login_at" active={sortBy} order={sortOrder} />
                </span>
              </th>
              <th>Submissions</th>
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
                      <Users style={{ width: 22, height: 22 }} />
                    </div>
                    <p className="v2r-admin-empty__title">No founders found</p>
                    <p className="v2r-admin-empty__sub">
                      {search || statusFilter
                        ? 'Try adjusting your search or filter.'
                        : 'No founders are registered yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.items.map((founder: FounderListItem) => (
                <tr
                  key={founder.id}
                  onClick={() => navigate(`/admin/founders/${founder.id}`)}
                  title={`View ${founder.full_name}`}
                >
                  {/* Founder identity */}
                  <td>
                    <div className="v2r-admin-founder-cell">
                      <div className="v2r-admin-founder-avatar">{initials(founder.full_name)}</div>
                      <div>
                        <div className="v2r-admin-founder-name">{founder.full_name}</div>
                        <div className="v2r-admin-founder-email">{founder.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Account status */}
                  <td><StatusBadge isActive={founder.is_active} /></td>

                  {/* Verified */}
                  <td><VerifiedBadge isVerified={founder.is_verified} /></td>

                  {/* Auth provider */}
                  <td><AuthProviderBadge provider={founder.auth_provider} /></td>

                  {/* Joined */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {formatDate(founder.created_at)}
                  </td>

                  {/* Last login */}
                  <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {founder.last_login_at ? formatDate(founder.last_login_at) : '—'}
                  </td>

                  {/* Submission counts */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span className="v2r-admin-count-pill">
                        {founder.reality_sprints_count} Sprint{founder.reality_sprints_count !== 1 ? 's' : ''}
                      </span>
                      <span className="v2r-admin-count-pill">
                        {founder.build_requests_count} Build{founder.build_requests_count !== 1 ? 's' : ''}
                      </span>
                    </div>
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
              Showing {firstItem}–{lastItem} of {totalFounders.toLocaleString()} founders
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
