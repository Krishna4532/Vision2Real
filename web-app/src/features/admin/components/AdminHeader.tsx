import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { ShieldCheck, User } from 'lucide-react';

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/dashboard': 'Dashboard Overview',
  '/admin/founders': 'Founders Directory',
  '/admin/validations': 'Validation Reports',
  '/admin/reality-sprints': 'Reality Sprint Management',
  '/admin/build-requests': 'Build Request Operations',
  '/admin/notifications': 'Notification Center',
  '/admin/settings': 'Operational Settings',
};

export function AdminHeader() {
  const location = useLocation();
  const { user } = useAuth();

  const title = ROUTE_TITLES[location.pathname] || 'Admin HQ';

  return (
    <header className="v2r-admin-header">
      <div>
        <h1 className="v2r-admin-header__title">{title}</h1>
        <div className="v2r-admin-header__sub">Vision2Real Operational Control Plane</div>
      </div>

      <div className="v2r-admin-header__right">
        {/* Active Super Admin Indicator */}
        <div className="v2r-admin-header__status-pill">
          <ShieldCheck style={{ width: '14px', height: '14px' }} />
          <span>Active Super Admin</span>
        </div>

        {/* User Pill */}
        <div className="v2r-admin-header__user-pill">
          <div className="v2r-admin-header__avatar">
            {user?.full_name?.charAt(0) || <User style={{ width: '12px', height: '12px' }} />}
          </div>
          <span className="v2r-admin-header__email">
            {user?.email || 'ks6895216@gmail.com'}
          </span>
        </div>
      </div>
    </header>
  );
}
