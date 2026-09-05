import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { LoadingButton } from './LoadingButton';
import { Link } from 'react-router-dom';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (val.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const validateConfirmPassword = (val: string, pass: string) => {
    if (!val) return 'Please confirm your password';
    if (val !== pass) return 'Passwords do not match';
    return undefined;
  };

  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    } else if (field === 'confirmPassword') {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, password),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    setTouched({ password: true, confirmPassword: true });
    setErrors({ password: passErr, confirmPassword: confirmErr });

    if (!passErr && !confirmErr) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsLoading(false);
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <AuthCard
        title="Password Updated"
        subtitle="Your password has been successfully updated."
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
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <Link to="/login" style={{ width: '100%' }}>
            <LoadingButton variant="primary" size="lg">
              Sign In
            </LoadingButton>
          </Link>
        </motion.div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Create a strong, new password for your account."
    >
      <form className="v2r-auth-form" onSubmit={handleSubmit} noValidate>
        {/* New Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <PasswordInput
            id="reset-password"
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (touched.password) {
                setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
              }
            }}
            onBlur={() => handleBlur('password')}
            error={touched.password ? errors.password : undefined}
            autoComplete="new-password"
          />
        </motion.div>

        {/* Password Strength Meter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <PasswordStrength password={password} />
        </motion.div>

        {/* Confirm Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <PasswordInput
            id="reset-confirm-password"
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (touched.confirmPassword) {
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: validateConfirmPassword(e.target.value, password),
                }));
              }
            }}
            onBlur={() => handleBlur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            autoComplete="new-password"
          />
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <LoadingButton
            variant="primary"
            size="lg"
            type="submit"
            isLoading={isLoading}
            loadingText="Resetting Password..."
          >
            Reset Password
          </LoadingButton>
        </motion.div>

        {/* Back to Login */}
        <motion.p
          className="v2r-auth-footer-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.55 }}
        >
          <Link to="/login" className="v2r-auth-form__link v2r-auth-form__link--highlight">
            Back to Login
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}
