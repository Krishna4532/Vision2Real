import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { ValidationMessage } from './ValidationMessage';
import { LoadingButton } from './LoadingButton';
import { GoogleButton } from './GoogleButton';
import { useAuth } from '../context/AuthProvider';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (val: string) => {
    if (!val.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (val.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passwordErr });

    if (!emailErr && !passwordErr) {
      setIsLoading(true);
      setErrors({});
      try {
        await login(email, password);
        toast.success('Signed in successfully!');
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/founder';
        navigate(from, { replace: true });
      } catch (err: unknown) {
        let msg = 'Failed to sign in. Please check your credentials.';
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
    toast.error('Google Authentication is temporarily unavailable. Please sign in with your email and password.');
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Continue building with Vision2Real.">
      <form className="v2r-auth-form" onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <ValidationMessage message={errors.general} id="login-general-error" />
        )}

        {/* Email Field */}
        <motion.div
          className="v2r-auth-form__group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <label className="v2r-auth-form__label" htmlFor="login-email">
            Email Address
          </label>
          <input
            id="login-email"
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
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
          <ValidationMessage message={touched.email ? errors.email : undefined} id="login-email-error" />
        </motion.div>

        {/* Password Field with Show/Hide toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <PasswordInput
            id="login-password"
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
            autoComplete="current-password"
          />
        </motion.div>

        {/* Remember Me & Forgot Password */}
        <motion.div
          className="v2r-auth-form__options"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <label className="v2r-auth-form__checkbox-label">
            <input
              type="checkbox"
              className="v2r-auth-form__checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember Me</span>
          </label>

          <Link to="/forgot-password" className="v2r-auth-form__link">
            Forgot Password?
          </Link>
        </motion.div>

        {/* Sign In Button with Loading State */}
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
            loadingText="Signing In..."
          >
            Sign In
          </LoadingButton>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="v2r-auth-divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.55 }}
        >
          <span>OR</span>
        </motion.div>

        {/* Google Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <GoogleButton
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            label="Continue with Google"
          />
        </motion.div>

        {/* Switch to Signup */}
        <motion.p
          className="v2r-auth-footer-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.65 }}
        >
          Don't have an account?{' '}
          <Link to="/signup" className="v2r-auth-form__link v2r-auth-form__link--highlight">
            Create Account
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}
