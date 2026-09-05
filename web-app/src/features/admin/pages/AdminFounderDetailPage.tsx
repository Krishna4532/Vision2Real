import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Zap,
  Hammer,
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldOff,
  BadgeCheck,
  AlertCircle,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type { FounderDetailResponse, FounderSubmissionItem, FounderActivityItem } from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
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

// ── Badge Helpers ─────────────────────────────────────────────────────────────

function submissionTypeBadge(type: string) {
  const map: Record<string, { cls: string; label: string }> = {
    REALITY_SPRINT: { cls: 'v2r-admin-badge--sprint', label: 'Sprint' },
    BUILD_REQUEST: { cls: 'v2r-admin-badge--build', label: 'Build' },
    VALIDATION: { cls: 'v2r-admin-badge--validation', label: 'Validation' },
  };
  const item = map[type] ?? { cls: 'v2r-admin-badge--local', label: type };
  return <span className={`v2r-admin-badge ${item.cls}`}>{item.label}</span>;
}

function submissionStatusBadge(status: string) {
  const s = status.toUpperCase();
  const cls =
    s === 'SUBMITTED' ? 'v2r-admin-badge--submitted'
    : s === 'IN_PROGRESS' || s === 'ACCEPTED' || s === 'REVIEW' ? 'v2r-admin-badge--in-progress'
    : s === 'COMPLETED' ? 'v2r-admin-badge--completed'
    : s === 'CANCELLED' ? 'v2r-admin-badge--cancelled'
    : 'v2r-admin-badge--local';
  return <span className={`v2r-admin-badge ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="v2r-admin-skeleton" style={{ height: 72, borderRadius: 12 }} />
      <div className="v2r-admin-detail-grid">
        <div className="v2r-admin-skeleton" style={{ height: 420, borderRadius: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="v2r-admin-skeleton" style={{ height: 220, borderRadius: 12 }} />
          <div className="v2r-admin-skeleton" style={{ height: 200, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminFounderDetailPage() {
  const { founderId } = useParams<{ founderId: string }>();
  const navigate = useNavigate();

  const [founder, setFounder] = useState<FounderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!founderId) return;

    setLoading(true);
    setError(null);

    adminApi
      .getFounderDetail(founderId)
      .then(setFounder)
      .catch(() => setError('Founder not found or access denied.'))
      .finally(() => setLoading(false));
  }, [founderId]);

  if (loading) return <DetailSkeleton />;

  if (error || !founder) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button className="v2r-admin-back-btn" onClick={() => navigate('/admin/founders')}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Founders
        </button>
        <div className="v2r-admin-error-card">
          <AlertCircle style={{ width: 24, height: 24, margin: '0 auto 0.75rem auto', display: 'block' }} />
          {error ?? 'Something went wrong.'}
        </div>
      </div>
    );
  }

  const { summary, submissions, activities } = founder;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Back + Banner */}
      <div>
        <button className="v2r-admin-back-btn" onClick={() => navigate('/admin/founders')}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Founders
        </button>
      </div>

      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <Users style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="v2r-admin-page-banner__title">{founder.full_name}</h2>
            <p className="v2r-admin-page-banner__sub">Founder Detail — Read-Only Operational View</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={`v2r-admin-badge ${founder.is_active ? 'v2r-admin-badge--active' : 'v2r-admin-badge--inactive'}`}>
            {founder.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className={`v2r-admin-badge ${founder.is_verified ? 'v2r-admin-badge--verified' : 'v2r-admin-badge--unverified'}`}>
            {founder.is_verified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="v2r-admin-detail-grid">
        {/* Left Column — Profile Card */}
        <div className="v2r-admin-profile-card">
          <div className="v2r-admin-profile-avatar">{initials(founder.full_name)}</div>
          <h3 className="v2r-admin-profile-name">{founder.full_name}</h3>
          <p className="v2r-admin-profile-email">{founder.email}</p>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className={`v2r-admin-badge ${founder.is_active ? 'v2r-admin-badge--active' : 'v2r-admin-badge--inactive'}`}>
              {founder.is_active
                ? <><ShieldCheck style={{ width: 10, height: 10 }} /> Active</>
                : <><ShieldOff style={{ width: 10, height: 10 }} /> Inactive</>}
            </span>
            <span className={`v2r-admin-badge ${founder.is_verified ? 'v2r-admin-badge--verified' : 'v2r-admin-badge--unverified'}`}>
              {founder.is_verified
                ? <><BadgeCheck style={{ width: 10, height: 10 }} /> Verified</>
                : <><AlertCircle style={{ width: 10, height: 10 }} /> Unverified</>}
            </span>
          </div>

          <div className="v2r-admin-profile-divider" />

          {/* Identity rows */}
          <div className="v2r-admin-profile-row">
            <span className="v2r-admin-profile-label">Auth Provider</span>
            <span className={`v2r-admin-badge ${founder.auth_provider === 'google' ? 'v2r-admin-badge--google' : 'v2r-admin-badge--local'}`}>
              {founder.auth_provider === 'google' ? 'Google' : 'Email / Password'}
            </span>
          </div>

          <div className="v2r-admin-profile-row">
            <span className="v2r-admin-profile-label">Role</span>
            <span className="v2r-admin-profile-value">{founder.role}</span>
          </div>

          <div className="v2r-admin-profile-row">
            <span className="v2r-admin-profile-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar style={{ width: 11, height: 11 }} /> Joined
            </span>
            <span className="v2r-admin-profile-value">{formatDate(founder.created_at)}</span>
          </div>

          <div className="v2r-admin-profile-row">
            <span className="v2r-admin-profile-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 11, height: 11 }} /> Last Login
            </span>
            {founder.last_login_at ? (
              <span className="v2r-admin-profile-value">{formatDateTime(founder.last_login_at)}</span>
            ) : (
              <span className="v2r-admin-profile-placeholder">—</span>
            )}
          </div>

          <div className="v2r-admin-profile-divider" />

          {/* Workspace Summary Stats */}
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.35)', margin: '0 0 0.625rem 0' }}>
            Workspace Summary
          </p>
          <div className="v2r-admin-summary-grid">
            <div className="v2r-admin-summary-stat">
              <div className="v2r-admin-summary-stat__num">{summary.reality_sprints_count}</div>
              <div className="v2r-admin-summary-stat__label">Sprints</div>
            </div>
            <div className="v2r-admin-summary-stat">
              <div className="v2r-admin-summary-stat__num">{summary.build_requests_count}</div>
              <div className="v2r-admin-summary-stat__label">Builds</div>
            </div>
            <div className="v2r-admin-summary-stat">
              <div className="v2r-admin-summary-stat__num">{summary.validations_count}</div>
              <div className="v2r-admin-summary-stat__label">Validations</div>
            </div>
            <div className="v2r-admin-summary-stat">
              <div className="v2r-admin-summary-stat__num">{summary.projects_count}</div>
              <div className="v2r-admin-summary-stat__label">Projects</div>
            </div>
          </div>
        </div>

        {/* Right Column — Submissions + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Submissions */}
          <div className="v2r-admin-card">
            <p className="v2r-admin-section-title">
              <Activity style={{ width: 14, height: 14, color: '#818cf8' }} />
              Recent Submissions
            </p>
            {submissions.length === 0 ? (
              <div className="v2r-admin-empty" style={{ padding: '1.5rem' }}>
                <div className="v2r-admin-empty__icon" style={{ width: 36, height: 36 }}>
                  <Zap style={{ width: 16, height: 16 }} />
                </div>
                <p className="v2r-admin-empty__title" style={{ fontSize: '0.875rem' }}>No submissions yet</p>
                <p className="v2r-admin-empty__sub">This founder has not submitted any Reality Sprints or Build Requests.</p>
              </div>
            ) : (
              <div className="v2r-admin-submission-list">
                {submissions.map((sub: FounderSubmissionItem) => (
                  <div key={sub.id} className="v2r-admin-submission-item">
                    <div className="v2r-admin-submission-item__left">
                      <div className="v2r-admin-submission-item__title">{sub.title}</div>
                      <div className="v2r-admin-submission-item__meta">
                        {formatDate(sub.created_at)}
                        {sub.priority && ` · ${sub.priority}`}
                      </div>
                    </div>
                    <div className="v2r-admin-submission-item__right">
                      {submissionTypeBadge(sub.type)}
                      {submissionStatusBadge(sub.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="v2r-admin-card">
            <p className="v2r-admin-section-title">
              <Hammer style={{ width: 14, height: 14, color: '#818cf8' }} />
              Activity Feed
            </p>
            {activities.length === 0 ? (
              <div className="v2r-admin-empty" style={{ padding: '1.5rem' }}>
                <div className="v2r-admin-empty__icon" style={{ width: 36, height: 36 }}>
                  <Activity style={{ width: 16, height: 16 }} />
                </div>
                <p className="v2r-admin-empty__title" style={{ fontSize: '0.875rem' }}>No activity recorded</p>
                <p className="v2r-admin-empty__sub">Build Request timeline events will appear here.</p>
              </div>
            ) : (
              <div className="v2r-admin-activity-list">
                {activities.map((ev: FounderActivityItem) => (
                  <div key={ev.id} className="v2r-admin-activity-item">
                    <div className="v2r-admin-activity-dot" />
                    <div className="v2r-admin-activity-item__body">
                      <div className="v2r-admin-activity-item__title">{ev.title}</div>
                      {ev.description && (
                        <div className="v2r-admin-activity-item__desc">{ev.description}</div>
                      )}
                      <div className="v2r-admin-activity-item__time">{timeAgo(ev.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
