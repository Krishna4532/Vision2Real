import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { ValidationMessage } from './ValidationMessage';
import { LoadingButton } from './LoadingButton';
import { GoogleButton } from './GoogleButton';
import { useAuth } from '../context/AuthProvider';

export function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
    general?: string;
  }>({});

  const [touched, setTouched] = useState<{
    fullName?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
    agreeTerms?: boolean;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  const validateFullName = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Full Name is required';
    if (trimmed.length < 2) return 'Full Name must be at least 2 characters';
    if (trimmed.length > 50) return 'Full Name cannot exceed 50 characters';
    return undefined;
  };

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (val.length < 8) return 'Password must be at least 8 characters';
    if (val.length > 128) return 'Password cannot exceed 128 characters';
    return undefined;
  };

  const validateConfirmPassword = (val: string, pass: string) => {
    if (!val) return 'Please confirm your password';
    if (val !== pass) return 'Passwords do not match';
    return undefined;
  };

  const validateTerms = (val: boolean) => {
    if (!val) return 'You must agree to the Terms of Service and Privacy Policy';
    return undefined;
  };

  const handleBlur = (field: 'fullName' | 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'fullName') {
      setErrors((prev) => ({ ...prev, fullName: validateFullName(fullName) }));
    } else if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(password),
        confirmPassword: touched.confirmPassword
          ? validateConfirmPassword(confirmPassword, password)
          : prev.confirmPassword,
      }));
    } else if (field === 'confirmPassword') {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, password),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateFullName(fullName);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);
    const termsErr = validateTerms(agreeTerms);

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true,
    });

    setErrors({
      fullName: nameErr,
      email: emailErr,
      password: passwordErr,
      confirmPassword: confirmErr,
      agreeTerms: termsErr,
    });

    if (!nameErr && !emailErr && !passwordErr && !confirmErr && !termsErr) {
      setIsLoading(true);
      setErrors({});
      try {
        await signup(fullName, email, password);
        toast.success('Account created successfully!');
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/founder';
        navigate(from, { replace: true });
      } catch (err: unknown) {
        let msg = 'Registration failed. Please try again.';
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const res = (err as { response?: { data?: { detail?: string } } }).response;
          if (res?.data?.detail) {
            msg = res.data.detail;
          }
        }
        setErrors((prev) => ({ ...prev, general: msg }));
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = () => {
    toast.error('Google Authentication is temporarily unavailable. Please sign up with your email and password.');
  };

  return (
    <AuthCard title="Create Account" subtitle="Join Vision2Real and start turning ideas into reality.">
      <form className="v2r-auth-form" onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <ValidationMessage message={errors.general} id="signup-general-error" />
        )}

        {/* Full Name */}
        <motion.div
          className="v2r-auth-form__group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <label className="v2r-auth-form__label" htmlFor="signup-name">
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            className={`v2r-auth-form__input ${
              touched.fullName && errors.fullName ? 'v2r-auth-form__input--error' : ''
            }`}
            placeholder="Alex Morgan"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (touched.fullName) {
                setErrors((prev) => ({ ...prev, fullName: validateFullName(e.target.value) }));
              }
            }}
            onBlur={() => handleBlur('fullName')}
            autoComplete="name"
            aria-invalid={touched.fullName && !!errors.fullName}
            aria-describedby={errors.fullName ? 'signup-name-error' : undefined}
          />
          <ValidationMessage message={touched.fullName ? errors.fullName : undefined} id="signup-name-error" />
        </motion.div>

        {/* Email */}
        <motion.div
          className="v2r-auth-form__group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <label className="v2r-auth-form__label" htmlFor="signup-email">
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            className={`v2r-auth-form__input ${
              touched.email && errors.email ? 'v2r-auth-form__input--error' : ''
            }`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched.email) {
                setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
              }
            }}
            onBlur={() => handleBlur('email')}
            autoComplete="email"
            aria-invalid={touched.email && !!errors.email}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
          />
          <ValidationMessage message={touched.email ? errors.email : undefined} id="signup-email-error" />
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <PasswordInput
            id="signup-password"
            label="Password"
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
          transition={{ duration: 0.3, delay: 0.42 }}
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
            id="signup-confirm-password"
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

        {/* Terms Checkbox */}
        <motion.div
          className="v2r-auth-form__group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <label className="v2r-auth-form__checkbox-label">
            <input
              type="checkbox"
              className="v2r-auth-form__checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (touched.agreeTerms) {
                  setErrors((prev) => ({ ...prev, agreeTerms: validateTerms(e.target.checked) }));
                }
              }}
            />
            <span>
              I agree to the{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="v2r-auth-form__link">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="v2r-auth-form__link">
                Privacy Policy
              </a>
            </span>
          </label>
          <ValidationMessage message={touched.agreeTerms ? errors.agreeTerms : undefined} />
        </motion.div>

        {/* Create Account Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.55 }}
        >
          <LoadingButton
            variant="primary"
            size="lg"
            type="submit"
            isLoading={isLoading}
            loadingText="Creating Account..."
          >
            Create Account
          </LoadingButton>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="v2r-auth-divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <span>OR</span>
        </motion.div>

        {/* Google Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.65 }}
        >
          <GoogleButton
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            label="Continue with Google"
          />
        </motion.div>

        {/* Switch to Login */}
        <motion.p
          className="v2r-auth-footer-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          Already have an account?{' '}
          <Link to="/login" className="v2r-auth-form__link v2r-auth-form__link--highlight">
            Sign In
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}
