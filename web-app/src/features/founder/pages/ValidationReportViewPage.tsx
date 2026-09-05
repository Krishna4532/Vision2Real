import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { validationService } from '@/services/validation/validationService';
import { SuccessReport } from '@/features/validation/pages/ValidationPage';
import type { ValidationResponse } from '@/services/validation/types';
import './ValidationReportViewPage.css';

// ── Validation Timeline (Component 18) ───────────────────────────────────────

interface TimelineEvent {
  label: string;
  status: 'completed' | 'pending';
  timestamp?: string;
}

// Build timeline from validation data — works for V1 and will be enhanced for V2
function buildTimeline(validation: ValidationResponse): TimelineEvent[] {
  const status = validation.status;
  const stages: Array<{ key: string; label: string }> = [
    { key: 'VALIDATION_SUBMITTED', label: 'Validation Submitted' },
    { key: 'VALIDATION_STARTED', label: 'Analysis Started' },
    { key: 'PROCESSING', label: 'Processing Idea' },
    { key: 'COMPLETED', label: 'Report Generated' },
    { key: 'PDF', label: 'PDF Generated' },
  ];

  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  return stages.map((stage, i) => {
    let stepStatus: 'completed' | 'pending' = 'pending';
    if (isCompleted) {
      stepStatus = 'completed';
    } else if (isFailed) {
      stepStatus = i === 0 ? 'completed' : 'pending';
    } else if (status === 'PROCESSING') {
      stepStatus = i <= 2 ? 'completed' : 'pending';
    } else if (status === 'QUEUED') {
      stepStatus = i === 0 ? 'completed' : 'pending';
    }

    return {
      label: stage.label,
      status: stepStatus,
      timestamp: i === 0 ? validation.created_at : i === stages.length - 1 ? validation.updated_at : undefined,
    };
  });
}

function ValidationTimeline({ validation }: { validation: ValidationResponse }) {
  const [open, setOpen] = useState(false);
  const timeline = buildTimeline(validation);

  return (
    <div className="vrvp-timeline-wrap">
      <button
        className="vrvp-timeline-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="validation-timeline"
      >
        <span>Validation Timeline</span>
        <span className="vrvp-toggle-icon" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="validation-timeline"
            className="vrvp-timeline"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="vrvp-timeline-inner">
              {timeline.map((event, i) => (
                <div key={i} className="vrvp-timeline-step">
                  <div className="vrvp-timeline-connector">
                    <div className={`vrvp-timeline-node ${event.status === 'completed' ? 'vrvp-timeline-node--done' : 'vrvp-timeline-node--pending'}`}>
                      {event.status === 'completed' ? '✓' : '○'}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`vrvp-timeline-line ${event.status === 'completed' ? 'vrvp-timeline-line--done' : ''}`} />
                    )}
                  </div>
                  <div className="vrvp-timeline-content">
                    <p className={`vrvp-timeline-label ${event.status === 'completed' ? 'vrvp-timeline-label--done' : 'vrvp-timeline-label--pending'}`}>
                      {event.label}
                    </p>
                    {event.timestamp && (
                      <p className="vrvp-timeline-time">
                        {new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sticky Header (Component 12) ─────────────────────────────────────────────

function StickyHeader({ validation, onBack, onValidateAgain }: {
  validation: ValidationResponse;
  onBack: () => void;
  onValidateAgain: () => void;
}) {
  const report = validation.report_data as Record<string, unknown> | undefined;
  const score = validation.overall_score ?? (report?.overall_score as number | undefined);
  const rec = validation.recommendation ?? (report?.recommendation as string | undefined);
  const confidence = (report?.scores as Record<string, number> | undefined)?.confidence_score;
  const pdfUrl = validationService.getPDFDownloadUrl(validation.id);

  // Derive title from first ~6 words of idea
  const idea = validation.inputs?.idea_description ?? '';
  const words = idea.split(/\s+/);
  const title = words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '');

  const recColors: Record<string, string> = {
    PROCEED: '#10b981',
    PIVOT: '#f59e0b',
    PAUSE: '#ef4444',
    'DO NOT PROCEED': '#ef4444',
  };
  const recColor = rec ? recColors[rec.toUpperCase()] ?? '#6366f1' : '#6366f1';

  return (
    <motion.div
      className="vrvp-sticky-header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="vrvp-sticky-inner">
        <button className="vrvp-back-btn" onClick={onBack} aria-label="Back to reports">
          ← Reports
        </button>
        <div className="vrvp-sticky-info">
          {title && <h2 className="vrvp-sticky-title">{title}</h2>}
          {score !== undefined && score !== null && (
            <span className="vrvp-sticky-score">{score.toFixed(1)}<span style={{ opacity: 0.5, fontSize: '0.7em' }}>/10</span></span>
          )}
          {rec && (
            <span className="vrvp-sticky-rec" style={{ color: recColor, borderColor: `${recColor}44`, background: `${recColor}12` }}>
              {rec}
            </span>
          )}
          {confidence !== undefined && (
            <span className="vrvp-sticky-confidence">Confidence: {confidence.toFixed(1)}</span>
          )}
        </div>
        <div className="vrvp-sticky-actions">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">Download PDF</Button>
          </a>
          <Button variant="outline" size="sm" onClick={onValidateAgain}>Validate Again</Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="vrvp-skeleton-wrap">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="vrvp-skeleton vrvp-skeleton-block" style={{ height: i === 0 ? 120 : 60, width: i % 2 === 0 ? '100%' : '75%' }} />
      ))}
    </div>
  );
}

// ── Main View Page ────────────────────────────────────────────────────────────

export function ValidationReportViewPage() {
  const { validationId } = useParams<{ validationId: string }>();
  const navigate = useNavigate();
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!validationId) return;
    setLoading(true);
    setError(null);
    validationService.getValidation(validationId)
      .then(v => setValidation(v))
      .catch(err => {
        const msg = err?.response?.status === 404
          ? 'Report not found or you do not have access to this validation.'
          : err?.response?.status === 401
          ? 'Please log in to view this report.'
          : 'Failed to load report. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [validationId]);

  const handleValidateAgain = () => {
    if (!validation) return;
    navigate('/validate', {
      state: {
        prefill: {
          idea_description: validation.inputs?.idea_description,
          target_customer: validation.inputs?.target_customer,
          target_market: validation.inputs?.target_market,
          founder_stage: validation.inputs?.founder_stage,
        },
      },
    });
  };

  // Adapt ValidationResponse to match SuccessReport's expected validationResult type
  const adaptedResult = validation ? {
    ...validation,
    report_data: validation.report_data ?? undefined,
  } : null;

  return (
    <div className="vrvp-page" ref={scrollRef}>
      {/* Sticky Header (Component 12) */}
      {validation && (
        <StickyHeader
          validation={validation}
          onBack={() => navigate('/founder/validations')}
          onValidateAgain={handleValidateAgain}
        />
      )}

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <motion.div className="vrvp-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="vrvp-error-icon">⚠️</div>
          <h2 className="vrvp-error-title">Couldn't load this report.</h2>
          <p className="vrvp-error-desc">{error}</p>
          <div className="vrvp-error-actions">
            <Button variant="primary" onClick={() => navigate('/founder/validations')}>
              Back to Reports
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      ) : validation && adaptedResult ? (
        <motion.div
          className="vrvp-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Validation Timeline (Component 18) */}
          <ValidationTimeline validation={validation} />

          {/* Reuse existing SuccessReport — the same renderer used for new validations */}
          <SuccessReport
            validationResult={adaptedResult as any}
            validationId={validationId ?? null}
            onReset={() => navigate('/founder/validations')}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
