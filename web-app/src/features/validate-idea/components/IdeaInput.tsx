/**
 * Vision2Real – Idea Input Component
 * Primary input portal for founder startup idea description with optional supporting file context,
 * confidentiality guarantee, and primary "Validate My Idea" CTA.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { OptionalUpload } from './OptionalUpload';
import type { UploadedFileContext } from '@/types/validation';

interface IdeaInputProps {
  onSubmit: (ideaText: string, files: UploadedFileContext[]) => void;
  isLoading?: boolean;
}

export function IdeaInput({ onSubmit, isLoading = false }: IdeaInputProps) {
  const [ideaText, setIdeaText] = useState('');
  const [files, setFiles] = useState<UploadedFileContext[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim()) {
      setError('Please describe your startup idea before validating.');
      return;
    }
    setError('');
    onSubmit(ideaText, files);
  };

  return (
    <div className="v2r-idea-input-section" id="idea-input">
      <form onSubmit={handleSubmit} className="v2r-idea-card">
        <label htmlFor="startup-idea-input" className="v2r-idea-card__label">
          YOUR STARTUP IDEA
        </label>
        <textarea
          id="startup-idea-input"
          className="v2r-idea-card__textarea"
          placeholder="Describe your startup idea..."
          value={ideaText}
          onChange={(e) => {
            setIdeaText(e.target.value);
            if (error) setError('');
          }}
          disabled={isLoading}
          required
          aria-required="true"
          aria-describedby="idea-hint idea-privacy"
        />

        <div className="v2r-idea-card__hint" id="idea-hint">
          <span>
            Explain your idea naturally. Include the problem, who it's for, why it matters, and
            anything else you think is important.
          </span>
          <span>{ideaText.length} chars</span>
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-xs)' }}>
            {error}
          </div>
        )}

        {/* Optional Context Upload */}
        <OptionalUpload files={files} onFilesChange={setFiles} />

        <div className="v2r-idea-card__actions">
          <div className="v2r-idea-card__privacy" id="idea-privacy">
            <svg
              className="v2r-idea-card__privacy-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Your idea is treated as confidential. By continuing you agree to our Terms and Privacy Policy.</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading || !ideaText.trim()}
            style={{ width: '100%', maxWidth: '240px' }}
          >
            {isLoading ? 'Initializing Validation...' : 'Validate My Idea'}
          </Button>
        </div>
      </form>
    </div>
  );
}
