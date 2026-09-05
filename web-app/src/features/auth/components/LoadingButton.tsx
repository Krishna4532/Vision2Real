import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function LoadingButton({
  isLoading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'lg',
  disabled,
  children,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={`v2r-auth-form__submit ${isLoading ? 'v2r-btn--loading' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="v2r-btn__loading-content">
          <svg
            className="v2r-btn__spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2 a10 10 0 0 1 10 10" />
          </svg>
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
