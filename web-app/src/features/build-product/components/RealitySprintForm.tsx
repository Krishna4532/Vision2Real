/**
 * Vision2Real – Reality Sprint Form Component
 * Dedicated request form for validating a single critical user journey / MVP prototype.
 * Includes Sprint Description, upload, stage, pricing guidance, and account creation handoff.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { OptionalUpload } from '@/features/validate-idea/components/OptionalUpload';
import { useBuildContext } from '../context/BuildContext';
import type { BuildStageOption, PreferredContactMethod } from '@/types/buildProduct';

const STAGE_OPTIONS: BuildStageOption[] = [
  'Idea',
  'Validated Idea',
  'Prototype',
  'MVP',
  'Existing Product',
  'Redesign',
  'Scaling',
];

interface RealitySprintFormProps {
  onProceedToSummary: () => void;
}

export function RealitySprintForm({ onProceedToSummary }: RealitySprintFormProps) {
  const location = useLocation();
  const {
    buildRequest,
    selectJourneyPath,
    updateSprintDescription,
    updateUploadedFiles,
    updateProjectContext,
    updateContactInfo,
  } = useBuildContext();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [prefillSource, setPrefillSource] = useState<string | null>(null);

  // Enforce explicit REALITY_SPRINT submission type on form mount
  useEffect(() => {
    selectJourneyPath('reality_sprint');
  }, [selectJourneyPath]);

  useEffect(() => {
    try {
      const statePrefill = location.state?.prefillSprint;
      const sessionPrefillStr = sessionStorage.getItem('v2r_sprint_prefill');
      const prefillData = statePrefill || (sessionPrefillStr ? JSON.parse(sessionPrefillStr) : null);

      if (prefillData) {
        if (prefillData.description) {
          updateSprintDescription(prefillData.description);
        }
        if (prefillData.founder_stage) {
          updateProjectContext({ currentStage: prefillData.founder_stage });
        }
        if (prefillData.target_market || prefillData.target_customer) {
          updateProjectContext({
            additionalContext: `Target Market: ${prefillData.target_market || ''}. Target Customer: ${prefillData.target_customer || ''}`,
          });
        }
        setPrefillSource(prefillData.title || prefillData.startup_name || 'Previous Sprint');
        sessionStorage.removeItem('v2r_sprint_prefill');
      }
    } catch (e) {
      console.warn('Failed to parse prefill sprint data:', e);
    }
  }, [location.state, updateSprintDescription, updateProjectContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    selectJourneyPath('reality_sprint');
    if (!buildRequest.sprintDescription?.trim() && !buildRequest.productDescription.trim()) {
      setError('Please describe the critical user journey or MVP feature you want to validate.');
      return;
    }
    if (!buildRequest.contactInfo.email.trim()) {
      setError('Please provide a valid work email address.');
      return;
    }
    setError('');
    onProceedToSummary();
  };

  return (
    <div className="v2r-build-form-section" id="reality-sprint-form">
      {prefillSource && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: '#818cf8' }}>
              Template Prefilled
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              You're creating a new Reality Sprint based on a previous request: <strong>{prefillSource}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="v2r-build-form-header">
        <span className="v2r-build-form-header__eyebrow">VALIDATION BRIEFING</span>
        <h2 className="v2r-build-form-header__title">Reality Sprint Request</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* BLOCK 1: SPRINT DESCRIPTION */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Describe Your Validation Sprint</h3>
          <p className="v2r-form-block__subtitle">
            Describe the MVP feature, prototype, or single critical user journey you want to validate before committing to full product development.
          </p>

          <textarea
            id="sprint-description"
            className="v2r-idea-card__textarea"
            placeholder="Describe the critical user journey or prototype you want to test..."
            aria-label="Describe the critical user journey or prototype you want to test"
            value={buildRequest.sprintDescription || buildRequest.productDescription}
            onChange={(e) => {
              updateSprintDescription(e.target.value);
              if (error) setError('');
            }}
            required
            rows={6}
          />
        </div>

        {/* BLOCK 2: OPTIONAL SUPPORTING CONTEXT */}
        <div className="v2r-form-block">
          <OptionalUpload
            files={buildRequest.uploadedFiles}
            onFilesChange={updateUploadedFiles}
          />
        </div>

        {/* BLOCK 3: CURRENT STAGE & ADDITIONAL CONTEXT */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Sprint Context</h3>
          <p className="v2r-form-block__subtitle">
            Tell us your current product stage so we can structure the validation sprint.
          </p>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="v2r-idea-card__label">CURRENT STAGE</label>
            <div className="v2r-pills-selector">
              {STAGE_OPTIONS.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  className={`v2r-pill-button ${
                    buildRequest.projectContext.currentStage === stage ? 'v2r-pill-button--active' : ''
                  }`}
                  onClick={() => updateProjectContext({ currentStage: stage })}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="v2r-idea-card__label" htmlFor="sprint-additional-context">ADDITIONAL CONTEXT (OPTIONAL)</label>
            <input
              id="sprint-additional-context"
              type="text"
              className="v2r-auth-form__input"
              style={{ width: '100%' }}
              placeholder="Target user feedback timeline, specific test assumptions..."
              value={buildRequest.projectContext.additionalContext}
              onChange={(e) => updateProjectContext({ additionalContext: e.target.value })}
            />
          </div>
        </div>

        {/* BLOCK 4: INFORMATIONAL PRICING SECTION */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Reality Sprint Pricing</h3>
          <div
            style={{
              background: 'var(--color-surface-secondary)',
              border: '1px solid rgba(109, 93, 246, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-xs)',
            }}
          >
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
              Starts from ₹5,000
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)' }}>
              • Typical delivery time is 2–3 days.
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              • Final pricing depends on the complexity and scope of the MVP or user journey being validated.
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              We'll confirm the exact scope and pricing before work begins.
            </div>
          </div>
        </div>

        {/* BLOCK 5: CONTACT INFORMATION & ACCOUNT CREATION */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Contact Information &amp; Account Creation</h3>
          <p className="v2r-form-block__subtitle">
            Provide your details so our engineering lead can confirm your sprint scope. Creating your free account attaches this sprint request directly to your Founder Workspace.
          </p>

          <div className="v2r-auth-form" style={{ maxWidth: '100%' }}>
            <div className="v2r-summary-grid">
              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label" htmlFor="sprint-name">FULL NAME</label>
                <input
                  id="sprint-name"
                  type="text"
                  className="v2r-auth-form__input"
                  placeholder="Alex Vance"
                  value={buildRequest.contactInfo.name}
                  onChange={(e) => updateContactInfo({ name: e.target.value })}
                  required
                />
              </div>

              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label" htmlFor="sprint-email">WORK EMAIL ADDRESS</label>
                <input
                  id="sprint-email"
                  type="email"
                  className="v2r-auth-form__input"
                  placeholder="alex@startup.com"
                  value={buildRequest.contactInfo.email}
                  onChange={(e) => updateContactInfo({ email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="v2r-summary-grid" style={{ marginTop: 'var(--space-md)' }}>
              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label" htmlFor="sprint-phone">WHATSAPP / PHONE NUMBER</label>
                <input
                  id="sprint-phone"
                  type="tel"
                  className="v2r-auth-form__input"
                  placeholder="+1 (555) 000-0000"
                  value={buildRequest.contactInfo.phone}
                  onChange={(e) => updateContactInfo({ phone: e.target.value })}
                  required
                />
              </div>

              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label" htmlFor="sprint-password">ACCOUNT PASSWORD</label>
                <input
                  id="sprint-password"
                  type="password"
                  className="v2r-auth-form__input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <label className="v2r-auth-form__label">PREFERRED CONTACT METHOD</label>
              <div className="v2r-radio-grid">
                {(['WhatsApp', 'Phone Call', 'Email'] as PreferredContactMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`v2r-radio-card ${
                      buildRequest.contactInfo.preferredContactMethod === method ? 'v2r-radio-card--active' : ''
                    }`}
                    onClick={() => updateContactInfo({ preferredContactMethod: method })}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-md)' }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>
          <Button type="submit" variant="primary" size="lg">
            <span>Review Reality Sprint Summary</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  );
}
