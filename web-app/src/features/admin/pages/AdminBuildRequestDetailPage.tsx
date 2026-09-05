import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Hammer,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Briefcase,
  Globe,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  XCircle,
  AlertTriangle,
  Send,
  Lock,
  ExternalLink,
  ShieldCheck,
  Award,
  Download,
  Image,
  FileCode,
  File,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type {
  AdminBuildRequestDetailResponse,
  BuildRequestMilestoneItem,
} from '@/services/api/adminApi';

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

// ── File type helpers ─────────────────────────────────────────────────────

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
    return <File style={s} />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('xml') ||
    mimeType.includes('text/plain')
  )
    return <FileCode style={s} />;
  if (
    mimeType.includes('word') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint')
  )
    return <FileText style={s} />;
  return <Paperclip style={s} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminBuildRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminBuildRequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Modals & Forms state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Progress update state
  const [progressVal, setProgressVal] = useState<number>(0);
  const [phaseInput, setPhaseInput] = useState<string>('');
  const [milestonesState, setMilestonesState] = useState<BuildRequestMilestoneItem[]>([]);
  const [progressSavedMessage, setProgressSavedMessage] = useState(false);

  // Internal Note state
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBuildRequestDetail(id);
      setDetail(res);
      setProgressVal(res.progress_percentage || 0);
      setPhaseInput(res.current_phase || '');
      setMilestonesState(res.milestones || []);
    } catch {
      setError('Build Request not found or error loading data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.approveBuildRequest(id);
      setDetail(updated);
      setShowApproveModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to approve build request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.rejectBuildRequest(id, rejectReason || undefined);
      setDetail(updated);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to reject build request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDevelopment = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.startBuildDevelopment(id);
      setDetail(updated);
      setProgressVal(updated.progress_percentage || 0);
      setPhaseInput(updated.current_phase || '');
      setMilestonesState(updated.milestones || []);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to start development.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseDevelopment = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.pauseBuildDevelopment(id);
      setDetail(updated);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to pause development.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeDevelopment = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.resumeBuildDevelopment(id);
      setDetail(updated);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to resume development.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!id) return;
    setActionLoading(true);
    setProgressSavedMessage(false);
    try {
      const updated = await adminApi.updateBuildRequestProgress(
        id,
        progressVal,
        phaseInput,
        undefined,
        milestonesState
      );
      setDetail(updated);
      setProgressSavedMessage(true);
      setTimeout(() => setProgressSavedMessage(false), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update progress.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDevelopment = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.completeBuildDevelopment(id);
      setDetail(updated);
      setProgressVal(100);
      setMilestonesState(updated.milestones || []);
      setShowCompleteModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to complete development.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    if (!id) return;
    setDownloadingId(attachmentId);
    try {
      const blob = await adminApi.downloadBuildRequestAttachment(id, attachmentId);
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

  const handleAddOperationalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim()) return;
    setNoteSaving(true);
    try {
      const updated = await adminApi.addBuildRequestNote(id, noteContent.trim());
      setDetail(updated);
      setNoteContent('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add operational note.');
    } finally {
      setNoteSaving(false);
    }
  };

  const toggleMilestoneCompleted = (mId: string) => {
    setMilestonesState((prev) =>
      prev.map((m) => {
        if (m.id === mId) {
          const nextCompleted = !m.completed;
          return {
            ...m,
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
          };
        }
        return m;
      })
    );
  };

  // ── Render Guard ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="v2r-admin-skeleton" style={{ height: 40, width: 250 }} />
        <div className="v2r-admin-skeleton" style={{ height: 180, borderRadius: 12 }} />
        <div className="v2r-admin-skeleton" style={{ height: 350, borderRadius: 12 }} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: '2rem' }}>
        <button
          className="v2r-admin-btn v2r-admin-btn--ghost"
          onClick={() => navigate('/admin/build-requests')}
          style={{ marginBottom: '1.5rem' }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Build Requests
        </button>
        <div className="v2r-admin-error-card">{error || 'Build Request not found.'}</div>
      </div>
    );
  }

  const extra = detail.extra_metadata || {};
  const statusUpper = detail.status.toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          className="v2r-admin-btn v2r-admin-btn--ghost"
          onClick={() => navigate('/admin/build-requests')}
          style={{ fontSize: '0.8125rem' }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Build Requests
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
            ID: {detail.id}
          </span>
          <BuildStatusBadge status={detail.status} />
        </div>
      </div>

      {/* Top Banner Card */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem', borderLeft: '4px solid #22d3ee' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span className="v2r-admin-badge v2r-admin-badge--sprint">{detail.priority} PRIORITY</span>
              {detail.product_category && (
                <span className="v2r-admin-badge v2r-admin-badge--submitted">{detail.product_category}</span>
              )}
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {detail.title}
            </h1>
            {detail.startup_name && (
              <p style={{ fontSize: '0.875rem', color: '#22d3ee', fontWeight: 600, marginTop: '0.25rem', marginBottom: 0 }}>
                {detail.startup_name}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '0.125rem' }}>Submitted</div>
              <div style={{ color: '#ffffff', fontWeight: 600 }}>{formatDate(detail.created_at)}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '0.125rem' }}>Last Updated</div>
              <div style={{ color: '#ffffff', fontWeight: 600 }}>{formatDate(detail.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: FOUNDER SUBMISSION DOSSIER (100% Complete Display) */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <ShieldCheck style={{ width: 18, height: 18, color: '#38bdf8' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Founder Submission Dossier (Original Input Data)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Group 1: Founder Information */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <UserCheck style={{ width: 14, height: 14 }} /> Founder Information
            </h3>
            {detail.founder ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Name: </span>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>{detail.founder.full_name}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Email: </span>
                  <a href={`mailto:${detail.founder.email}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                    <Mail style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {detail.founder.email}
                  </a>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Phone: </span>
                  <span style={{ color: detail.founder.phone_number ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                    <Phone style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {detail.founder.phone_number || '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Founder Stage: </span>
                  <span style={{ color: '#a7f3d0', fontWeight: 600 }}>{detail.founder_stage || detail.founder.founder_stage || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Role: </span>
                  <span style={{ color: '#ffffff' }}>{detail.founder.role || 'FOUNDER'}</span>
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
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Briefcase style={{ width: 14, height: 14 }} /> Startup & Business Model
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Startup Name: </span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{detail.startup_name || extra.startup_name || '—'}</span>
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
                  <a href={extra.website || extra.startup_website} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                    <Globe style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                    {extra.website || extra.startup_website}
                  </a>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
                )}
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Current Traction: </span>
                <span style={{ color: '#ffffff' }}>{extra.current_traction || '—'}</span>
              </div>
            </div>
          </div>

          {/* Group 3: Scope, Target & Budget */}
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Award style={{ width: 14, height: 14 }} /> Target & Commercials
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Customer: </span>
                <span style={{ color: '#ffffff' }}>{detail.target_customer || extra.target_customer || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Market: </span>
                <span style={{ color: '#ffffff' }}>{detail.target_market || extra.target_market || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Budget: </span>
                <span style={{ color: extra.estimated_budget || extra.budget ? '#34d399' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                  <DollarSign style={{ width: 11, height: 11, display: 'inline', marginRight: 2 }} />
                  {extra.estimated_budget || extra.budget || '—'}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Requested Timeline: </span>
                <span style={{ color: extra.timeline || extra.requested_timeline ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                  <Calendar style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
                  {extra.timeline || extra.requested_timeline || '—'}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Preferred Contact: </span>
                <span style={{ color: extra.preferred_contact || extra.preferred_contact_method ? '#38bdf8' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {extra.preferred_contact || extra.preferred_contact_method || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Project Description & Requirements */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText style={{ width: 14, height: 14, color: '#38bdf8' }} /> Complete Project Description & Objective
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {detail.description || 'No description entered.'}
            </p>
          </div>

          {/* Technical, Functional & Custom Requirements */}
          {(extra.technical_requirements || extra.functional_requirements || extra.non_functional_requirements || extra.platform_requirements || extra.preferred_technologies || extra.problem_statement || extra.proposed_solution || extra.additional_context || extra.extra_notes) && (
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {extra.problem_statement && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Problem Statement</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.problem_statement}</p>
                </div>
              )}
              {extra.proposed_solution && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Proposed Solution</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.proposed_solution}</p>
                </div>
              )}
              {extra.technical_requirements && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Technical Requirements</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.technical_requirements}</p>
                </div>
              )}
              {extra.functional_requirements && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Functional Requirements</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.functional_requirements}</p>
                </div>
              )}
              {extra.non_functional_requirements && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Non-Functional Requirements</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.non_functional_requirements}</p>
                </div>
              )}
              {extra.preferred_technologies && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Preferred Technologies</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.preferred_technologies}</p>
                </div>
              )}
              {(extra.additional_context || extra.extra_notes) && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Additional Context</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{extra.additional_context || extra.extra_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Extra Metadata & Custom Answers Card */}
          {(() => {
            const handledKeys = new Set([
              'milestones',
              'operational_notes',
              'events',
              'industry',
              'business_model',
              'current_traction',
              'website',
              'startup_website',
              'budget',
              'estimated_budget',
              'timeline',
              'requested_timeline',
              'problem_statement',
              'proposed_solution',
              'technical_requirements',
              'functional_requirements',
              'non_functional_requirements',
              'platform_requirements',
              'preferred_technologies',
              'additional_context',
              'additional_notes',
              'extra_notes',
              'figma_link',
              'github_link',
              'drive_link',
              'mvp_link',
              'documentation_link',
              'existing_product_link',
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
                  <Layers style={{ width: 14, height: 14, color: '#38bdf8' }} /> Additional Custom Fields & Submission Metadata
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {unhandledEntries.map(([k, v]) => (
                    <div key={k} style={{ background: '#121624', padding: '0.625rem 0.75rem', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
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
          {(extra.figma_link || extra.github_link || extra.drive_link || extra.mvp_link || extra.documentation_link || extra.existing_product_link) && (
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <ExternalLink style={{ width: 14, height: 14, color: '#38bdf8' }} /> External Project Links & Assets
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
                <Paperclip style={{ width: 14, height: 14, color: '#38bdf8' }} /> Founder Uploaded Documents
                {detail.attachments && detail.attachments.length > 0 && (
                  <span style={{ fontSize: '0.6875rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '0.1rem 0.45rem', borderRadius: '999px', marginLeft: '0.25rem', fontWeight: 700 }}>
                    {detail.attachments.length}
                  </span>
                )}
              </h3>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                Submitted by founder during Build Request creation
              </span>
            </div>

            {detail.attachments && detail.attachments.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {detail.attachments.map((att) => {
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
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      {/* File Type Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '0.4rem',
                          background: 'rgba(56,189,248,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#38bdf8',
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
                No documents were uploaded with this submission.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: OPERATIONS ACTION PANEL (State-Aware Controls) */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Hammer style={{ width: 18, height: 18, color: '#22d3ee' }} /> Operational Controls
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* SUBMITTED / PENDING State */}
          {(statusUpper === 'SUBMITTED' || statusUpper === 'PENDING' || statusUpper === 'UNDER_REVIEW' || statusUpper === 'DRAFT') && (
            <>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={() => setShowApproveModal(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Approve Request
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--danger"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <XCircle style={{ width: 14, height: 14 }} /> Reject Request
              </button>
            </>
          )}

          {/* APPROVED State */}
          {(statusUpper === 'APPROVED' || statusUpper === 'ACCEPTED') && (
            <button
              className="v2r-admin-btn v2r-admin-btn--primary"
              onClick={handleStartDevelopment}
              disabled={actionLoading}
            >
              <PlayCircle style={{ width: 14, height: 14 }} /> Start Development Execution
            </button>
          )}

          {/* IN_PROGRESS State */}
          {statusUpper === 'IN_PROGRESS' && (
            <>
              <button
                className="v2r-admin-btn v2r-admin-btn--secondary"
                onClick={handlePauseDevelopment}
                disabled={actionLoading}
              >
                <PauseCircle style={{ width: 14, height: 14 }} /> Pause Development
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={() => setShowCompleteModal(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Mark 100% Completed
              </button>
            </>
          )}

          {/* PAUSED State */}
          {statusUpper === 'PAUSED' && (
            <>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={handleResumeDevelopment}
                disabled={actionLoading}
              >
                <PlayCircle style={{ width: 14, height: 14 }} /> Resume Development
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={() => setShowCompleteModal(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Mark 100% Completed
              </button>
            </>
          )}

          {/* COMPLETED or REJECTED State */}
          {(statusUpper === 'COMPLETED' || statusUpper === 'REJECTED') && (
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
              Build request is in terminal state ({statusUpper}). No further status transitions allowed.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE PROGRESS & MILESTONES MANAGER */}
      {(statusUpper === 'IN_PROGRESS' || statusUpper === 'PAUSED' || statusUpper === 'COMPLETED') && (
        <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers style={{ width: 18, height: 18, color: '#22d3ee' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Execution Progress & Build Milestones
              </h2>
            </div>
            {progressSavedMessage && (
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Progress saved successfully
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Progress Slider & Phase Form */}
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Overall Progress Percentage ({progressVal}%)
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressVal}
                  onChange={(e) => setProgressVal(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#22d3ee', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#22d3ee', width: '40px' }}>
                  {progressVal}%
                </span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem', fontWeight: 600 }}>
                  Current Phase Label
                </label>
                <input
                  type="text"
                  className="v2r-admin-search-input"
                  placeholder="e.g. Phase 2: Core Backend Implementation"
                  value={phaseInput}
                  onChange={(e) => setPhaseInput(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={handleSaveProgress}
                disabled={actionLoading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Save Progress & Phase
              </button>
            </div>

            {/* Interactive Milestone Checklist */}
            <div style={{ background: '#090b11', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Build Milestone Checklist
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {milestonesState.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => toggleMilestoneCompleted(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: m.completed ? 'rgba(52, 211, 153, 0.08)' : '#121624',
                      border: m.completed ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={m.completed}
                      onChange={() => {}} // Handled by parent div onClick
                      style={{ accentColor: '#34d399', marginTop: '0.15rem', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: m.completed ? '#34d399' : '#ffffff' }}>
                        {m.title}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.125rem' }}>
                          {m.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PRIVATE ADMIN OPERATIONAL NOTES */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock style={{ width: 16, height: 16, color: '#f59e0b' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Private Operational Notes
            </h2>
          </div>
          <span className="v2r-admin-badge v2r-admin-badge--unverified" style={{ fontSize: '0.7rem' }}>
            Internal Only — Hidden from Founder Workspace
          </span>
        </div>

        <form onSubmit={handleAddOperationalNote} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <textarea
              className="v2r-admin-search-input"
              rows={2}
              placeholder="Add internal operational note (architecture decisions, developer assignments, private status)..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              style={{ flex: 1, resize: 'vertical', minHeight: '60px' }}
            />
            <button
              type="submit"
              className="v2r-admin-btn v2r-admin-btn--primary"
              disabled={noteSaving || !noteContent.trim()}
              style={{ padding: '0.625rem 1rem', height: 'auto' }}
            >
              <Send style={{ width: 14, height: 14 }} /> Add Note
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {detail.operational_notes && detail.operational_notes.length > 0 ? (
            detail.operational_notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#090b11',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #f59e0b',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                    {note.author_name}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>
                    {formatDate(note.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </p>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              No internal notes logged yet.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: EXECUTION ACTIVITY & AUDIT TIMELINE */}
      <div className="v2r-admin-card" style={{ padding: '1.5rem 1.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock style={{ width: 18, height: 18, color: '#22d3ee' }} /> Execution Activity & Audit Timeline
        </h2>

        {detail.timeline_events && detail.timeline_events.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.25rem' }}>
            {/* Timeline Vertical Line */}
            <div
              style={{
                position: 'absolute',
                left: '5px',
                top: '6px',
                bottom: '6px',
                width: '2px',
                background: 'rgba(255,255,255,0.1)',
              }}
            />

            {detail.timeline_events.map((evt) => (
              <div key={evt.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.45rem',
                    top: '3px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#22d3ee',
                    boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                      {evt.title}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: '#22d3ee', background: 'rgba(6, 182, 212, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                      {evt.event_type}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                      {formatDate(evt.created_at)}
                    </span>
                  </div>
                  {evt.description && (
                    <p style={{ fontSize: '0.78125rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.25rem', marginBottom: 0 }}>
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
            No timeline audit events logged yet.
          </div>
        )}
      </div>

      {/* CONFIRMATION MODALS */}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="v2r-admin-modal-overlay">
          <div className="v2r-admin-modal">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginTop: 0 }}>
              Approve Build Request?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              Approving request <strong>{detail.title}</strong> will transition state to <code>APPROVED</code> and notify the founder.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="v2r-admin-btn v2r-admin-btn--ghost"
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="v2r-admin-modal-overlay">
          <div className="v2r-admin-modal">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f87171', marginTop: 0 }}>
              Reject Build Request?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              Please state the reason for rejecting <strong>{detail.title}</strong>:
            </p>
            <textarea
              className="v2r-admin-search-input"
              rows={3}
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', resize: 'vertical', marginTop: '0.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="v2r-admin-btn v2r-admin-btn--ghost"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--danger"
                onClick={handleReject}
                disabled={actionLoading}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="v2r-admin-modal-overlay">
          <div className="v2r-admin-modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', marginBottom: '0.5rem' }}>
              <AlertTriangle style={{ width: 20, height: 20 }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Mark Build Request Completed?
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              This will set execution progress to <strong>100%</strong>, mark all milestones complete, and transition state to terminal <code>COMPLETED</code> status.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="v2r-admin-btn v2r-admin-btn--ghost"
                onClick={() => setShowCompleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="v2r-admin-btn v2r-admin-btn--primary"
                onClick={handleCompleteDevelopment}
                disabled={actionLoading}
              >
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
