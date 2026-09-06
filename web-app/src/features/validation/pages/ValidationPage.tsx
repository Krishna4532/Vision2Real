import { useState, useCallback, useEffect } from 'react';
import { useValidation } from '@/features/validation/hooks/useValidation';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { validationService } from '@/services/validation/validationService';
import type { AgentState, TimelineStep, ValidationResponse } from '@/services/validation/types';
import { PremiumHero } from '@/components/premiumHero/PremiumHero';
import './ValidationPage.css';

const STAGE_OPTIONS = ['Idea Phase', 'Building MVP', 'Early Traction', 'Growth'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentState }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (agent.status === 'completed') {
      setProgress(100);
    } else if (agent.status === 'running') {
      setProgress(10);
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 99) return p;
          const increment = Math.max(0.5, (99 - p) * 0.05);
          return Math.min(99, p + increment);
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [agent.status]);

  const statusColors = {
    waiting: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', dot: '#64748b', label: 'Waiting' },
    running: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.5)', dot: '#6366f1', label: 'Running', shadow: '0 0 15px rgba(99,102,241,0.3)' },
    completed: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', dot: '#10b981', label: 'Complete' },
    failed: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444', label: 'Failed' },
  };
  const c = statusColors[agent.status] as any;

  return (
    <motion.div
      layout
      className={`agent-card ${agent.status === 'running' ? 'agent-card--running' : ''}`}
      style={{ 
        background: c.bg, 
        borderColor: c.border,
        boxShadow: c.shadow || 'none'
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="agent-card-header">
        <span className="agent-icon">{agent.icon}</span>
        <div className="agent-info">
          <p className="agent-name">{agent.name}</p>
          <p className="agent-desc">{agent.description}</p>
        </div>
        <div className="agent-status-badge" style={{ color: c.dot }}>
          <span
            className="agent-status-dot"
            style={{ background: c.dot, boxShadow: agent.status === 'running' ? `0 0 8px ${c.dot}` : 'none' }}
          />
          {c.label}
        </div>
      </div>

      <div className="agent-progress-bar-track">
        <motion.div
          className="agent-progress-bar-fill"
          style={{ background: c.dot }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2, ease: 'linear' }}
        />
        <span className="agent-progress-text" style={{ position: 'absolute', right: '4px', top: '-18px', fontSize: '10px', color: c.dot }}>
          {Math.round(progress)}%
        </span>
      </div>

      <p className="agent-message" style={{ color: agent.status === 'running' ? '#a5b4fc' : 'rgba(255,255,255,0.45)' }}>
        {agent.status === 'running' && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            ⚡{' '}
          </motion.span>
        )}
        {agent.message}
        {agent.duration_ms && agent.status === 'completed' && (
          <span style={{ marginLeft: 8, opacity: 0.5, fontSize: '0.7rem' }}>
            [{agent.duration_ms}ms]
          </span>
        )}
      </p>
    </motion.div>
  );
}

function ValidationTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="v2r-timeline">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className="v2r-timeline-step"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <div className="v2r-timeline-connector">
            <div
              className="v2r-timeline-node"
              data-status={step.status}
            >
              {step.status === 'completed' ? '✓' : step.status === 'active' ? (
                <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>●</motion.span>
              ) : '○'}
            </div>
            {i < steps.length - 1 && (
              <div
                className="v2r-timeline-line"
                data-completed={step.status === 'completed'}
              />
            )}
          </div>
          <div className="v2r-timeline-content">
            <p className="v2r-timeline-label" data-status={step.status}>{step.label}</p>
            {step.timestamp && (
              <p className="v2r-timeline-time">
                {new Date(step.timestamp).toLocaleTimeString()}
                {step.duration_ms && <span style={{ marginLeft: 6, opacity: 0.5 }}>{step.duration_ms}ms</span>}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function LiveDashboard({
  agents,
  timeline,
  overallProgress,
}: {
  agents: AgentState[];
  timeline: TimelineStep[];
  overallProgress: number;
}) {
  const completedCount = agents.filter((a) => a.status === 'completed').length;

  return (
    <motion.div
      className="v2r-live-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="v2r-dashboard-header">
        <div>
          <h2 className="v2r-dashboard-title">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ color: '#6366f1' }}
            >
              ●
            </motion.span>{' '}
            Vision2Real AI Validation Team
          </h2>
          <p className="v2r-dashboard-subtitle">
            {completedCount} of {agents.length} agents completed · {Math.round(overallProgress)}% overall
          </p>
        </div>
        <div className="v2r-dashboard-overall-bar-wrap">
          <div className="v2r-dashboard-overall-bar-track">
            <motion.div
              className="v2r-dashboard-overall-bar-fill"
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="v2r-dashboard-overall-pct">{Math.round(overallProgress)}%</span>
        </div>
      </div>

      <div className="v2r-dashboard-body">
        {/* Agent cards grid */}
        <div className="v2r-agent-grid">
          {agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>

        {/* Timeline */}
        <div className="v2r-timeline-panel">
          <h3 className="v2r-timeline-title">Validation Timeline</h3>
          <ValidationTimeline steps={timeline} />
        </div>
      </div>
    </motion.div>
  );
}

export type { ValidationResponse };

export function SuccessReport({
  validationResult,
  validationId,
  onReset,
}: {
  validationResult: NonNullable<ReturnType<typeof useValidation>['validationResult']>;
  validationId: string | null;
  onReset: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const report = validationResult.report_data as Record<string, unknown> | undefined;
  const score = validationResult.overall_score ?? (report?.overall_score as number | undefined);
  const rec = validationResult.recommendation ?? (report?.recommendation as string | undefined) ?? 'N/A';
  const swot = report?.swot as Record<string, string[]> | undefined;
  const nextSteps = report?.next_steps as string[] | undefined;
  const scores = report?.scores as Record<string, number> | undefined;
  const executiveSummary = typeof report?.executive_summary === 'string' ? report.executive_summary : undefined;
  const marketOpportunity = typeof report?.market_opportunity === 'string' ? report.market_opportunity : undefined;
  const businessModel = typeof report?.business_model === 'string' ? report.business_model : undefined;

  const recColors: Record<string, string> = {
    PROCEED: '#10b981',
    PIVOT: '#f59e0b',
    PAUSE: '#ef4444',
  };
  const recColor = recColors[rec] ?? '#6366f1';

  const pdfUrl = validationId ? validationService.getPDFDownloadUrl(validationId) : null;

  return (
    <motion.div
      className="v2r-report-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Scorecard banner */}
      <div className="v2r-report-banner">
        <div className="v2r-report-score-circle">
          <span className="v2r-report-score-num">{score?.toFixed(1) ?? '—'}</span>
          <span className="v2r-report-score-denom">/10</span>
        </div>
        <div>
          <h2 className="v2r-report-title">Validation Complete</h2>
          <p className="v2r-report-sub">Your startup idea has been analyzed by 8 specialized AI agents.</p>
          <span className="v2r-report-verdict" style={{ color: recColor, borderColor: recColor }}>
            {rec}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      {scores && (
        <div className="v2r-score-grid">
          {[
            { label: 'Market', key: 'market_score' },
            { label: 'Business Model', key: 'business_model_score' },
            { label: 'Feasibility', key: 'feasibility_score' },
            { label: 'Risk', key: 'risk_score' },
            { label: 'Confidence', key: 'confidence_score' },
          ].map(({ label, key }) => (
            <div key={key} className="v2r-score-card">
              <p className="v2r-score-card-label">{label}</p>
              <p className="v2r-score-card-val">{(scores[key] ?? 0).toFixed(1)}</p>
              <div className="v2r-score-bar-track">
                <motion.div
                  className="v2r-score-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${((scores[key] ?? 0) / 10) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Executive Summary */}
      {executiveSummary && (
        <div className="v2r-report-section">
          <h3 className="v2r-report-section-title">Executive Summary</h3>
          <p className="v2r-report-body">{executiveSummary}</p>
        </div>
      )}

      {/* Market + Business Model */}
      <div className="v2r-report-2col">
        {marketOpportunity && (
          <div className="v2r-report-section">
            <h3 className="v2r-report-section-title">📊 Market Opportunity</h3>
            <p className="v2r-report-body">{marketOpportunity}</p>
          </div>
        )}
        {businessModel && (
          <div className="v2r-report-section">
            <h3 className="v2r-report-section-title">💼 Business Model</h3>
            <p className="v2r-report-body">{businessModel}</p>
          </div>
        )}
      </div>

      {/* SWOT */}
      {swot && (
        <div className="v2r-report-section">
          <h3 className="v2r-report-section-title">SWOT Analysis</h3>
          <div className="v2r-swot-grid">
            {[
              { key: 'strengths', label: '💪 Strengths', color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
              { key: 'weaknesses', label: '⚡ Weaknesses', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
              { key: 'opportunities', label: '🚀 Opportunities', color: '#6366f1', bg: 'rgba(99,102,241,0.07)' },
              { key: 'threats', label: '⚠️ Threats', color: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
            ].map(({ key, label, color, bg }) => (
              <div key={key} className="v2r-swot-card" style={{ borderColor: color, background: bg }}>
                <p className="v2r-swot-label" style={{ color }}>{label}</p>
                <ul className="v2r-swot-list">
                  {(swot[key] ?? []).map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {(() => {
        const risks = report?.risks as Array<{type?: string, severity?: string, description?: string, mitigation?: string, name?: string}> | undefined;
        if (!risks || risks.length === 0) return null;
        return (
          <div className="v2r-report-section">
            <h3 className="v2r-report-section-title">Key Risks & Mitigations</h3>
            <div className="v2r-risk-grid">
              {risks.map((risk, i) => {
                const sev = risk.severity?.toLowerCase() || 'medium';
                const sevColors: Record<string, string> = {
                  high: '#ef4444',
                  medium: '#f59e0b',
                  low: '#10b981',
                };
                const c = sevColors[sev] || sevColors.medium;
                return (
                  <div key={i} className="v2r-risk-card" style={{ borderLeftColor: c }}>
                    <div className="v2r-risk-header">
                      <span className="v2r-risk-name">{risk.name || risk.type || 'Risk Factor'}</span>
                      <span className="v2r-risk-severity" style={{ color: c, backgroundColor: `${c}15` }}>{sev.toUpperCase()}</span>
                    </div>
                    <p className="v2r-risk-desc">{risk.description}</p>
                    {risk.mitigation && (
                      <div className="v2r-risk-mitigation">
                        <span className="v2r-risk-mitigation-label">Mitigation:</span>
                        <p>{risk.mitigation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <div className="v2r-report-section">
          <h3 className="v2r-report-section-title">Next Steps Roadmap</h3>
          <ol className="v2r-next-steps">
            {nextSteps.map((step, i) => (
              <li key={i} className="v2r-next-step-item">
                <span className="v2r-step-num">{i + 1}</span>
                <span className="v2r-step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Metadata Footer (Component 14) */}
      {validationResult && (
        <details className="v2r-metadata-section">
          <summary className="v2r-metadata-summary">Validation Metadata</summary>
          <div className="v2r-metadata-grid">
            {validationId && <div className="v2r-metadata-item"><span className="v2r-metadata-label">Validation ID</span><code className="v2r-metadata-value">{validationId}</code></div>}
            <div className="v2r-metadata-item"><span className="v2r-metadata-label">Generated On</span><span className="v2r-metadata-value">{new Date(validationResult.created_at).toLocaleString()}</span></div>
            {validationResult.report_schema_version && <div className="v2r-metadata-item"><span className="v2r-metadata-label">Report Version</span><span className="v2r-metadata-value">{validationResult.report_schema_version}</span></div>}
            {validationResult.prompt_version && <div className="v2r-metadata-item"><span className="v2r-metadata-label">Prompt Version</span><span className="v2r-metadata-value">{validationResult.prompt_version}</span></div>}
            {validationResult.llm_provider && <div className="v2r-metadata-item"><span className="v2r-metadata-label">LLM Provider</span><span className="v2r-metadata-value">{validationResult.llm_provider}</span></div>}
            {validationResult.llm_model && <div className="v2r-metadata-item"><span className="v2r-metadata-label">Model</span><span className="v2r-metadata-value">{validationResult.llm_model}</span></div>}
            <div className="v2r-metadata-item"><span className="v2r-metadata-label">Execution Mode</span><span className="v2r-metadata-value">V1 Single-LLM</span></div>
            {validationResult.processing_time_ms && <div className="v2r-metadata-item"><span className="v2r-metadata-label">Processing Time</span><span className="v2r-metadata-value">{(validationResult.processing_time_ms / 1000).toFixed(1)}s</span></div>}
          </div>
        </details>
      )}

      {/* V2 Multi-Agent Placeholders (Component 15 — hidden until V2 data present) */}
      {/* These fields will auto-appear when V2 engine populates them: */}
      {/* agent_execution_timeline, research_sources, web_evidence, */}
      {/* market_confidence, competitor_details, multi_agent_consensus */}

      {/* Actions */}
      <div className="v2r-report-actions-footer">
        <h3 className="v2r-report-actions-title">Ready to build or validate another startup?</h3>
        <div className="v2r-report-actions">
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="lg">
                ⬇ Download PDF Report
              </Button>
            </a>
          )}
          <Button variant="outline" onClick={onReset}>
            Validate Another Idea
          </Button>
          {user ? (
            <Button variant="outline" onClick={() => navigate('/founder/build-requests')}>
              Go to Dashboard
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/signup')}>
              Save to Portfolio
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/build-product')}>
            Build My Product
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function ValidationPage() {
  const { user } = useAuth();
  const {
    status,
    error,
    validationResult,
    agents,
    timeline,
    overallProgress,
      validationId,
    submit,
    reset,
  } = useValidation();

  const location = useLocation();
  const prefill = (location.state as any)?.prefill as {
    idea_description?: string;
    target_customer?: string;
    target_market?: string;
    founder_stage?: string;
  } | undefined;

  const [isTransitioning, setIsTransitioning] = useState(true);
  const [ideaDescription, setIdeaDescription] = useState(prefill?.idea_description ?? '');
  const [targetMarket, setTargetMarket] = useState(prefill?.target_market ?? '');
  const [targetCustomer, setTargetCustomer] = useState(prefill?.target_customer ?? '');
  const [founderStage, setFounderStage] = useState(prefill?.founder_stage ?? '');
  const [showPrefillBanner, setShowPrefillBanner] = useState(!!prefill?.idea_description);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ideaDescription.trim().length < 10) return;
    await submit(
      { idea_description: ideaDescription, target_customer: targetCustomer, target_market: targetMarket, founder_stage: founderStage },
      files,
      user ? 'workspace' : 'marketing'
    );
  };

  const isValid = ideaDescription.trim().length >= 10;
  const isProcessing = status === 'uploading' || status === 'queued' || status === 'streaming';

  return (
    <motion.div
      className="v2r-validate-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <CinematicTransitionOverlay isVisible={isTransitioning} message="Entering Vision2Real…" />
      <div className="v2r-validate-page__glow" aria-hidden="true" />
      <PremiumHero
        id="hero"
        badge="AI MULTI-AGENT SPECIALIST ENGINE"
        heading={
          <>
            Validate Your Startup Idea Through<br />Our Multi-Agent AI System
          </>
        }
        description="Get an enterprise-grade multi-agent AI validation before investing your time and money. Our specialized AI agents analyze your market, competitors, business model, and risk in real-time."
        primaryAction={{
          label: 'Start Validation',
          onClick: () => {
            document.getElementById('idea-desc')?.scrollIntoView({ behavior: 'smooth' });
          },
        }}
      />
      <main className="v2r-validation-page">
        <div className="v2r-validation-container">

        <AnimatePresence mode="wait">
          {/* ── IDLE / ERROR: Input Form ─────────────────────────────────────── */}
          {(status === 'idle' || status === 'error') && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="v2r-validation-card">
                {showPrefillBanner && (
                  <div className="v2r-prefill-banner">
                    <span>🔄</span>
                    <p>You’re creating a new validation based on a previous report. Feel free to update your idea before submitting.</p>
                    <button className="v2r-prefill-close" onClick={() => setShowPrefillBanner(false)} aria-label="Dismiss">×</button>
                  </div>
                )}
                {error && (
                  <div className="v2r-error-banner">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="v2r-form-section">
                    <label htmlFor="idea-desc">Describe your startup idea.</label>
                    <textarea
                      id="idea-desc"
                      rows={6}
                      placeholder="Explain the problem, your solution, who it helps, and why now."
                      value={ideaDescription}
                      onChange={(e) => setIdeaDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="v2r-form-section">
                    <label htmlFor="file-upload">Attachments (Optional)</label>
                    <div
                      className={`v2r-file-upload ${dragActive ? 'drag-active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
                      />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" style={{ margin: '0 auto', color: 'rgba(255,255,255,0.4)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p>Drag & Drop files here or click to browse</p>
                      <p style={{ fontSize: '11px', opacity: 0.6 }}>Supports PDF, DOCX, PPTX, TXT, PNG, JPG</p>
                    </div>
                    {files.length > 0 && (
                      <div className="v2r-file-list">
                        {files.map((file, idx) => (
                          <div key={idx} className="v2r-file-item">
                            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button type="button" onClick={() => removeFile(idx)} aria-label={`Remove file ${file.name}`}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="v2r-form-section" style={{ marginBottom: 0 }}>
                      <label htmlFor="target-customer">Who is it for?</label>
                      <input id="target-customer" type="text" placeholder="e.g. Busy founders, Developers" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} />
                    </div>
                    <div className="v2r-form-section" style={{ marginBottom: 0 }}>
                      <label htmlFor="target-market">Target Market</label>
                      <input id="target-market" type="text" placeholder="e.g. B2B SaaS, E-Commerce" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} />
                    </div>
                  </div>

                  <div className="v2r-form-section">
                    <label htmlFor="founder-stage">Current Stage</label>
                    <select id="founder-stage" value={founderStage} onChange={(e) => setFounderStage(e.target.value)}>
                      <option value="">Select your current stage...</option>
                      {STAGE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div className="v2r-validation-actions">
                    <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }} disabled={!isValid}>
                      Validate My Idea
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── PROCESSING: Live Dashboard ───────────────────────────────────── */}
          {isProcessing && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {status === 'queued' || status === 'uploading' ? (
                <motion.div className="v2r-processing-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="v2r-processing-spinner" />
                  <h2 className="v2r-processing-status">
                    {status === 'uploading' ? 'Uploading your idea...' : 'Starting AI validation team...'}
                  </h2>
                  <p className="v2r-processing-desc">
                    {status === 'uploading' ? 'Securely transferring your data.' : 'Spinning up 8 specialized AI agents.'}
                  </p>
                </motion.div>
              ) : (
                <LiveDashboard agents={agents} timeline={timeline} overallProgress={overallProgress} />
              )}
            </motion.div>
          )}

          {/* ── SUCCESS: Full Report ─────────────────────────────────────────── */}
          {status === 'success' && validationResult && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SuccessReport validationResult={validationResult} validationId={validationId} onReset={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
    </motion.div>
  );
}
