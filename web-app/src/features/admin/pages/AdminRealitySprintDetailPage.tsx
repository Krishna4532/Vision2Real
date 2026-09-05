import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  UserCheck,
  UserX,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  FileText,
  Target,
  Compass,
  Save,
  AlertTriangle,
  Sliders,
  CheckSquare,
  Square,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Calendar,
  Layers,
  Paperclip,
  ShieldCheck,
  Award,
  Download,
  Image,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  AdminRealitySprintDetailResponse,
  RealitySprintMilestoneItem,
} from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SprintStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let className = 'v2r-admin-badge--unverified';
  let icon = <Clock style={{ width: 12, height: 12 }} />;

  if (s === 'COMPLETED') {
    className = 'v2r-admin-badge--completed';
    icon = <CheckCircle2 style={{ width: 12, height: 12 }} />;
  } else if (s === 'IN_PROGRESS') {
    className = 'v2r-admin-badge--in-progress';
    icon = <Play style={{ width: 12, height: 12 }} />;
  } else if (s === 'PAUSED') {
    className = 'v2r-admin-badge--unverified';
    icon = <Pause style={{ width: 12, height: 12 }} />;
  } else if (s === 'ACCEPTED' || s === 'APPROVED') {
    className = 'v2r-admin-badge--verified';
    icon = <CheckCircle2 style={{ width: 12, height: 12 }} />;
  } else if (s === 'CANCELLED' || s === 'REJECTED') {
    className = 'v2r-admin-badge--inactive';
    icon = <XCircle style={{ width: 12, height: 12 }} />;
  }

  return (
    <span className={`v2r-admin-badge ${className}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
}

function getFileIcon(mimeType: string, style?: React.CSSProperties) {
  const s = { width: 16, height: 16, ...style };
  if (mimeType.startsWith('image/')) return <Image style={s} />;
  if (mimeType === 'application/pdf') return <FileText style={s} />;
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip') ||
    mimeType.includes('rar')
  )
    return <FileText style={s} />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('xml') ||
    mimeType.includes('text/plain')
  )
    return <FileCode style={s} />;
  return <Paperclip style={s} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminRealitySprintDetailPage() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminRealitySprintDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Local state for progress editing
  const [progressValue, setProgressValue] = useState<number>(0);
  const [milestones, setMilestones] = useState<RealitySprintMilestoneItem[]>([]);
  const [progressDirty, setProgressDirty] = useState(false);

  // Confirmation Modals State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRealitySprintDetail(sprintId);
      setData(res);
      setProgressValue(res.progress);
      setMilestones(res.milestones);
      setProgressDirty(false);
    } catch {
      setError('Failed to load Reality Sprint details. The sprint may not exist.');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Action Handlers ────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.approveRealitySprint(sprintId);
      setData(res);
      setShowApproveModal(false);
    } catch {
      alert('Failed to approve Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.rejectRealitySprint(sprintId, rejectReason);
      setData(res);
      setShowRejectModal(false);
      setRejectReason('');
    } catch {
      alert('Failed to reject Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.startRealitySprint(sprintId);
      setData(res);
      setProgressValue(res.progress);
      setMilestones(res.milestones);
    } catch {
      alert('Failed to start Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.pauseRealitySprint(sprintId);
      setData(res);
    } catch {
      alert('Failed to pause Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.resumeRealitySprint(sprintId);
      setData(res);
    } catch {
      alert('Failed to resume Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.updateRealitySprintProgress(sprintId, progressValue, milestones);
      setData(res);
      setProgressDirty(false);
    } catch {
      alert('Failed to save progress.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!sprintId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.completeRealitySprint(sprintId);
      setData(res);
      setProgressValue(100);
      setMilestones(res.milestones);
      setShowCompleteModal(false);
      setProgressDirty(false);
    } catch {
      alert('Failed to complete Reality Sprint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    if (!sprintId) return;
    setDownloadingId(attachmentId);
    try {
      const blob = await adminApi.downloadRealitySprintAttachment(sprintId, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download attachment. The file may no longer be available.');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleMilestone = (id: string) => {
    const updated = milestones.map((m) => {
      if (m.id === id) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null,
        };
      }
      return m;
    });
    setMilestones(updated);

    // Synchronize progress value based on completed milestones
    if (updated.length > 0) {
      const completedCount = updated.filter((m) => m.completed).length;
      const calcProgress = Math.round((completedCount / updated.length) * 100);
      setProgressValue(calcProgress);
    }
    setProgressDirty(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="v2r-admin-skeleton" style={{ height: 32, width: 140, borderRadius: 6 }} />
        <div className="v2r-admin-skeleton" style={{ height: 72, borderRadius: 12 }} />
        <div className="v2r-admin-detail-grid">
          <div className="v2r-admin-skeleton" style={{ height: 400, borderRadius: 12 }} />
          <div className="v2r-admin-skeleton" style={{ height: 400, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <button onClick={() => navigate('/admin/reality-sprints')} className="v2r-admin-back-btn">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Reality Sprints
        </button>
        <div className="v2r-admin-error-card">{error || 'Reality Sprint not found'}</div>
      </div>
    );
  }

  const extra = data.extra_metadata || {};
  const s = data.status.toUpperCase();
  const isPending = s === 'SUBMITTED' || s === 'UNDER_REVIEW' || s === 'PENDING' || s === 'DRAFT';
  const isApproved = s === 'ACCEPTED' || s === 'APPROVED' || s === 'SCHEDULED';
  const isInProgress = s === 'IN_PROGRESS';
  const isPaused = s === 'PAUSED';
  const isFinished = s === 'COMPLETED' || s === 'CANCELLED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Back Button */}
      <div>
        <button onClick={() => navigate('/admin/reality-sprints')} className="v2r-admin-back-btn">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Reality Sprints
        </button>
      </div>

      {/* Page Header Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <Zap style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 className="v2r-admin-page-banner__title">{data.title}</h2>
              <code
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.75rem',
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                {data.id}
              </code>
              <SprintStatusBadge status={data.status} />
            </div>
            <p className="v2r-admin-page-banner__sub">
              {data.startup_name && <strong style={{ color: '#ffffff' }}>{data.startup_name} • </strong>}
              Created: {formatDate(data.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: FOUNDER SUBMISSION DOSSIER (100% Complete Display) */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <ShieldCheck style={{ width: 18, height: 18, color: '#fbbf24' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Founder Submission Dossier (Original Input Data)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Group 1: Founder Information */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <UserCheck style={{ width: 14, height: 14 }} /> Founder Information
            </h3>
            {data.founder ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Name: </span>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>{data.founder.full_name}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Email: </span>
                  <a href={`mailto:${data.founder.email}`} style={{ color: '#fbbf24', textDecoration: 'none' }}>
                    <Mail style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {data.founder.email}
                  </a>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Phone: </span>
                  <span style={{ color: data.founder.phone_number ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                    <Phone style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {data.founder.phone_number || '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Founder Stage: </span>
                  <span style={{ color: '#a7f3d0', fontWeight: 600 }}>{data.founder_stage || data.founder.founder_stage || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Role: </span>
                  <span style={{ color: '#ffffff' }}>{data.founder.role || 'FOUNDER'}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                <UserX style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
                Unassigned Founder
              </div>
            )}
          </div>

          {/* Group 2: Startup & Business Model */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Briefcase style={{ width: 14, height: 14 }} /> Startup & Scope
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Startup Name: </span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{data.startup_name || extra.startup_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Industry: </span>
                <span style={{ color: '#ffffff' }}>{extra.industry || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Business Model: </span>
                <span style={{ color: '#ffffff' }}>{extra.business_model || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Website: </span>
                {extra.website || extra.startup_website ? (
                  <a href={extra.website || extra.startup_website} target="_blank" rel="noreferrer" style={{ color: '#fbbf24', textDecoration: 'none' }}>
                    <Globe style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {extra.website || extra.startup_website}
                  </a>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
                )}
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Current Stage: </span>
                <span style={{ color: '#ffffff' }}>{data.founder_stage || extra.current_stage || '—'}</span>
              </div>
            </div>
          </div>

          {/* Group 3: Target & Commercials */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Award style={{ width: 14, height: 14 }} /> Target & Commercials
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Customer: </span>
                <span style={{ color: '#ffffff' }}>{data.target_customer || extra.target_customer || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Market: </span>
                <span style={{ color: '#ffffff' }}>{data.target_market || extra.target_market || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Priority: </span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{data.priority}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Requested Timeline: </span>
                <span style={{ color: extra.timeline || extra.requested_timeline ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                  <Calendar style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                  {extra.timeline || extra.requested_timeline || '2–3 Days'}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Preferred Contact: </span>
                <span style={{ color: extra.preferred_contact || extra.preferred_contact_method ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {extra.preferred_contact || extra.preferred_contact_method || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Sprint Description & Requirements */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText style={{ width: 14, height: 14, color: '#fbbf24' }} /> Complete Sprint Description & Objective
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {data.description || 'No description entered.'}
            </p>
          </div>

          {/* Technical, Functional & Custom Requirements */}
          {(extra.problem_statement || extra.proposed_solution || extra.business_goals || extra.success_criteria || extra.risks || extra.assumptions || extra.constraints || extra.additional_context || extra.extra_notes) && (
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {extra.problem_statement && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Problem Statement</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.problem_statement}</p>
                </div>
              )}
              {extra.proposed_solution && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Proposed Solution</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.proposed_solution}</p>
                </div>
              )}
              {extra.business_goals && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Business Goals</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.business_goals}</p>
                </div>
              )}
              {extra.success_criteria && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Success Criteria</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.success_criteria}</p>
                </div>
              )}
              {extra.risks && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Risks</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.risks}</p>
                </div>
              )}
              {extra.assumptions && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Assumptions</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.assumptions}</p>
                </div>
              )}
              {extra.constraints && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Constraints</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.constraints}</p>
                </div>
              )}
              {(extra.additional_context || extra.extra_notes) && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Additional Context</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.additional_context || extra.extra_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Extra Metadata & Custom Answers Card */}
          {(() => {
            const handledKeys = new Set([
              'milestones',
              'progress',
              'events',
              'industry',
              'business_model',
              'website',
              'startup_website',
              'timeline',
              'requested_timeline',
              'problem_statement',
              'proposed_solution',
              'business_goals',
              'success_criteria',
              'risks',
              'assumptions',
              'constraints',
              'additional_context',
              'additional_notes',
              'extra_notes',
              'figma_link',
              'github_link',
              'drive_link',
              'mvp_link',
              'documentation_link',
              'contact_name',
              'contact_email',
              'contact_phone',
              'preferred_contact',
              'preferred_contact_method',
              'phone',
            ]);
            const unhandledEntries = Object.entries(extra).filter(([k]) => !handledKeys.has(k));
            if (unhandledEntries.length === 0) return null;

            return (
              <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Layers style={{ width: 14, height: 14, color: '#fbbf24' }} /> Additional Custom Fields & Submission Metadata
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {unhandledEntries.map(([k, v]) => (
                    <div key={k} style={{ background: '#121624', padding: '0.625rem 0.75rem', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.78125rem', color: '#ffffff', marginTop: '0.25rem', wordBreak: 'break-word' }}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* External Resource Links (Figma, GitHub, Drive, MVP, Docs) */}
          {(extra.figma_link || extra.github_link || extra.drive_link || extra.mvp_link || extra.documentation_link) && (
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <ExternalLink style={{ width: 14, height: 14, color: '#fbbf24' }} /> External Project Links & Assets
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {extra.figma_link && (
                  <a href={extra.figma_link} target="_blank" rel="noreferrer" className="v2r-admin-btn v2r-admin-btn--ghost" style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> Figma Design
                  </a>
                )}
                {extra.github_link && (
                  <a href={extra.github_link} target="_blank" rel="noreferrer" className="v2r-admin-btn v2r-admin-btn--ghost" style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> GitHub Repository
                  </a>
                )}
                {extra.drive_link && (
                  <a href={extra.drive_link} target="_blank" rel="noreferrer" className="v2r-admin-btn v2r-admin-btn--ghost" style={{ fontSize: '0.75rem', color: '#fde047' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> Google Drive
                  </a>
                )}
                {extra.mvp_link && (
                  <a href={extra.mvp_link} target="_blank" rel="noreferrer" className="v2r-admin-btn v2r-admin-btn--ghost" style={{ fontSize: '0.75rem', color: '#f472b6' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> Existing MVP Demo
                  </a>
                )}
                {extra.documentation_link && (
                  <a href={extra.documentation_link} target="_blank" rel="noreferrer" className="v2r-admin-btn v2r-admin-btn--ghost" style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> Documentation
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Founder Uploaded Documents */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Paperclip style={{ width: 14, height: 14, color: '#fbbf24' }} /> Founder Uploaded Documents
                {data.attachments && data.attachments.length > 0 && (
                  <span style={{ fontSize: '0.6875rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.45rem', borderRadius: '999px', marginLeft: '0.25rem', fontWeight: 700 }}>
                    {data.attachments.length}
                  </span>
                )}
              </h3>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                Submitted by founder during Reality Sprint creation
              </span>
            </div>

            {data.attachments && data.attachments.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {data.attachments.map((att) => {
                  const displayName = att.original_filename || att.filename;
                  const isDownloading = downloadingId === att.id;
                  return (
                    <div
                      key={att.id}
                      style={{
                        background: '#121624',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      {/* File Type Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '0.4rem',
                          background: 'rgba(245, 158, 11, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#fbbf24',
                        }}
                      >
                        {getFileIcon(att.mime_type)}
                      </div>

                      {/* File Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={displayName}
                        >
                          {displayName}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>
                            {formatFileSize(att.file_size)}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.25)' }}>•</span>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                            {att.mime_type.split('/').pop()?.toUpperCase() || att.mime_type}
                          </span>
                        </div>
                      </div>

                      {/* Download Action */}
                      <button
                        className="v2r-admin-btn v2r-admin-btn--ghost"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', flexShrink: 0, color: isDownloading ? 'rgba(255,255,255,0.35)' : undefined }}
                        disabled={isDownloading}
                        onClick={() => handleDownloadAttachment(att.id, displayName)}
                        title={`Download ${displayName}`}
                      >
                        <Download style={{ width: 12, height: 12 }} />
                        {isDownloading ? 'Downloading…' : 'Download'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Paperclip style={{ width: 13, height: 13 }} />
                No documents were uploaded for this Reality Sprint.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Detail Grid */}
      <div className="v2r-admin-detail-grid">
        {/* Left Column: Operations & Founder Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Operations Panel (State-Aware Controls) */}
          <div className="v2r-admin-card" style={{ background: '#0f121d', border: '1px solid rgba(109, 93, 246, 0.3)' }}>
            <div className="v2r-admin-section-title">
              <Zap style={{ width: 14, height: 14, color: '#fbbf24' }} />
              Operational Controls
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {isPending && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: '#10b981' }}
                    onClick={() => setShowApproveModal(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Approve Sprint
                  </button>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    <XCircle style={{ width: 16, height: 16 }} /> Reject
                  </button>
                </div>
              )}

              {isApproved && (
                <button
                  className="v2r-admin-btn-primary"
                  style={{ width: '100%', background: '#6d5df6' }}
                  onClick={handleStart}
                  disabled={actionLoading}
                >
                  <Play style={{ width: 16, height: 16 }} /> Start Execution
                </button>
              )}

              {isInProgress && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
                    onClick={handlePause}
                    disabled={actionLoading}
                  >
                    <Pause style={{ width: 16, height: 16 }} /> Pause Sprint
                  </button>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: '#10b981' }}
                    onClick={() => setShowCompleteModal(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Mark Complete
                  </button>
                </div>
              )}

              {isPaused && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: '#6d5df6' }}
                    onClick={handleResume}
                    disabled={actionLoading}
                  >
                    <Play style={{ width: 16, height: 16 }} /> Resume Sprint
                  </button>
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ flex: 1, background: '#10b981' }}
                    onClick={() => setShowCompleteModal(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Mark Complete
                  </button>
                </div>
              )}

              {isFinished && (
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  This Reality Sprint is {data.status.toLowerCase()}. Operational state is finalized.
                </div>
              )}
            </div>
          </div>

          {/* Founder Identity Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <UserCheck style={{ width: 14, height: 14, color: '#60a5fa' }} />
              Founder Identity
            </div>
            {data.founder ? (
              <div>
                <div className="v2r-admin-founder-cell" style={{ marginBottom: '1rem' }}>
                  <div className="v2r-admin-founder-avatar" style={{ width: 42, height: 42, fontSize: '0.9375rem' }}>
                    <UserCheck style={{ width: 20, height: 20 }} />
                  </div>
                  <div>
                    <div className="v2r-admin-founder-name" style={{ fontSize: '0.9375rem' }}>
                      {data.founder.full_name}
                    </div>
                    <div className="v2r-admin-founder-email">{data.founder.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Phone: </span>
                    <span style={{ color: data.founder.phone_number ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                      <Phone style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                      {data.founder.phone_number || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Founder Stage: </span>
                    <span style={{ color: '#a7f3d0', fontWeight: 600 }}>{data.founder_stage || data.founder.founder_stage || '—'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Role: </span>
                    <span style={{ color: '#ffffff' }}>{data.founder.role || 'FOUNDER'}</span>
                  </div>
                </div>

                <button
                  className="v2r-admin-btn-google"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  onClick={() => navigate(`/admin/founders/${data.founder?.id}`)}
                >
                  View Founder Profile
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
                <UserX style={{ width: 16, height: 16 }} />
                <span>Unassigned Founder</span>
              </div>
            )}
          </div>

          {/* Lifecycle Timestamps Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <Clock style={{ width: 14, height: 14, color: '#a78bfa' }} />
              Lifecycle Audit Timestamps
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="v2r-admin-profile-row">
                <span className="v2r-admin-profile-label">Created</span>
                <span className="v2r-admin-profile-value">{formatDate(data.created_at)}</span>
              </div>
              {data.accepted_at && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Approved</span>
                  <span className="v2r-admin-profile-value" style={{ color: '#60a5fa' }}>{formatDate(data.accepted_at)}</span>
                </div>
              )}
              {data.started_at && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Started</span>
                  <span className="v2r-admin-profile-value" style={{ color: '#818cf8' }}>{formatDate(data.started_at)}</span>
                </div>
              )}
              {data.completed_at && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Completed</span>
                  <span className="v2r-admin-profile-value" style={{ color: '#34d399' }}>{formatDate(data.completed_at)}</span>
                </div>
              )}
              {data.cancelled_at && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Cancelled</span>
                  <span className="v2r-admin-profile-value" style={{ color: '#f87171' }}>{formatDate(data.cancelled_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Goal, Progress & Milestones, Activity Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Progress & Milestone Control Card */}
          {(isInProgress || isPaused || isApproved || s === 'COMPLETED') && (
            <div className="v2r-admin-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="v2r-admin-section-title" style={{ margin: 0 }}>
                  <Sliders style={{ width: 14, height: 14, color: '#818cf8' }} />
                  Execution Progress & Milestones
                </div>
                {progressDirty && (
                  <button
                    className="v2r-admin-btn-primary"
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.75rem' }}
                    onClick={handleSaveProgress}
                    disabled={actionLoading}
                  >
                    <Save style={{ width: 13, height: 13 }} /> Save Progress ({progressValue}%)
                  </button>
                )}
              </div>

              {/* Progress Slider */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="v2r-admin-profile-label">Overall Completion</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: progressValue === 100 ? '#34d399' : '#818cf8' }}>
                    {progressValue}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  disabled={isFinished}
                  onChange={(e) => {
                    setProgressValue(Number(e.target.value));
                    setProgressDirty(true);
                  }}
                  style={{ width: '100%', accentColor: '#6d5df6', cursor: isFinished ? 'not-allowed' : 'pointer' }}
                />
              </div>

              {/* Milestone Checklist */}
              {milestones.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem' }}>
                    Milestones Breakdown
                  </div>
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => !isFinished && toggleMilestone(m.id)}
                      style={{
                        background: m.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${m.completed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isFinished ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {m.completed ? (
                          <CheckSquare style={{ width: 18, height: 18, color: '#34d399', flexShrink: 0 }} />
                        ) : (
                          <Square style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: m.completed ? '#34d399' : '#ffffff' }}>
                            {m.title}
                          </div>
                          {m.description && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{m.description}</div>
                          )}
                        </div>
                      </div>
                      {m.completed_at && (
                        <span style={{ fontSize: '0.6875rem', color: 'rgba(16, 185, 129, 0.7)' }}>
                          {formatDate(m.completed_at)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sprint Goal / Submission Inputs */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <FileText style={{ width: 14, height: 14, color: '#818cf8' }} />
              Sprint Objective & Requirements
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div className="v2r-admin-profile-label" style={{ marginBottom: '0.375rem' }}>
                  Description / Goal
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '0.5rem',
                    padding: '0.875rem 1rem',
                    fontSize: '0.8125rem',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {data.description}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {data.target_customer && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                    <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Target style={{ width: 12, height: 12 }} /> Target Customer
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.target_customer}</div>
                  </div>
                )}

                {data.target_market && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                    <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Compass style={{ width: 12, height: 12 }} /> Target Market
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.target_market}</div>
                  </div>
                )}

                {data.founder_stage && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                    <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem' }}>Founder Stage</div>
                    <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.founder_stage}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log Timeline */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <Activity style={{ width: 14, height: 14, color: '#34d399' }} />
              Execution Activity Log
            </div>

            {data.activities.length > 0 ? (
              <div className="v2r-admin-activity-list">
                {data.activities.map((act) => (
                  <div key={act.id} className="v2r-admin-activity-item">
                    <div className="v2r-admin-activity-dot" />
                    <div className="v2r-admin-activity-item__body">
                      <div className="v2r-admin-activity-item__title">{act.event_type}</div>
                      {act.metadata_json && Object.keys(act.metadata_json).length > 0 && (
                        <div className="v2r-admin-activity-item__desc">
                          <code style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {JSON.stringify(act.metadata_json)}
                          </code>
                        </div>
                      )}
                      <div className="v2r-admin-activity-item__time">{formatDate(act.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', padding: '0.5rem 0' }}>
                No activity records logged for this sprint.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="v2r-admin-card" style={{ maxWidth: '420px', width: '100%', background: '#0d0f17' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>Approve Reality Sprint?</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
              Are you sure you want to approve "{data.title}"? This will set the sprint status to ACCEPTED and notify the founder.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="v2r-admin-btn-google" style={{ width: 'auto' }} onClick={() => setShowApproveModal(false)}>
                Cancel
              </button>
              <button className="v2r-admin-btn-primary" style={{ width: 'auto', background: '#10b981' }} onClick={handleApprove} disabled={actionLoading}>
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="v2r-admin-card" style={{ maxWidth: '420px', width: '100%', background: '#0d0f17' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>Reject Reality Sprint?</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
              Optionally provide a reason for rejecting "{data.title}".
            </p>
            <textarea
              style={{ width: '100%', height: '80px', background: '#050505', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.5rem', color: '#ffffff', fontSize: '0.8125rem', marginBottom: '1.25rem' }}
              placeholder="Reason for rejection (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="v2r-admin-btn-google" style={{ width: 'auto' }} onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="v2r-admin-btn-primary" style={{ width: 'auto', background: '#ef4444' }} onClick={handleReject} disabled={actionLoading}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="v2r-admin-card" style={{ maxWidth: '420px', width: '100%', background: '#0d0f17' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
              <AlertTriangle style={{ width: 18, height: 18 }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Complete Reality Sprint?</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
              Mark "{data.title}" as 100% completed? All milestones will be marked finished. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="v2r-admin-btn-google" style={{ width: 'auto' }} onClick={() => setShowCompleteModal(false)}>
                Cancel
              </button>
              <button className="v2r-admin-btn-primary" style={{ width: 'auto', background: '#10b981' }} onClick={handleComplete} disabled={actionLoading}>
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
