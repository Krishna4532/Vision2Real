import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AuthCard } from './AuthCard';
import { ValidationMessage } from './ValidationMessage';
import { LoadingButton } from './LoadingButton';
import { Link } from 'react-router-dom';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (val: string) => {
    if (!val.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Please enter a valid email address';
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validateEmail(email);
    setError(err);

    if (!err) {
      setIsLoading(true);
      // Simulate backend response
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsLoading(false);
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`If an account exists for ${email}, you'll receive reset instructions shortly.`}
      >
        <motion.div
          className="v2r-auth-success-state"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="v2r-auth-success-state__icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
              <polyline points="22 7 12 13 2 7" />
              <polyline points="16 19 19 22 24 17" />
            </svg>
          </div>
          <Link to="/login" style={{ width: '100%' }}>
            <LoadingButton variant="primary" size="lg">
              Back to Login
            </LoadingButton>
          </Link>
        </motion.div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you instructions to reset your password."
    >
      <form className="v2r-auth-form" onSubmit={handleSubmit} noValidate>
        <motion.div
          className="v2r-auth-form__group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <label className="v2r-auth-form__label" htmlFor="forgot-email">
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            className={`v2r-auth-form__input ${
              touched && error ? 'v2r-auth-form__input--error' : ''
            }`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched) setError(validateEmail(e.target.value));
            }}
            onBlur={() => {
              setTouched(true);
              setError(validateEmail(email));
            }}
            autoComplete="email"
            aria-invalid={touched && !!error}
            aria-describedby={error ? 'forgot-email-error' : undefined}
          />
          <ValidationMessage message={touched ? error : undefined} id="forgot-email-error" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <LoadingButton
            variant="primary"
            size="lg"
            type="submit"
            isLoading={isLoading}
            loadingText="Sending Reset Link..."
          >
            Send Reset Link
          </LoadingButton>
        </motion.div>

        <motion.p
          className="v2r-auth-footer-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          Remember your password?{' '}
          <Link to="/login" className="v2r-auth-form__link v2r-auth-form__link--highlight">
            Sign In
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}
