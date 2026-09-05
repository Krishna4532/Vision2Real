import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { Roles } from '@/types/roles';
import { Lock, Mail, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import '@/features/admin/components/AdminHQ.css';

export function AdminLoginPage() {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  // If already authenticated as Super Admin, redirect immediately to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === Roles.SUPER_ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setAccessDenied(true);
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAccessDenied(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const authenticatedUser = await login(email, password);

      if (authenticatedUser.role === Roles.SUPER_ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setAccessDenied(true);
      }
    } catch (err: any) {
      console.error('Admin login failed:', err);
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuthMock = () => {
    setErrorMessage('Google Authentication is temporarily unavailable. Please sign in using your Admin email and password.');
  };

  if (isLoading) {
    return (
      <div className="v2r-admin-login-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span>Verifying Admin Portal Session...</span>
        </div>
      </div>
    );
  }

  // If logged in as SUPER_ADMIN, redirect handled by useEffect
  if (isAuthenticated && user?.role === Roles.SUPER_ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="v2r-admin-login-wrapper">
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div className="v2r-admin-login-header">
          <div className="v2r-admin-login-logo">V2R</div>
          <h1 className="v2r-admin-login-title">Admin HQ</h1>
          <p className="v2r-admin-login-sub">Private operational control plane for Vision2Real</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
            <ShieldAlert style={{ width: '14px', height: '14px' }} />
            <span>Super Admin Access Only</span>
          </div>
        </div>

        {/* Access Denied Card (If logged in user is FOUNDER) */}
        {accessDenied ? (
          <div className="v2r-admin-403-card">
            <div className="v2r-admin-403-icon">
              <ShieldAlert style={{ width: '24px', height: '24px' }} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>403 Access Denied</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.25rem' }}>
              Authenticated account (<strong style={{ color: '#ffffff' }}>{user?.email}</strong>) does not possess Super Admin privileges.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button onClick={() => navigate('/founder')} className="v2r-admin-btn-primary">
                <span>Go to Founder Workspace</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </button>
              <button
                onClick={async () => {
                  await logout();
                  setAccessDenied(false);
                }}
                className="v2r-admin-sidebar__logout-btn"
                style={{ justifyContent: 'center' }}
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
                <span>Sign Out & Switch Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Admin Login Card */
          <div className="v2r-admin-login-card">
            {/* Error Message */}
            {errorMessage && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.75rem', marginBottom: '1rem' }}>
                {errorMessage}
              </div>
            )}

            {/* Google Login Button */}
            <button onClick={handleGoogleAuthMock} disabled={isSubmitting} type="button" className="v2r-admin-btn-google">
              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ textAlign: 'center', margin: '1.25rem 0', fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or Sign In With Password
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin}>
              <div className="v2r-admin-form-group">
                <label className="v2r-admin-label">Admin Email</label>
                <div className="v2r-admin-input-wrapper">
                  <Mail className="v2r-admin-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ks6895216@gmail.com"
                    required
                    className="v2r-admin-input"
                  />
                </div>
              </div>

              <div className="v2r-admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="v2r-admin-label">Password</label>
                <div className="v2r-admin-input-wrapper">
                  <Lock className="v2r-admin-input-icon" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="v2r-admin-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="v2r-admin-btn-primary">
                <span>Sign In to Admin HQ</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          Vision2Real Platform Control Plane v1.0 • Seeded Super Admin Access
        </div>
      </div>
    </div>
  );
}
