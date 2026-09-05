/**
 * Vision2Real – Build Request Detail Page / Tracking Portal (Stage 6.2 UX Polish)
 * Production tracking dashboard for founders to monitor project progress,
 * delivery phase steppers, timeline history, attached files, and communicate with the team.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  buildRequestApi,
  type BuildRequestResponse,
  type TimelineEventResponse,
  type MessageResponse,
} from '@/services/api/buildRequest';
import {
  getStatusConfig,
  getPriorityConfig,
  formatFileSize,
} from '../utils/buildRequestStatus';
import './BuildRequestDetailPage.css';

const WORKFLOW_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PLANNING', label: 'Planning' },
  { key: 'UI_DESIGN', label: 'UI/UX Design' },
  { key: 'BACKEND', label: 'Backend Dev' },
  { key: 'FRONTEND', label: 'Frontend Dev' },
  { key: 'TESTING', label: 'Testing & QA' },
  { key: 'DEPLOYMENT', label: 'Deployment' },
  { key: 'COMPLETED', label: 'Delivered' },
];

interface ExtendedMessage extends MessageResponse {
  isOptimistic?: boolean;
  hasFailed?: boolean;
}

export function BuildRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<BuildRequestResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventResponse[]>([]);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null);


  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Smart Auto-Scroll to bottom if already near bottom
  const scrollToBottomIfNear = useCallback(() => {
    if (!messagesListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom) {
      messagesListRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // Core Data Fetcher
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!id) return;
      if (!isSilent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const [reqData, timelineData, messagesData] = await Promise.all([
          buildRequestApi.getBuildRequest(id, true, { signal: controller.signal }),
          buildRequestApi.getTimeline(id, { signal: controller.signal }),
          buildRequestApi.getMessages(id, { signal: controller.signal }),
        ]);

        setRequest(reqData);
        setTimeline(timelineData);
        setMessages(messagesData);
        scrollToBottomIfNear();
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        console.error('Failed to load build request details:', err);
        setError(err?.response?.data?.detail || err?.message || 'Build Request not found.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, scrollToBottomIfNear]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SMART CONDITIONAL POLLING (Component 1) - Immediately stops when COMPLETED or CANCELLED
  useEffect(() => {
    if (!request) return;
    if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      return; // Stop polling completely for terminal statuses
    }

    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [request?.status, fetchData]);

  // Handle Secure Attachment Download
  const handleDownload = async (attachmentId: string, originalFilename: string) => {
    if (!id) return;
    setDownloadingAttId(attachmentId);
    try {
      const blob = await buildRequestApi.downloadAttachment(id, attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download attachment:', err);
      toast.error('Failed to download attachment file.');
    } finally {
      setDownloadingAttId(null);
    }
  };

  // Handle Post Founder Message (Component 2)
  const handleSendMessage = async (e?: React.FormEvent, retryMessage?: ExtendedMessage) => {
    if (e) e.preventDefault();
    const content = retryMessage ? retryMessage.message : newMessageText.trim();
    if (!id || !content || isSendingMessage) return;

    if (!retryMessage) {
      setNewMessageText('');
    }
    setIsSendingMessage(true);

    const tempId = retryMessage ? retryMessage.id : `temp-${Date.now()}`;
    const tempMsg: ExtendedMessage = {
      id: tempId,
      build_request_id: id,
      sender_type: 'FOUNDER',
      sender_id: 'current-user',
      message: content,
      is_read: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      hasFailed: false,
    };

    if (retryMessage) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? tempMsg : m)));
    } else {
      setMessages((prev) => [...prev, tempMsg]);
    }

    try {
      const saved = await buildRequestApi.postMessage(id, { message: content });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      const updatedTimeline = await buildRequestApi.getTimeline(id);
      setTimeline(updatedTimeline);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message. Click retry.');
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isOptimistic: false, hasFailed: true } : m))
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <main className="v2r-detail-page" style={{ opacity: 0.6 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', height: '30px', width: '200px', marginBottom: '20px' }} />
        <div style={{ background: 'rgba(255,255,255,0.08)', height: '40px', width: '60%', marginBottom: '30px' }} />
        <div style={{ background: 'rgba(255,255,255,0.05)', height: '300px', width: '100%' }} />
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="v2r-detail-page">
        <button className="v2r-back-link" onClick={() => navigate('/founder/build-requests')}>
          ← Back to Build Requests
        </button>
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            color: '#f87171',
            textAlign: 'center',
          }}
          role="alert"
        >
          <h2>⚠️ Build Request Not Found</h2>
          <p>{error || 'The requested Build Request could not be loaded.'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/founder/build-requests')}>
            Return to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  const statusConfig = getStatusConfig(request.status);
  const priorityConfig = getPriorityConfig(request.priority);
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.key === request.status);

  // Derived Remaining Duration (Only if backend provides starting data, never fabricated)
  let derivedRemainingDays: number | null = null;
  if (request.estimated_duration_days && request.started_at) {
    const elapsedDays = Math.floor(
      (Date.now() - new Date(request.started_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    derivedRemainingDays = Math.max(0, request.estimated_duration_days - elapsedDays);
  }

  return (
    <main className="v2r-detail-page" aria-label={`Tracking Portal: ${request.title}`}>
      {/* HEADER & NAVIGATION */}
      <header className="v2r-detail-header">
        <button className="v2r-back-link" onClick={() => navigate('/founder/build-requests')}>
          ← Back to Build Requests Dashboard
        </button>

        <div className="v2r-detail-title-row">
          <div>
            <span className="v2r-build-page-header__eyebrow">
              {request.startup_name || 'Vision2Real Startup'} • ID: {request.id.slice(0, 8)}...
            </span>
            <h1 className="v2r-detail-title">{request.title}</h1>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <span
              className="v2r-badge"
              style={{
                background: statusConfig.bgStyle,
                color: statusConfig.textStyle,
                border: `1px solid ${statusConfig.borderStyle}`,
              }}
            >
              {statusConfig.icon} {statusConfig.label}
            </span>

            <span
              className="v2r-badge"
              style={{
                background: priorityConfig.bgStyle,
                color: priorityConfig.textStyle,
              }}
            >
              {priorityConfig.label} PRIORITY
            </span>

            <button
              type="button"
              className="v2r-refresh-btn"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              title="Refresh tracking data"
            >
              🔄 {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* REORGANIZED PRODUCTION SECTIONS (Component 8) */}
      <div className="v2r-detail-grid">
        {/* LEFT COLUMN: OVERVIEW, PROGRESS, TIMELINE, METADATA */}
        <div>
          {/* SECTION 1: DELIVERY PROGRESS OVERVIEW & RICH STEPPER (Component 3) */}
          <section className="v2r-detail-card" aria-label="Delivery Progress Stepper">
            <h2 className="v2r-detail-card__title">
              <span>🚀 Delivery Phase &amp; Progress Stepper</span>
            </h2>

            <div className="v2r-tracking-progress-header">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>DEVELOPMENT PROGRESS</span>
              <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent, #6366f1)', fontSize: 'var(--text-lg)' }}>
                {request.progress_percentage}%
              </span>
            </div>

            <div
              className="v2r-tracking-progress-track"
              role="progressbar"
              aria-valuenow={request.progress_percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="v2r-tracking-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, request.progress_percentage))}%` }}
              />
            </div>

            {/* Rich Workflow Stepper with icons */}
            <div className="v2r-rich-stepper">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex || request.status === 'COMPLETED';
                const isActive = idx === currentStepIndex && request.status !== 'COMPLETED';

                return (
                  <div
                    key={step.key}
                    className={`v2r-rich-step ${isActive ? 'v2r-rich-step--active' : ''} ${
                      isCompleted ? 'v2r-rich-step--completed' : ''
                    }`}
                  >
                    <div className="v2r-rich-step__icon">
                      {isCompleted ? '✓' : isActive ? '●' : '○'}
                    </div>
                    <span className="v2r-rich-step__label">{step.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="v2r-brief-grid">
              <div>
                <div className="v2r-brief-item__label">CURRENT PHASE</div>
                <div className="v2r-brief-item__value">{request.current_phase || statusConfig.label}</div>
              </div>

              <div>
                <div className="v2r-brief-item__label">ACTIVE MILESTONE</div>
                <div className="v2r-brief-item__value">{request.current_milestone || 'In Review'}</div>
              </div>

              <div>
                <div className="v2r-brief-item__label">ESTIMATED DURATION</div>
                <div className="v2r-brief-item__value">
                  {request.estimated_duration_days ? `${request.estimated_duration_days} Days` : 'TBD'}
                </div>
              </div>

              <div>
                <div className="v2r-brief-item__label">REMAINING DAYS</div>
                <div className="v2r-brief-item__value">
                  {derivedRemainingDays !== null ? `${derivedRemainingDays} Days` : '—'}
                </div>
              </div>
            </div>

            {request.current_work && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span className="v2r-brief-item__label">ACTIVE WORK DESCRIPTION</span>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {request.current_work}
                </p>
              </div>
            )}
          </section>

          {/* SECTION 2: PROJECT BRIEFING SUMMARY */}
          <section className="v2r-detail-card" aria-label="Product Specification Brief">
            <h2 className="v2r-detail-card__title">
              <span>📋 Product Briefing Specification</span>
            </h2>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {request.description}
            </p>

            <div className="v2r-brief-grid" style={{ marginTop: 'var(--space-md)' }}>
              <div>
                <div className="v2r-brief-item__label">CATEGORY</div>
                <div className="v2r-brief-item__value">{request.product_category || 'Not specified'}</div>
              </div>

              <div>
                <div className="v2r-brief-item__label">TARGET CUSTOMER</div>
                <div className="v2r-brief-item__value">{request.target_customer || 'Not specified'}</div>
              </div>

              <div>
                <div className="v2r-brief-item__label">TARGET MARKET</div>
                <div className="v2r-brief-item__value">{request.target_market || 'Not specified'}</div>
              </div>

              <div>
                <div className="v2r-brief-item__label">FOUNDER STAGE</div>
                <div className="v2r-brief-item__value">{request.founder_stage || 'Idea'}</div>
              </div>
            </div>

            {/* Extra Metadata Context */}
            {request.extra_metadata && Object.keys(request.extra_metadata).length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span className="v2r-brief-item__label">ADDITIONAL SPECIFICATIONS</span>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: 'var(--space-2xs)' }}>
                  {Object.entries(request.extra_metadata).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <strong style={{ color: 'var(--color-text-primary)' }}>{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: ATTACHMENTS GALLERY (Component 7) */}
          <section className="v2r-detail-card" aria-label="Attached Documents">
            <h2 className="v2r-detail-card__title">
              <span>📎 Supporting Documents &amp; Attachments ({request.attachments.length})</span>
            </h2>

            {request.attachments.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                No file attachments uploaded for this request.
              </p>
            ) : (
              <div className="v2r-attachment-grid">
                {request.attachments.map((att) => {
                  const isImage = att.mime_type.startsWith('image/');
                  const isPdf = att.mime_type.includes('pdf');
                  const isZip = att.mime_type.includes('zip') || att.mime_type.includes('compressed');

                  return (
                    <div key={att.id} className="v2r-attachment-card">
                      <div className="v2r-attachment-card__header">
                        <span className="v2r-attachment-card__icon">
                          {isPdf ? '📕' : isZip ? '📦' : isImage ? '🖼️' : '📄'}
                        </span>
                        <span className="v2r-attachment-card__filename">{att.original_filename}</span>
                      </div>

                      <div className="v2r-attachment-card__meta">
                        {formatFileSize(att.file_size)} • Uploaded {new Date(att.created_at).toLocaleDateString()}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingAttId === att.id}
                        onClick={() => handleDownload(att.id, att.original_filename)}
                      >
                        {downloadingAttId === att.id ? 'Downloading...' : 'Download ⬇'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: MESSAGING THREAD & CHRONOLOGICAL TIMELINE */}
        <div>
          {/* SECTION 4: FOUNDER ↔ ADMIN MESSAGING THREAD (Component 2) */}
          <section className="v2r-detail-card" aria-label="Founder and Team Messaging Thread">
            <h2 className="v2r-detail-card__title">
              <span>💬 Founder ↔ Team Communication</span>
            </h2>

            <div className="v2r-messages-container">
              <div className="v2r-messages-list" ref={messagesListRef}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: 'auto 0', fontSize: 'var(--text-xs)' }}>
                    No messages yet. Send a message below to reach the engineering team.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`v2r-message-bubble ${
                        msg.sender_type === 'FOUNDER' ? 'v2r-message-bubble--founder' : 'v2r-message-bubble--admin'
                      }`}
                    >
                      <div>{msg.message}</div>
                      <div className="v2r-message-meta">
                        <span>{msg.sender_type === 'FOUNDER' ? 'You (Founder)' : 'Vision2Real Team'}</span>
                        <span>
                          {msg.isOptimistic ? (
                            'Sending...'
                          ) : msg.hasFailed ? (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(undefined, msg)}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Failed (Click Retry)
                            </button>
                          ) : (
                            `${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓`
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="v2r-message-composer">
                <textarea
                  className="v2r-message-input"
                  placeholder="Type a message to the engineering team... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Write a message to the engineering team"
                />
                <Button type="submit" variant="primary" size="sm" disabled={isSendingMessage || !newMessageText.trim()}>
                  {isSendingMessage ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </div>
          </section>

          {/* SECTION 5: CHRONOLOGICAL PROGRESS TIMELINE */}
          <section className="v2r-detail-card" aria-label="Chronological Progress Timeline">
            <h2 className="v2r-detail-card__title">
              <span>📜 Chronological Progress Timeline</span>
            </h2>

            {timeline.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                No timeline events logged yet.
              </p>
            ) : (
              <div className="v2r-timeline-list">
                {timeline.map((ev) => (
                  <div key={ev.id} className="v2r-timeline-item">
                    <div className="v2r-timeline-item__title">{ev.title}</div>
                    <div className="v2r-timeline-item__date">{new Date(ev.created_at).toLocaleString()}</div>
                    {ev.description && <div className="v2r-timeline-item__desc">{ev.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
