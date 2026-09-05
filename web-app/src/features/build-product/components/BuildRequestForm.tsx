/**
 * Vision2Real – Build Request Form Component
 * Briefing form for product description, permanently visible optional context upload,
 * consultative project context options (free-text budget, current stage, additional context),
 * contact details, and account creation handoff.
 */

import { useState, useEffect } from 'react';
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

interface BuildRequestFormProps {
  onProceedToSummary: () => void;
}

export function BuildRequestForm({ onProceedToSummary }: BuildRequestFormProps) {
  const {
    buildRequest,
    selectJourneyPath,
    updateProductDescription,
    updateUploadedFiles,
    updateProjectContext,
    updateContactInfo,
  } = useBuildContext();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Enforce explicit BUILD_REQUEST submission type on form mount
  useEffect(() => {
    selectJourneyPath('build_product');
  }, [selectJourneyPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    selectJourneyPath('build_product');
    if (!buildRequest.productDescription.trim()) {
      setError('Please describe your product vision before proceeding.');
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
    <div className="v2r-build-form-section" id="build-request-form">
      <div className="v2r-build-form-header">
        <span className="v2r-build-form-header__eyebrow">PRODUCT BRIEFING</span>
        <h2 className="v2r-build-form-header__title">Build Request Briefing</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* BLOCK 1: PRODUCT DESCRIPTION */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Tell Us About Your Product</h3>
          <p className="v2r-form-block__subtitle">
            Describe your product idea, who it's for, the problem it solves, key features, or any goals you already have.
          </p>

          <textarea
            className="v2r-idea-card__textarea"
            placeholder="Describe the product you'd like Vision2Real to build..."
            value={buildRequest.productDescription}
            onChange={(e) => {
              updateProductDescription(e.target.value);
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

        {/* BLOCK 3: CONSULTATIVE PROJECT CONTEXT */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Project Context</h3>
          <p className="v2r-form-block__subtitle">
            Help us understand the scope of your project so we can recommend the most suitable execution approach.
          </p>

          {/* Current Stage */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="v2r-idea-card__label">CURRENT PRODUCT STAGE</label>
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

          {/* Estimated Budget (Free-Text Input) */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="v2r-idea-card__label">ESTIMATED BUDGET</label>
            <input
              type="text"
              className="v2r-auth-form__input"
              style={{ width: '100%' }}
              placeholder="Example: ₹50,000, Around $2,000, Under ₹1 Lakh, Not sure yet..."
              value={buildRequest.projectContext.estimatedBudget}
              onChange={(e) => updateProjectContext({ estimatedBudget: e.target.value })}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4xs)' }}>
              This helps us recommend the right approach. It isn't a commitment or final quote.
            </p>
          </div>

          {/* Additional Context */}
          <div>
            <label className="v2r-idea-card__label">ADDITIONAL CONTEXT (OPTIONAL)</label>
            <input
              type="text"
              className="v2r-auth-form__input"
              style={{ width: '100%' }}
              placeholder="Any specific tech stack preferences, compliance requirements, or deadline constraints..."
              value={buildRequest.projectContext.additionalContext}
              onChange={(e) => updateProjectContext({ additionalContext: e.target.value })}
            />
          </div>
        </div>

        {/* BLOCK 4: CONTACT & GUEST ACCOUNT HANDOFF */}
        <div className="v2r-form-block">
          <h3 className="v2r-form-block__title">Contact Information &amp; Account Creation</h3>
          <p className="v2r-form-block__subtitle">
            Provide your details so our engineering lead can contact you. Creating your free account attaches this request directly into your Founder Workspace.
          </p>

          <div className="v2r-auth-form" style={{ maxWidth: '100%' }}>
            <div className="v2r-summary-grid">
              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label">FULL NAME</label>
                <input
                  type="text"
                  className="v2r-auth-form__input"
                  placeholder="Alex Vance"
                  value={buildRequest.contactInfo.name}
                  onChange={(e) => updateContactInfo({ name: e.target.value })}
                  required
                />
              </div>

              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label">WORK EMAIL ADDRESS</label>
                <input
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
                <label className="v2r-auth-form__label">WHATSAPP / PHONE NUMBER</label>
                <input
                  type="tel"
                  className="v2r-auth-form__input"
                  placeholder="+1 (555) 000-0000"
                  value={buildRequest.contactInfo.phone}
                  onChange={(e) => updateContactInfo({ phone: e.target.value })}
                  required
                />
              </div>

              <div className="v2r-auth-form__group">
                <label className="v2r-auth-form__label">ACCOUNT PASSWORD</label>
                <input
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

            {/* Preferred Contact Method */}
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
            <span>Review Build Request Summary</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  );
}
