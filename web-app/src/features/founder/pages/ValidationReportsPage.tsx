import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { validationService } from '@/services/validation/validationService';
import type { ValidationListItem, ValidationListResponse } from '@/services/validation/types';
import './ValidationReportsPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveTitle(item: ValidationListItem): string {
  if (!item.idea_description) return 'Untitled Validation';
  const words = item.idea_description.trim().split(/\s+/);
  const title = words.slice(0, 7).join(' ');
  return words.length > 7 ? `${title}…` : title;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const REC_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'PROCEED': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)' },
  'PROCEED WITH CAUTION': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)' },
  'PIVOT': { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.35)' },
  'PAUSE': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  'DO NOT PROCEED': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
};

function getRecStyle(rec?: string) {
  if (!rec) return REC_COLORS['PIVOT'];
  return REC_COLORS[rec.toUpperCase()] ?? { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.35)' };
}

const STATUS_BADGES: Record<string, { label: string; color: string; animated?: boolean }> = {
  QUEUED: { label: 'Queued', color: '#64748b' },
  PROCESSING: { label: 'Processing', color: '#6366f1', animated: true },
  COMPLETED: { label: 'Completed', color: '#10b981' },
  FAILED: { label: 'Failed', color: '#ef4444' },
};

// ── Analytics Calculations ─────────────────────────────────────────────────────

interface Analytics {
  totalReports: number;
  avgScore: number | null;
  highestScore: number | null;
  proceedRate: number | null;
  avgConfidence: number | null;
  lastValidationDate: string | null;
  mostCommonRec: string | null;
  totalPdfs: number;
}

