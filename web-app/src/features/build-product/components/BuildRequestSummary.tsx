/**
 * Vision2Real – Build & Sprint Request Summary Component
 * Premium review layout displaying actual founder inputs before final submission.
 */

import { Button } from '@/components/ui/Button';
import { useBuildContext } from '../context/BuildContext';

interface BuildRequestSummaryProps {
  onBackToEdit: () => void;
  onSubmitFinal: () => void;
}

export function BuildRequestSummary({ onBackToEdit, onSubmitFinal }: BuildRequestSummaryProps) {
  const { buildRequest, isSubmitting, submissionError } = useBuildContext();

  const {
    journeyPath,
    productDescription,
    sprintDescription,
    uploadedFiles,
    projectContext,
    contactInfo,
  } = buildRequest;

  const isSprint = journeyPath === 'reality_sprint';
  const descriptionText = isSprint ? (sprintDescription || productDescription) : productDescription;

  return (
    <div className="v2r-summary-section" id="build-request-summary">
      <div className="v2r-build-form-header">
        <span className="v2r-build-form-header__eyebrow">FINAL REVIEW</span>
        <h2 className="v2r-build-form-header__title">
          {isSprint ? 'Reality Sprint Request Summary' : 'Build Request Summary'}
        </h2>
        <p className="v2r-progress-header__subtitle">
          Please review your {isSprint ? 'validation sprint' : 'product vision'} details before submitting to our engineering team.
        </p>
      </div>

      {/* SECTION 1: PRODUCT / SPRINT VISION */}
      <div className="v2r-summary-card">
        <div className="v2r-summary-card__label">
          {isSprint ? '✓ Sprint & MVP Vision' : '✓ Product Vision'}
        </div>
        <div className="v2r-summary-card__val">{descriptionText || 'No description provided.'}</div>
      </div>

      {/* SECTION 2: SUPPORTING DOCUMENTS */}
      <div className="v2r-summary-card">
        <div className="v2r-summary-card__label">
          ✓ Supporting Documents ({uploadedFiles.length})
        </div>
        {uploadedFiles.length > 0 ? (
          <div className="v2r-upload-file-list" style={{ marginTop: 'var(--space-xs)' }}>
            {uploadedFiles.map((f) => (
              <span key={f.id} className="v2r-upload-chip">
                📄 {f.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="v2r-summary-card__val" style={{ color: 'var(--color-text-muted)' }}>
            No optional documents attached.
          </div>
        )}
      </div>

      {/* SECTION 3: PROJECT / SPRINT CONTEXT */}
      <div className="v2r-summary-card">
        <div className="v2r-summary-card__label">
          {isSprint ? '✓ Sprint Context' : '✓ Project Context'}
        </div>
        <div className="v2r-summary-grid">
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>CURRENT STAGE:</span>
            <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              {projectContext.currentStage}
            </div>
          </div>

          {!isSprint && projectContext.estimatedBudget && (
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ESTIMATED BUDGET:</span>
              <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                {projectContext.estimatedBudget}
              </div>
            </div>
          )}

          {isSprint && (
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>SPRINT PRICING:</span>
              <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                Starts from ₹5,000 (2–3 days delivery)
              </div>
            </div>
          )}

          {projectContext.additionalContext && (
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ADDITIONAL CONTEXT:</span>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {projectContext.additionalContext}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: CONTACT & ACCOUNT INFO */}
      <div className="v2r-summary-card">
        <div className="v2r-summary-card__label">✓ Contact &amp; Account Information</div>
        <div className="v2r-summary-grid">
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>FULL NAME:</span>
            <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              {contactInfo.name || 'Founder'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>WORK EMAIL:</span>
            <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              {contactInfo.email}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>PHONE / WHATSAPP:</span>
            <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              {contactInfo.phone || 'Not provided'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>PREFERRED CONTACT:</span>
            <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
              {contactInfo.preferredContactMethod}
            </div>
          </div>
        </div>
      </div>

      {/* SUBMISSION ERROR ALERT */}
      {submissionError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            marginTop: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            color: '#f87171',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)' }}>
              Submission Failed
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {submissionError}
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-2xl)' }}>
        <Button variant="outline" size="lg" onClick={onBackToEdit} disabled={isSubmitting}>
          Edit Details
        </Button>

        <Button variant="primary" size="lg" onClick={onSubmitFinal} disabled={isSubmitting}>
          <span>
            {isSubmitting
              ? 'Submitting Request...'
              : submissionError
              ? `Retry ${isSprint ? 'Sprint' : 'Build'} Request`
              : `Submit ${isSprint ? 'Sprint' : 'Build'} Request`}
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
