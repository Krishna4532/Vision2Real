import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Zap,
  Hammer,
  Bell,
  Settings,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/founders', label: 'Founders', icon: Users },
  { path: '/admin/validations', label: 'Validations', icon: FileCheck },
  { path: '/admin/reality-sprints', label: 'Reality Sprints', icon: Zap },
  { path: '/admin/build-requests', label: 'Build Requests', icon: Hammer },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="v2r-admin-sidebar">
      {/* Brand Header */}
      <div className="v2r-admin-sidebar__header">
        <div className="v2r-admin-sidebar__logo-box">V2R</div>
        <div className="v2r-admin-sidebar__brand-meta">
          <div className="v2r-admin-sidebar__brand-title">Admin HQ</div>
          <div className="v2r-admin-sidebar__brand-sub">Control Plane</div>
        </div>
      </div>

      {/* Super Admin Badge */}
      <div className="v2r-admin-sidebar__super-badge">
        <ShieldAlert style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span>Super Admin Mode</span>
      </div>

      {/* Navigation Menu */}
      <nav className="v2r-admin-sidebar__nav">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `v2r-admin-sidebar__nav-item ${isActive ? 'v2r-admin-sidebar__nav-item--active' : ''}`
              }
            >
              <Icon style={{ width: '16px', height: '16px' }} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="v2r-admin-sidebar__footer">
        <div className="v2r-admin-sidebar__user-name">{user?.full_name || 'Super Admin'}</div>
        <div className="v2r-admin-sidebar__user-email">{user?.email || 'ks6895216@gmail.com'}</div>
        <button onClick={() => logout()} className="v2r-admin-sidebar__logout-btn">
          <LogOut style={{ width: '14px', height: '14px' }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
