import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCheck,
  ArrowLeft,
  UserCheck,
  UserX,
  Brain,
  Zap,
  Clock,
  Coins,
  Activity,
  FileText,
  Target,
  Users,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';
import { adminApi } from '@/services/api/adminApi';
import type { AdminValidationDetailResponse } from '@/services/api/adminApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ValidationStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let className = 'v2r-admin-badge--unverified';
  if (s === 'COMPLETED') className = 'v2r-admin-badge--completed';
  else if (s === 'PROCESSING') className = 'v2r-admin-badge--in-progress';
  else if (s === 'FAILED') className = 'v2r-admin-badge--inactive';
  else if (s === 'QUEUED') className = 'v2r-admin-badge--submitted';

  return <span className={`v2r-admin-badge ${className}`}>{status}</span>;
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.25rem' }}>N/A</span>;
  }

  let color = '#34d399';
  if (score < 50) color = '#f87171';
  else if (score < 75) color = '#fbbf24';

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
      <span style={{ fontSize: '2.25rem', fontWeight: 800, color, lineHeight: 1 }}>
        {score.toFixed(0)}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/100</span>
    </div>
  );
}

function RecommendationPill({ rec }: { rec: string | null }) {
  if (!rec) return null;
  const upper = rec.toUpperCase();

  let bg = 'rgba(255,255,255,0.06)';
  let border = 'rgba(255,255,255,0.12)';
  let color = 'rgba(255,255,255,0.8)';
  let icon = <CheckCircle2 style={{ width: 14, height: 14 }} />;

  if (upper.includes('PROCEED') || upper.includes('GO') || upper.includes('STRONG')) {
    bg = 'rgba(16, 185, 129, 0.12)';
    border = 'rgba(16, 185, 129, 0.3)';
    color = '#34d399';
  } else if (upper.includes('PIVOT') || upper.includes('CAUTION')) {
    bg = 'rgba(245, 158, 11, 0.12)';
    border = 'rgba(245, 158, 11, 0.3)';
    color = '#fbbf24';
    icon = <AlertTriangle style={{ width: 14, height: 14 }} />;
  } else if (upper.includes('PAUSE') || upper.includes('REJECT') || upper.includes('NO')) {
    bg = 'rgba(239, 68, 68, 0.12)';
    border = 'rgba(239, 68, 68, 0.3)';
    color = '#f87171';
    icon = <AlertTriangle style={{ width: 14, height: 14 }} />;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.5rem',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: '0.8125rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {icon}
      <span>{rec}</span>
    </div>
  );
}

// ── Main Detail Component ─────────────────────────────────────────────────────

