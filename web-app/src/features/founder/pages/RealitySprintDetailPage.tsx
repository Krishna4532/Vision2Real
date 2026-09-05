/**
 * Vision2Real – Reality Sprint Detail View Page (Stage 5.3)
 * Production-ready detail page with dynamic status banner, animated progress engine,
 * expanded lifecycle timeline, timestamp-verified activity history, attachment downloads,
 * system metadata copy helper, and conditional V2 deliverables.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { realitySprintApi, type RealitySprintRequest } from '@/services/api/realitySprint';
import { getStatusConfig, getStatusBannerConfig, getPriorityBadgeConfig } from '../utils/realitySprintStatus';
import { getFileIconConfig } from '../utils/fileIcons';
import { getDisplayStartupName, formatDualDate, formatBytes, copyToClipboard } from '../utils/sprintHelpers';
import { RealitySprintProgress } from '../components/reality-sprint/RealitySprintProgress';
import { RealitySprintTimeline } from '../components/reality-sprint/RealitySprintTimeline';
import { RealitySprintActivityFeed } from '../components/reality-sprint/RealitySprintActivityFeed';
import { RealitySprintDeliverables } from '../components/reality-sprint/RealitySprintDeliverables';
import { SprintDetailSkeleton } from '../components/reality-sprint/RealitySprintSkeleton';
import './RealitySprintDetailPage.css';

export function RealitySprintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sprint, setSprint] = useState<RealitySprintRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null);

  // Template prefill confirmation modal
  const [confirmSprintModal, setConfirmSprintModal] = useState<boolean>(false);

  const fetchSprintDetail = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    realitySprintApi
      .getRealitySprint(id, true)
      .then((data) => {
        setSprint(data);
      })
      .catch((err) => {
        console.error('Failed to fetch Reality Sprint detail:', err);
        setError(err?.response?.data?.detail || 'Reality Sprint request not found or server is unreachable.');
        toast.error('Failed to load Reality Sprint details.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchSprintDetail();
  }, [fetchSprintDetail]);

  const handleBack = () => {
    navigate('/founder/reality-sprints');
  };

  const handleDownloadFile = async (attId: string, filename: string) => {
    if (!sprint) return;
    setDownloadingAttId(attId);
    try {
      const blob = await realitySprintApi.downloadAttachment(sprint.id, attId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      toast.error(`Failed to download ${filename}`);
    } finally {
      setDownloadingAttId(null);
    }
  };

  const handleConfirmSubmitSimilar = () => {
    if (!sprint) return;

    const prefillData = {
      description: sprint.description,
      title: sprint.title,
      startup_name: sprint.startup_name,
      founder_stage: sprint.founder_stage,
      target_customer: sprint.target_customer,
      target_market: sprint.target_market,
    };

    sessionStorage.setItem('v2r_sprint_prefill', JSON.stringify(prefillData));
    setConfirmSprintModal(false);
    navigate('/build-product', { state: { prefillSprint: prefillData } });
  };

  if (isLoading) {
    return (
      <div className="v2r-sprint-detail-container">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Button variant="outline" size="sm" onClick={handleBack}>
            ← Back to Reality Sprints
          </Button>
        </div>
        <SprintDetailSkeleton />
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="v2r-sprint-detail-container" style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-lg)' }}>
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-2xl)',
            maxWidth: '540px',
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>⚠️</div>
          <h2 style={{ fontSize: 'var(--text-xl)', color: '#f87171', marginBottom: 'var(--space-xs)' }}>
            Reality Sprint Request Not Found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-sm)' }}>
            {error || 'The requested sprint could not be loaded. Please ensure the Request ID is valid and that you have permission to view it.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
            <Button variant="outline" size="sm" onClick={handleBack}>
              ← Back to Reality Sprints
            </Button>
            <Button variant="primary" size="sm" onClick={fetchSprintDetail}>
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(sprint.status);
  const bannerCfg = getStatusBannerConfig(sprint.status);
  const startupDisplayName = getDisplayStartupName(sprint);
  const createdDate = formatDualDate(sprint.created_at);
  const updatedDate = formatDualDate(sprint.updated_at);
  const durationLabel = sprint.estimated_duration_days
    ? `${sprint.estimated_duration_days} days`
    : 'Not specified';

  return (
    <div className="v2r-sprint-detail-container">
      {/* STICKY HEADER */}
      <header className="v2r-sticky-header">
        <div className="v2r-sticky-header__info">
          <Button variant="outline" size="sm" onClick={handleBack}>
            ← Back
          </Button>
          <div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {startupDisplayName}
            </div>
            <h1 className="v2r-sticky-header__title">{sprint.title}</h1>
          </div>
          <span className={`v2r-status-badge ${statusCfg.badgeClass}`}>
            <span className="v2r-status-badge__dot" style={{ backgroundColor: statusCfg.dotColor }} />
            {statusCfg.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <Button variant="outline" size="sm" onClick={() => setConfirmSprintModal(true)}>
            Submit Similar Sprint
          </Button>
          {sprint.attachments && sprint.attachments.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handleDownloadFile(
                  sprint.attachments[0].id,
                  sprint.attachments[0].original_filename || sprint.attachments[0].filename
                )
              }
            >
              Download Attachment ({sprint.attachments.length})
            </Button>
          )}
        </div>
      </header>

      {/* COMPONENT 5: SPRINT STATUS BANNER & PROGRESS ENGINE */}
      <section
        className="v2r-status-banner"
        style={{
          backgroundColor: bannerCfg.bg,
          borderColor: bannerCfg.borderColor,
        }}
      >
        <div className="v2r-status-banner__top">
          <div className="v2r-status-banner__left">
            <div className="v2r-status-banner__icon-box" style={{ color: bannerCfg.color }}>
              {bannerCfg.icon}
            </div>
            <div>
              <h2 className="v2r-status-banner__headline">{bannerCfg.headline}</h2>
              <p className="v2r-status-banner__subtext">{bannerCfg.subtext}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                color: bannerCfg.color,
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 12px',
                borderRadius: '999px',
                border: `1px solid ${bannerCfg.borderColor}`,
              }}
            >
              Estimated Duration: {durationLabel}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-xs)' }}>
          <RealitySprintProgress status={sprint.status} height={8} />
        </div>
      </section>

      {/* COMPONENT 6: REQUEST BRIEF & OVERVIEW */}
      <section className="v2r-detail-section">
        <h2 className="v2r-detail-section__title">
          <span>📋</span> Request Brief &amp; Critical User Journey
        </h2>

        <div>
          <div
            style={{
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            PROTOTYPE SCOPE &amp; PROBLEM STATEMENT
          </div>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-primary)', lineHeight: '1.65', whiteSpace: 'pre-line' }}>
            {sprint.description}
          </p>
        </div>

        <div className="v2r-metadata-grid" style={{ marginTop: 'var(--space-xs)' }}>
          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Startup Name</span>
            <span className="v2r-metadata-box__val">{startupDisplayName}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Founder Stage</span>
            <span className="v2r-metadata-box__val">{sprint.founder_stage || 'Idea'}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Target Customer</span>
            <span className="v2r-metadata-box__val">{sprint.target_customer || 'General Target Audience'}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Target Market</span>
            <span className="v2r-metadata-box__val">{sprint.target_market || 'Technology'}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Priority Level</span>
            <span
              className="v2r-metadata-box__val"
              style={{ color: getPriorityBadgeConfig(sprint.priority).color }}
            >
              {getPriorityBadgeConfig(sprint.priority).label}
            </span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Current Stage</span>
            <span className="v2r-metadata-box__val">{statusCfg.label}</span>
          </div>
        </div>
      </section>

      {/* TWO COLUMN SPLIT: TIMELINE + ACTIVITY FEED */}
      <div className="v2r-detail-grid-split">
        {/* COMPONENT 3: EXPANDED LIFECYCLE TIMELINE */}
        <section className="v2r-detail-section">
          <h2 className="v2r-detail-section__title">
            <span>⏱️</span> Sprint Execution Timeline
          </h2>
          <RealitySprintTimeline sprint={sprint} />
        </section>

        {/* COMPONENT 4: LIVE ACTIVITY FEED */}
        <section className="v2r-detail-section">
          <h2 className="v2r-detail-section__title">
            <span>📡</span> Activity &amp; Milestone History
          </h2>
          <RealitySprintActivityFeed sprint={sprint} />
        </section>
      </div>

      {/* ATTACHMENTS SECTION */}
      <section className="v2r-detail-section">
        <h2 className="v2r-detail-section__title">
          <span>📎</span> Attached Documentation &amp; Assets ({sprint.attachments?.length || 0})
        </h2>

        {!sprint.attachments || sprint.attachments.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-lg)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontStyle: 'italic',
              background: 'rgba(30, 41, 59, 0.3)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
            }}
          >
            Attachments will appear here. No files attached to this Reality Sprint request.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {sprint.attachments.map((att) => {
              const fileIcon = getFileIconConfig(att.mime_type, att.original_filename || att.filename);
              const isDownloading = downloadingAttId === att.id;
              const attDate = formatDualDate(att.created_at);

              return (
                <div key={att.id} className="v2r-attachment-row">
                  <div className="v2r-attachment-file-info">
                    <div
                      className="v2r-attachment-icon-badge"
                      style={{ backgroundColor: fileIcon.bgColor, color: fileIcon.color }}
                    >
                      {fileIcon.iconType === 'pdf'
                        ? '📄'
                        : fileIcon.iconType === 'word'
                        ? '📝'
                        : fileIcon.iconType === 'image'
                        ? '🖼️'
                        : fileIcon.iconType === 'archive'
                        ? '📦'
                        : '📁'}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--weight-bold)',
                          color: 'var(--color-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {att.original_filename || att.filename}
                      </div>
                      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
                        {formatBytes(att.file_size)} · Uploaded {attDate.relative} ({attDate.absolute})
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDownloading}
                    onClick={() => handleDownloadFile(att.id, att.original_filename || att.filename)}
                  >
                    {isDownloading ? 'Downloading...' : 'Download File'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMPONENT 7: FUTURE DELIVERABLES & AGENT ARTIFACTS */}
      <section className="v2r-detail-section">
        <h2 className="v2r-detail-section__title">
          <span>📦</span> Sprint Deliverables &amp; Technical Assets
        </h2>
        <RealitySprintDeliverables sprint={sprint} />
      </section>

      {/* SYSTEM METADATA & VERSIONING */}
      <section className="v2r-detail-section">
        <h2 className="v2r-detail-section__title">
          <span>⚙️</span> System Metadata &amp; Versioning
        </h2>

        <div className="v2r-metadata-grid">
          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Request ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: '2px' }}>
              <span
                className="v2r-metadata-box__val"
                style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}
              >
                {sprint.id}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(sprint.id, 'Request ID')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-accent)',
                  fontSize: '0.9rem',
                  padding: '2px',
                }}
                title="Copy Request ID"
                aria-label="Copy Request ID"
              >
                📋
              </button>
            </div>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Execution Mode</span>
            <span className="v2r-metadata-box__val">{sprint.execution_mode}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Schema Version</span>
            <span className="v2r-metadata-box__val">v{sprint.version}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Request Source</span>
            <span className="v2r-metadata-box__val">{sprint.request_source}</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Created Timestamp</span>
            <span className="v2r-metadata-box__val">{createdDate.relative} ({createdDate.absolute})</span>
          </div>

          <div className="v2r-metadata-box">
            <span className="v2r-metadata-box__label">Last Updated</span>
            <span className="v2r-metadata-box__val">{updatedDate.relative} ({updatedDate.absolute})</span>
          </div>

          {/* V2 Future Metadata Fields (Rendered only when present in extra_metadata) */}
          {sprint.extra_metadata?.pipeline_version && (
            <div className="v2r-metadata-box">
              <span className="v2r-metadata-box__label">Pipeline Version</span>
              <span className="v2r-metadata-box__val">{sprint.extra_metadata.pipeline_version}</span>
            </div>
          )}

          {sprint.extra_metadata?.model_used && (
            <div className="v2r-metadata-box">
              <span className="v2r-metadata-box__label">AI Model Used</span>
              <span className="v2r-metadata-box__val">{sprint.extra_metadata.model_used}</span>
            </div>
          )}
        </div>
      </section>

      {/* CONFIRMATION MODAL FOR SUBMIT SIMILAR SPRINT */}
      <AnimatePresence>
        {confirmSprintModal && (
          <div className="v2r-modal-backdrop" onClick={() => setConfirmSprintModal(false)}>
            <motion.div
              className="v2r-modal-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Submit Similar Reality Sprint?
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-lg)',
                  lineHeight: '1.5',
                }}
              >
                Create another Reality Sprint using <strong>{startupDisplayName}</strong> as a prefilled template?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
                <Button variant="outline" size="sm" onClick={() => setConfirmSprintModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleConfirmSubmitSimilar}>
                  Continue to Form
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
