import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { adminApi } from '@/services/api/adminApi';
import { Roles } from '@/types/roles';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const location = useLocation();

  const [isServerVerifying, setIsServerVerifying] = useState<boolean>(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean>(false);
  const [forbiddenError, setForbiddenError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminSession() {
      if (isAuthLoading) return;

      if (!isAuthenticated || !user) {
        if (isMounted) {
          setIsAuthorizedAdmin(false);
          setIsServerVerifying(false);
        }
        return;
      }

      if (user.role !== Roles.SUPER_ADMIN) {
        if (isMounted) {
          setIsAuthorizedAdmin(false);
          setForbiddenError(true);
          setIsServerVerifying(false);
        }
        return;
      }

      try {
        // Strict server-side verification against GET /api/v1/admin/me
        const verifiedProfile = await adminApi.getAdminMe();
        if (isMounted) {
          if (verifiedProfile.role === Roles.SUPER_ADMIN) {
            setIsAuthorizedAdmin(true);
            setForbiddenError(false);
          } else {
            setIsAuthorizedAdmin(false);
            setForbiddenError(true);
          }
        }
      } catch (err: any) {
        console.error('Admin session verification failed:', err);
        if (isMounted) {
          setIsAuthorizedAdmin(false);
          if (err?.status === 403 || err?.response?.status === 403) {
            setForbiddenError(true);
          } else {
            // Unauthenticated or token invalid
            logout();
          }
        }
      } finally {
        if (isMounted) {
          setIsServerVerifying(false);
        }
      }
    }

    verifyAdminSession();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isAuthenticated, user, logout]);

  if (isAuthLoading || isServerVerifying) {
    return <CinematicTransitionOverlay isVisible={true} message="Verifying Super Admin Authorization..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  if (forbiddenError || !isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl font-bold mb-4 shadow-lg shadow-red-950/50">
          403
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Access Denied (403 Forbidden)</h1>
        <p className="text-slate-400 max-w-md mb-6 text-sm">
          Admin HQ is the private operational control plane for Vision2Real. You do not have Super Admin privileges required to access this portal.
        </p>
        <button
          onClick={() => window.location.href = '/founder'}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-950/50"
        >
          Return to Founder Workspace
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
