import { memo } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  secondaryCtaText?: string;
  onSecondaryCtaClick?: () => void;
  className?: string;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  ctaText,
  onCtaClick,
  secondaryCtaText,
  onSecondaryCtaClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`v2r-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        background: 'rgba(15, 17, 26, 0.4)',
        border: '1px dashed rgba(255, 255, 255, 0.12)',
        borderRadius: '1rem',
        backdropFilter: 'blur(12px)',
        margin: '1rem 0',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '1rem',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brand-primary, #6366f1)',
          marginBottom: '1.25rem',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
        }}
      >
        {icon ? (
          icon
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
      </div>

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '0.5rem',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.6)',
          maxWidth: '440px',
          margin: '0 0 1.5rem 0',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {ctaText && onCtaClick && (
          <Button variant="primary" size="sm" onClick={onCtaClick}>
            {ctaText}
          </Button>
        )}
        {secondaryCtaText && onSecondaryCtaClick && (
          <Button variant="outline" size="sm" onClick={onSecondaryCtaClick}>
            {secondaryCtaText}
          </Button>
        )}
      </div>
    </div>
  );
});
