import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { useNotifications } from '@/features/founder/hooks/useNotifications';
import { toast } from 'sonner';
import logoSvg from '@/assets/brand/logo.svg';

interface FounderSidebarProps {
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/founder',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: 'Validation Reports',
    href: '/founder/validations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
      </svg>
    ),
  },
  {
    label: 'Reality Sprint',
    href: '/founder/reality-sprints',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    label: 'Build Requests',
    href: '/founder/build-requests',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: 'Notifications',
    href: '/founder/notifications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/founder/settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function FounderSidebar({ onCloseMobile }: FounderSidebarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (href: string) => {
    navigate(href);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'F';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="v2r-sidebar">
      {/* Brand Header */}
      <div className="v2r-sidebar__header">
        <a
          href="/"
          className="v2r-sidebar__brand"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <img src={logoSvg} alt="Vision2Real Logo" className="v2r-sidebar__logo" />
          <div className="v2r-sidebar__brand-meta">
            <span className="v2r-sidebar__brand-name">Vision2Real</span>
            <span className="v2r-sidebar__badge">Founder Hub</span>
          </div>
        </a>
        {onCloseMobile && (
          <button
            className="v2r-sidebar__mobile-close"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Founder Profile Badge */}
      <div className="v2r-sidebar__user-card">
        <div className="v2r-sidebar__user-avatar">
          {getInitials(user?.full_name)}
        </div>
        <div className="v2r-sidebar__user-info">
          <span className="v2r-sidebar__user-name">{user?.full_name || 'Founder'}</span>
          <span className="v2r-sidebar__user-email">{user?.email || 'founder@vision2real.com'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="v2r-sidebar__nav" aria-label="Founder Workspace Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/founder'
              ? location.pathname === '/founder'
              : location.pathname.startsWith(item.href);

          const isNotifItem = item.href === '/founder/notifications';

          return (
            <button
              key={item.href}
              className={`v2r-sidebar__nav-item ${isActive ? 'v2r-sidebar__nav-item--active' : ''}`}
              onClick={() => handleNavClick(item.href)}
            >
              <span className="v2r-sidebar__nav-icon">{item.icon}</span>
              <span className="v2r-sidebar__nav-label">{item.label}</span>
              {isNotifItem && unreadCount > 0 && (
                <span className="v2r-notification-drawer__badge" style={{ marginLeft: 'auto', marginRight: isActive ? 8 : 0 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {isActive && <span className="v2r-sidebar__active-pill" />}
            </button>
          );
        })}
      </nav>

      {/* Compact SaaS Logout Button (Linear / Vercel style) */}
      <div className="v2r-sidebar__footer">
        <button
          className="v2r-sidebar__nav-item v2r-sidebar__logout-nav-item"
          onClick={handleLogout}
          aria-label="Log out of founder workspace"
        >
          <span className="v2r-sidebar__nav-icon" style={{ color: '#ef4444' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
            </svg>
          </span>
          <span className="v2r-sidebar__nav-label" style={{ color: '#ef4444' }}>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