export function AdminValidationDetailPage() {
  const { validationId } = useParams<{ validationId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminValidationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!validationId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getValidationDetail(validationId);
      setData(result);
    } catch {
      setError('Failed to load validation details. The validation may not exist.');
    } finally {
      setLoading(false);
    }
  }, [validationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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
        <button onClick={() => navigate('/admin/validations')} className="v2r-admin-back-btn">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Validations
        </button>
        <div className="v2r-admin-error-card">{error || 'Validation not found'}</div>
      </div>
    );
  }

  const { operational } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Back Button */}
      <div>
        <button onClick={() => navigate('/admin/validations')} className="v2r-admin-back-btn">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Validations
        </button>
      </div>

      {/* Page Header Banner */}
      <div className="v2r-admin-page-banner">
        <div className="v2r-admin-page-banner__left">
          <div className="v2r-admin-page-banner__icon-box">
            <FileCheck style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 className="v2r-admin-page-banner__title">Validation Record</h2>
              <code
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.8125rem',
                  color: '#818cf8',
                  background: 'rgba(109, 93, 246, 0.15)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid rgba(109, 93, 246, 0.3)',
                }}
              >
                {data.id}
              </code>
              <ValidationStatusBadge status={data.status} />
            </div>
            <p className="v2r-admin-page-banner__sub">
              Source: <strong style={{ color: '#ffffff' }}>{data.source}</strong> • Created:{' '}
              {formatDate(data.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="v2r-admin-detail-grid">
        {/* Left Column: Metadata & Founder Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AI Score & Recommendation Card */}
          <div className="v2r-admin-card" style={{ textAlign: 'center' }}>
            <div className="v2r-admin-section-title">
              <Brain style={{ width: 14, height: 14, color: '#a78bfa' }} />
              AI Evaluation Score
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 0',
              }}
            >
              <ScoreDisplay score={data.overall_score} />
              <RecommendationPill rec={data.recommendation} />
            </div>
          </div>

          {/* Founder Identity Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <Users style={{ width: 14, height: 14, color: '#60a5fa' }} />
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
                <button
                  className="v2r-admin-btn-google"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  onClick={() => navigate(`/admin/founders/${data.founder?.id}`)}
                >
                  View Founder Profile
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.8125rem',
                  padding: '0.5rem 0',
                }}
              >
                <UserX style={{ width: 16, height: 16 }} />
                <span>Guest Submission (Unauthenticated)</span>
              </div>
            )}
          </div>

          {/* Operational & LLM Performance Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <Zap style={{ width: 14, height: 14, color: '#fbbf24' }} />
              Operational Telemetry
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {operational.llm_provider && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">LLM Provider</span>
                  <span className="v2r-admin-profile-value" style={{ fontWeight: 600, color: '#ffffff' }}>
                    {operational.llm_provider}
                  </span>
                </div>
              )}

              {operational.llm_model && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">LLM Model</span>
                  <span className="v2r-admin-profile-value" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#818cf8' }}>
                    {operational.llm_model}
                  </span>
                </div>
              )}

              {operational.prompt_version && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Prompt Version</span>
                  <span className="v2r-admin-profile-value">{operational.prompt_version}</span>
                </div>
              )}

              {operational.processing_time_ms !== null && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Latency</span>
                  <span className="v2r-admin-profile-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock style={{ width: 12, height: 12, opacity: 0.5 }} />
                    {(operational.processing_time_ms / 1000).toFixed(2)}s
                  </span>
                </div>
              )}

              {operational.total_tokens !== null && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Total Tokens</span>
                  <span className="v2r-admin-profile-value">{operational.total_tokens.toLocaleString()}</span>
                </div>
              )}

              {operational.prompt_tokens !== null && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Prompt Tokens</span>
                  <span className="v2r-admin-profile-value">{operational.prompt_tokens.toLocaleString()}</span>
                </div>
              )}

              {operational.completion_tokens !== null && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Completion Tokens</span>
                  <span className="v2r-admin-profile-value">{operational.completion_tokens.toLocaleString()}</span>
                </div>
              )}

              {operational.estimated_cost !== null && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Est. Cost</span>
                  <span className="v2r-admin-profile-value" style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Coins style={{ width: 12, height: 12 }} />
                    ${operational.estimated_cost.toFixed(4)}
                  </span>
                </div>
              )}

              {operational.review_status && (
                <div className="v2r-admin-profile-row">
                  <span className="v2r-admin-profile-label">Review Status</span>
                  <span className="v2r-admin-profile-value">{operational.review_status}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Founder Input & AI Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Founder Inputs Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <FileText style={{ width: 14, height: 14, color: '#818cf8' }} />
              Founder Submission Inputs
            </div>

            {data.inputs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div className="v2r-admin-profile-label" style={{ marginBottom: '0.375rem' }}>
                    Idea Description
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
                    {data.inputs.idea_description}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {data.inputs.target_customer && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '0.5rem',
                        padding: '0.625rem 0.75rem',
                      }}
                    >
                      <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Target style={{ width: 12, height: 12 }} /> Target Customer
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.inputs.target_customer}</div>
                    </div>
                  )}

                  {data.inputs.target_market && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '0.5rem',
                        padding: '0.625rem 0.75rem',
                      }}
                    >
                      <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Compass style={{ width: 12, height: 12 }} /> Target Market
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.inputs.target_market}</div>
                    </div>
                  )}

                  {data.inputs.founder_stage && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '0.5rem',
                        padding: '0.625rem 0.75rem',
                      }}
                    >
                      <div className="v2r-admin-profile-label" style={{ marginBottom: '0.25rem' }}>
                        Founder Stage
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#ffffff' }}>{data.inputs.founder_stage}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                No submission input records found.
              </div>
            )}
          </div>

          {/* AI Validation Report Payload Card */}
          <div className="v2r-admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div className="v2r-admin-section-title" style={{ margin: 0 }}>
                <Brain style={{ width: 14, height: 14, color: '#a78bfa' }} />
                AI Validation Report Data
              </div>
              {data.report_json && (
                <button
                  className="v2r-admin-back-btn"
                  style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => setShowRawJson((prev) => !prev)}
                >
                  <Code2 style={{ width: 13, height: 13 }} />
                  {showRawJson ? 'Hide Raw JSON' : 'Inspect Raw JSON'}
                </button>
              )}
            </div>

            {data.report_json ? (
              showRawJson ? (
                <pre
                  style={{
                    background: '#050505',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontSize: '0.75rem',
                    color: '#34d399',
                    fontFamily: 'var(--font-mono, monospace)',
                    overflowX: 'auto',
                    maxHeight: '400px',
                  }}
                >
                  {JSON.stringify(data.report_json, null, 2)}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(data.report_json).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#818cf8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '0.375rem',
                        }}
                      >
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                        {typeof val === 'object' ? (
                          <pre
                            style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              color: 'rgba(255,255,255,0.7)',
                              fontFamily: 'var(--font-mono, monospace)',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        ) : (
                          String(val)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '0.8125rem',
                }}
              >
                No generated report JSON is associated with this validation.
              </div>
            )}
          </div>

          {/* Lifecycle Event Log Card */}
          <div className="v2r-admin-card">
            <div className="v2r-admin-section-title">
              <Activity style={{ width: 14, height: 14, color: '#34d399' }} />
              Lifecycle Event Log
            </div>

            {data.events.length > 0 ? (
              <div className="v2r-admin-activity-list">
                {data.events.map((evt) => (
                  <div key={evt.id} className="v2r-admin-activity-item">
                    <div className="v2r-admin-activity-dot" />
                    <div className="v2r-admin-activity-item__body">
                      <div className="v2r-admin-activity-item__title">{evt.event_type}</div>
                      {evt.metadata_json && Object.keys(evt.metadata_json).length > 0 && (
                        <div className="v2r-admin-activity-item__desc">
                          <code style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {JSON.stringify(evt.metadata_json)}
                          </code>
                        </div>
                      )}
                      <div className="v2r-admin-activity-item__time">{formatDate(evt.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', padding: '0.5rem 0' }}>
                No lifecycle events recorded for this validation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