function computeAnalytics(items: ValidationListItem[]): Analytics {
  if (items.length === 0) {
    return { totalReports: 0, avgScore: null, highestScore: null, proceedRate: null, avgConfidence: null, lastValidationDate: null, mostCommonRec: null, totalPdfs: 0 };
  }
  const completed = items.filter(i => i.status === 'COMPLETED');
  const scored = completed.filter(i => i.overall_score !== undefined && i.overall_score !== null);
  const avgScore = scored.length > 0 ? scored.reduce((a, b) => a + (b.overall_score ?? 0), 0) / scored.length : null;
  const highestScore = scored.length > 0 ? Math.max(...scored.map(i => i.overall_score ?? 0)) : null;
  const proceeds = completed.filter(i => i.recommendation?.toUpperCase().includes('PROCEED') && !i.recommendation?.toUpperCase().includes('CAUTION'));
  const proceedRate = completed.length > 0 ? (proceeds.length / completed.length) * 100 : null;
  const recCounts: Record<string, number> = {};
  for (const item of completed) {
    if (item.recommendation) recCounts[item.recommendation] = (recCounts[item.recommendation] ?? 0) + 1;
  }
  const mostCommonRec = Object.entries(recCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const lastValidationDate = sorted[0]?.created_at ?? null;
  const totalPdfs = items.filter(i => i.pdf_available).length;
  return { totalReports: items.length, avgScore, highestScore, proceedRate, avgConfidence: null, lastValidationDate, mostCommonRec, totalPdfs };
}

// ── Analytics Panel ─────────────────────────────────────────────────────────────

function AnalyticsPanel({ items, loading }: { items: ValidationListItem[]; loading: boolean }) {
  const analytics = computeAnalytics(items);
  const recStyle = getRecStyle(analytics.mostCommonRec ?? undefined);

  const stats = [
    { label: 'Total Reports', value: loading ? '—' : String(analytics.totalReports) },
    { label: 'Avg Score', value: loading ? '—' : analytics.avgScore !== null ? analytics.avgScore.toFixed(1) : '—' },
    { label: 'Highest Score', value: loading ? '—' : analytics.highestScore !== null ? analytics.highestScore.toFixed(1) : '—' },
    { label: 'Proceed Rate', value: loading ? '—' : analytics.proceedRate !== null ? `${analytics.proceedRate.toFixed(0)}%` : '—' },
    { label: 'PDFs Generated', value: loading ? '—' : String(analytics.totalPdfs) },
    {
      label: 'Top Recommendation',
      value: loading ? '—' : analytics.mostCommonRec ?? '—',
      color: loading ? undefined : recStyle.color,
    },
    { label: 'Last Validated', value: loading ? '—' : analytics.lastValidationDate ? formatDate(analytics.lastValidationDate) : '—' },
  ];

  return (
    <div className="vrp-analytics">
      {stats.map(({ label, value, color }) => (
        <motion.div
          key={label}
          className="vrp-analytics-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="vrp-analytics-label">{label}</p>
          <p className="vrp-analytics-value" style={color ? { color } : undefined}>{value}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Recommendation Distribution ──────────────────────────────────────────────

function RecommendationDistribution({ items }: { items: ValidationListItem[] }) {
  const completed = items.filter(i => i.status === 'COMPLETED' && i.recommendation);
  if (completed.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const item of completed) {
    const key = item.recommendation!.toUpperCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]));

  return (
    <div className="vrp-rec-dist">
      <h3 className="vrp-rec-dist-title">Recommendation Distribution</h3>
      <div className="vrp-rec-dist-bars">
        {entries.map(([rec, count]) => {
          const style = getRecStyle(rec);
          return (
            <div key={rec} className="vrp-rec-dist-row">
              <span className="vrp-rec-dist-label" style={{ color: style.color }}>{rec}</span>
              <div className="vrp-rec-dist-track">
                <motion.div
                  className="vrp-rec-dist-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / max) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ background: style.color }}
                />
              </div>
              <span className="vrp-rec-dist-count" style={{ color: style.color }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini Score Bar ────────────────────────────────────────────────────────────

export function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="vrp-score-bar">
      <span className="vrp-score-bar-label">{label}</span>
      <div className="vrp-score-bar-track">
        <motion.div
          className="vrp-score-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="vrp-score-bar-val">{value.toFixed(1)}</span>
    </div>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────

function ReportCard({
  item,
  pinned,
  onPin,
  onViewReport,
  onDownloadPdf,
  onValidateAgain,
}: {
  item: ValidationListItem;
  pinned: boolean;
  onPin: (id: string) => void;
  onViewReport: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  onValidateAgain: (item: ValidationListItem) => void;
}) {
  const title = deriveTitle(item);
  const recStyle = getRecStyle(item.recommendation ?? undefined);
  const statusBadge = STATUS_BADGES[item.status] ?? { label: item.status, color: '#6366f1' };
  const isCompleted = item.status === 'COMPLETED';
  const isFailed = item.status === 'FAILED';
  const isProcessing = item.status === 'PROCESSING' || item.status === 'QUEUED';

  return (
    <motion.article
      className="vrp-card"
      style={{ borderLeftColor: recStyle.border }}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      tabIndex={0}
      aria-label={`Validation report: ${title}`}
    >
      {/* Card Header */}
      <div className="vrp-card-header">
        <div className="vrp-card-title-area">
          <h3 className="vrp-card-title">{title}</h3>
          <div className="vrp-card-meta-chips">
            {item.target_market && <span className="vrp-chip vrp-chip--market">{item.target_market}</span>}
            {item.founder_stage && <span className="vrp-chip vrp-chip--stage">{item.founder_stage}</span>}
          </div>
        </div>
        <div className="vrp-card-header-right">
          <button
            className={`vrp-pin-btn ${pinned ? 'vrp-pin-btn--active' : ''}`}
            onClick={() => onPin(item.id)}
            aria-label={pinned ? 'Unpin report' : 'Pin report'}
            title={pinned ? 'Unpin' : 'Pin to top'}
          >
            ⭐
          </button>
          {/* Status Badge */}
          <span
            className={`vrp-status-badge ${statusBadge.animated ? 'vrp-status-badge--pulsing' : ''}`}
            style={{ color: statusBadge.color, borderColor: `${statusBadge.color}44`, background: `${statusBadge.color}15` }}
          >
            {statusBadge.animated && <span className="vrp-status-dot" style={{ background: statusBadge.color }} />}
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Processing Indicator (Component 17) */}
      {isProcessing && (
        <div className="vrp-card-processing">
          <div className="vrp-processing-track">
            <motion.div
              className="vrp-processing-fill"
              animate={{ width: ['20%', '70%', '40%', '90%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="vrp-processing-label">Validation in progress…</p>
        </div>
      )}

      {/* Score + Recommendation */}
      {isCompleted && (
        <div className="vrp-card-scores">
          {item.overall_score !== undefined && item.overall_score !== null && (
            <div className="vrp-card-score-main">
              <span className="vrp-card-score-num">{item.overall_score.toFixed(1)}</span>
              <span className="vrp-card-score-denom">/10</span>
            </div>
          )}
          {item.recommendation && (
            <span
              className="vrp-rec-badge"
              style={{ color: recStyle.color, background: recStyle.bg, border: `1px solid ${recStyle.border}` }}
            >
              {item.recommendation}
            </span>
          )}
          <span className="vrp-engine-badge">V1</span>
        </div>
      )}

      {/* Startup Snapshot (Component 20) */}
      {item.idea_description && (
        <p className="vrp-card-idea-preview">
          {item.idea_description.slice(0, 140)}{item.idea_description.length > 140 ? '…' : ''}
        </p>
      )}

      {/* Date + PDF */}
      <div className="vrp-card-footer">
        <span className="vrp-card-date">{formatDateTime(item.created_at)}</span>
        <div className="vrp-card-indicators">
          {item.pdf_available && <span className="vrp-pdf-chip" title="PDF Available">📄 PDF</span>}
          {item.report_available && <span className="vrp-report-chip" title="Report Ready">✅ Report</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="vrp-card-actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onViewReport(item.id)}
          disabled={!isCompleted || !item.report_available}
          aria-label={`View report for ${title}`}
        >
          View Report
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownloadPdf(item.id)}
          disabled={!item.pdf_available}
          aria-label={`Download PDF for ${title}`}
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onValidateAgain(item)}
          disabled={isFailed && !item.idea_description}
          aria-label={`Validate again for ${title}`}
        >
          Validate Again
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Coming soon"
          aria-label="Compare versions — coming soon"
        >
          Compare <span className="vrp-soon-badge">Soon</span>
        </Button>
      </div>
    </motion.article>
  );
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="vrp-skeleton-card">
      <div className="vrp-skeleton vrp-skeleton--title" />
      <div className="vrp-skeleton vrp-skeleton--line" style={{ width: '60%' }} />
      <div className="vrp-skeleton vrp-skeleton--line" style={{ width: '80%' }} />
      <div className="vrp-skeleton vrp-skeleton--actions" />
    </div>
  );
}

// ── Empty State (Component 10) ────────────────────────────────────────────────

function EmptyState({ onValidate }: { onValidate: () => void }) {
  return (
    <motion.div
      className="vrp-empty"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="vrp-empty-illustration" aria-hidden="true">
        <div className="vrp-empty-orb" />
        <svg className="vrp-empty-icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" stroke="rgba(99,102,241,0.3)" strokeWidth="2" />
          <path d="M24 52V32a4 4 0 014-4h24a4 4 0 014 4v20" stroke="rgba(99,102,241,0.6)" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 28v-4a4 4 0 014-4h12a4 4 0 014 4v4" stroke="rgba(99,102,241,0.6)" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 40h12M34 46h8" stroke="rgba(165,180,252,0.8)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="54" cy="54" r="10" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
          <path d="M54 50v4l3 2" stroke="rgba(165,180,252,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="vrp-empty-headline">No validation reports yet.</h2>
      <p className="vrp-empty-desc">Validate your first startup idea and build your validation portfolio. Your reports, PDFs and validation history will appear here automatically.</p>
      <Button variant="primary" size="lg" onClick={onValidate}>
        Validate My Idea
      </Button>
      <p className="vrp-empty-hint">Your reports, PDFs, and validation history will appear here automatically.</p>
    </motion.div>
  );
}

// ── Error State (Component 25) ───────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div className="vrp-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="vrp-error-icon">⚠️</div>
      <h3 className="vrp-error-title">Couldn't load your reports.</h3>
      <p className="vrp-error-desc">{message}</p>
      <div className="vrp-error-actions">
        <Button variant="primary" onClick={onRetry}>Retry</Button>
        <a href="mailto:support@vision2real.com" className="vrp-error-support">Contact Support</a>
      </div>
    </motion.div>
  );
}

// ── Pagination (Component 11) ─────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, pageSize,
  onPage, onPageSize,
}: {
  page: number; totalPages: number; total: number; pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  if (totalPages <= 1 && total <= 10) return null;
  return (
    <div className="vrp-pagination">
      <div className="vrp-pagination-info">
        Showing <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong>
      </div>
      <div className="vrp-pagination-controls">
        <button className="vrp-page-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹ Prev</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 7) {
            if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
          }
          return (
            <button
              key={p}
              className={`vrp-page-btn vrp-page-btn--num ${p === page ? 'vrp-page-btn--active' : ''}`}
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}
        <button className="vrp-page-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">Next ›</button>
      </div>
      <div className="vrp-pagination-size">
        <label htmlFor="page-size" className="vrp-pagination-size-label">Per page:</label>
        <select id="page-size" value={pageSize} onChange={e => onPageSize(Number(e.target.value))} className="vrp-page-size-select">
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}

// ── Recently Viewed (Component 24) ────────────────────────────────────────────

const RECENTLY_VIEWED_KEY = 'v2r_recently_viewed';

function useRecentlyViewed() {
  const [recent, setRecent] = useState<Array<{ id: string; title: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    } catch { return []; }
  });

  const addRecentlyViewed = useCallback((id: string, title: string) => {
    setRecent(prev => {
      const filtered = prev.filter(r => r.id !== id);
      const next = [{ id, title }, ...filtered].slice(0, 5);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recent, addRecentlyViewed };
}

// ── Pinned Reports (Component 23) ─────────────────────────────────────────────

const PINNED_KEY = 'v2r_pinned_reports';

function usePinnedReports() {
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'));
    } catch { return new Set(); }
  });

  const togglePin = useCallback((id: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { pinned, togglePin };
}

// ── Toast (Component 16 / 25) ─────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      className={`vrp-toast vrp-toast--${type}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {message}
      <button onClick={onClose} className="vrp-toast-close" aria-label="Dismiss">×</button>
    </motion.div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────

export function ValidationReportsPage() {
  const navigate = useNavigate();

  // Data state
  const [data, setData] = useState<ValidationListResponse | null>(null);
  const [allItems, setAllItems] = useState<ValidationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (Component 9)
  // Fix 6 — searchInput is the live UI state; search is debounced and drives API calls
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'overall_score'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination (Component 11)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Features
  const { pinned, togglePin } = usePinnedReports();
  const { recent, addRecentlyViewed } = useRecentlyViewed();
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const toastId = useRef(0);
  // Fix 6 — AbortController ref for cancelling stale requests
  const fetchAbortRef = useRef<AbortController | null>(null);

  // ── Toast helper ──
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Fetch ──
  const fetchReports = useCallback(async () => {
    // Fix 6 — cancel any previous in-flight request
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await validationService.listValidations(
        {
          page,
          page_size: pageSize,
          search: search || undefined,
          recommendation: recommendation || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        { signal: controller.signal }
      );
      setData(result);
      // Accumulate all items for analytics (we collect unpaginated info from the current page)
      setAllItems(result.items);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, recommendation, sortBy, sortOrder]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Sort pinned to top
  const displayItems = data ? [...data.items].sort((a, b) => {
    if (pinned.has(a.id) && !pinned.has(b.id)) return -1;
    if (!pinned.has(a.id) && pinned.has(b.id)) return 1;
    return 0;
  }) : [];

  // ── Actions ──
  const handleViewReport = (id: string) => {
    const item = displayItems.find(i => i.id === id);
    if (item) addRecentlyViewed(id, deriveTitle(item));
    navigate(`/founder/validations/${id}`);
  };

  const handleDownloadPdf = (id: string) => {
    const url = validationService.getPDFDownloadUrl(id);
    window.open(url, '_blank');
    showToast('Opening PDF in a new tab…', 'info');
  };

  const handleValidateAgain = (item: ValidationListItem) => {
    navigate('/validate', {
      state: {
        prefill: {
          idea_description: item.idea_description,
          target_customer: item.target_customer,
          target_market: item.target_market,
          founder_stage: item.founder_stage,
        },
      },
    });
  };

  const handlePageSizeChange = (s: number) => {
    setPageSize(s);
    setPage(1);
  };

  const handleSearchChange = (v: string) => {
    // Fix 6 — update UI immediately, debounce the API-triggering search state
    setSearchInput(v);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  };

  const handleRecommendationChange = (v: string) => {
    setRecommendation(v);
    setPage(1);
  };

  return (
    <div className="vrp-page">
      {/* Toast Container */}
      <div className="vrp-toast-container" aria-live="polite">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => dismissToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* Page Header */}
      <motion.div className="vrp-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="vrp-header-text">
          <h1 className="vrp-page-title">Validation Reports</h1>
          <p className="vrp-page-subtitle">All your startup validations in one place.</p>
        </div>
        <div className="vrp-header-actions">
          <div className="vrp-export-group">
            <Button variant="outline" size="sm" onClick={() => showToast('PDF download coming soon.', 'info')} title="Export options">
              Export ↓
            </Button>
          </div>
          <Button variant="primary" onClick={() => navigate('/validate')}>
            + Validate New Idea
          </Button>
        </div>
      </motion.div>

      {/* Analytics (Component 6) */}
      <AnalyticsPanel items={allItems} loading={loading} />

      {/* Recommendation Distribution (Component 22) */}
      {!loading && allItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <RecommendationDistribution items={allItems} />
        </motion.div>
      )}

      {/* Recently Viewed Sidebar Strip (Component 24) */}
      {recent.length > 0 && (
        <div className="vrp-recently-viewed">
          <p className="vrp-rv-title">Recently Viewed</p>
          <div className="vrp-rv-chips">
            {recent.map(r => (
              <button key={r.id} className="vrp-rv-chip" onClick={() => navigate(`/founder/validations/${r.id}`)}>
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Portfolio Insights Placeholder (Component 26) */}
      <div className="vrp-ai-placeholder">
        <div className="vrp-ai-placeholder-content">
          <span className="vrp-ai-badge">AI</span>
          <div>
            <p className="vrp-ai-title">AI Portfolio Insights</p>
            <p className="vrp-ai-desc">Coming Soon — Strongest Market Opportunity, Portfolio Trends, Investor Readiness Score</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar (Component 9) */}
      <div className="vrp-toolbar">
        <div className="vrp-search-wrap">
          <svg className="vrp-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="M13.5 13.5L17 17" />
          </svg>
          <input
            className="vrp-search"
            type="search"
            placeholder="Search by idea, market…"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            aria-label="Search validations"
          />
        </div>
        <select className="vrp-filter-select" value={recommendation} onChange={e => handleRecommendationChange(e.target.value)} aria-label="Filter by recommendation">
          <option value="">All Recommendations</option>
          <option value="PROCEED">Proceed</option>
          <option value="PROCEED WITH CAUTION">Proceed with Caution</option>
          <option value="PIVOT">Pivot</option>
          <option value="PAUSE">Pause</option>
          <option value="DO NOT PROCEED">Do Not Proceed</option>
        </select>
        <select className="vrp-filter-select" value={`${sortBy}-${sortOrder}`} onChange={e => {
          const [by, order] = e.target.value.split('-');
          setSortBy(by as 'created_at' | 'overall_score');
          setSortOrder(order as 'asc' | 'desc');
          setPage(1);
        }} aria-label="Sort validations">
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="overall_score-desc">Highest Score</option>
          <option value="overall_score-asc">Lowest Score</option>
        </select>
        {loading && <span className="vrp-loading-hint">Refreshing…</span>}
      </div>

      {/* Content */}
      {error ? (
        <ErrorState message={error} onRetry={fetchReports} />
      ) : loading ? (
        <div className="vrp-cards-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayItems.length === 0 ? (
        <EmptyState onValidate={() => navigate('/validate')} />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="vrp-cards-grid">
            {displayItems.map(item => (
              <ReportCard
                key={item.id}
                item={item}
                pinned={pinned.has(item.id)}
                onPin={togglePin}
                onViewReport={handleViewReport}
                onDownloadPdf={handleDownloadPdf}
                onValidateAgain={handleValidateAgain}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination (Component 11) */}
      {data && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={handlePageSizeChange}
        />
      )}
    </div>
  );
}
