import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { useNotifications } from '@/features/founder/hooks/useNotifications';
import { NotificationDrawer } from '@/features/founder/components/NotificationDrawer';

interface FounderHeaderProps {
  onOpenMobileMenu: () => void;
  isMobileOpen?: boolean;
}

const TITLE_MAP: Record<string, string> = {
  '/founder': 'Founder Dashboard',
  '/founder/validations': 'Validation Reports',
  '/founder/sprint': 'Reality Sprint',
  '/founder/reality-sprints': 'Reality Sprint',
  '/founder/requests': 'Build Requests',
  '/founder/build-requests': 'Build Requests',
  '/founder/notifications': 'Notifications',
  '/founder/settings': 'Settings',
};

export function FounderHeader({ onOpenMobileMenu, isMobileOpen = false }: FounderHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const title = TITLE_MAP[location.pathname] || 'Founder Workspace';

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
    <>
      <header className="v2r-workspace-header">
        <div className="v2r-workspace-header__left">
          {/* Mobile Hamburger Button */}
          <button
            className="v2r-workspace-header__hamburger"
            onClick={onOpenMobileMenu}
            aria-label="Open sidebar menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-sidebar-drawer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb / Title */}
          <div className="v2r-workspace-header__breadcrumbs">
            <span className="v2r-workspace-header__crumb">Workspace</span>
            <span className="v2r-workspace-header__separator">/</span>
            <h1 className="v2r-workspace-header__title">{title}</h1>
          </div>
        </div>

        <div className="v2r-workspace-header__right">
          {/* Search Input Toggle */}
          <div className="v2r-workspace-header__search-wrapper">
            {isSearchActive ? (
              <div className="v2r-workspace-header__search-input-box">
                <input
                  type="text"
                  placeholder="Search workspace…"
                  autoFocus
                  onBlur={() => setIsSearchActive(false)}
                  className="v2r-workspace-header__search-input"
                />
              </div>
            ) : (
              <button
                className="v2r-workspace-header__icon-btn"
                onClick={() => setIsSearchActive(true)}
                aria-label="Search workspace"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            )}
          </div>

          {/* Notifications Icon Button with Live Unread Badge */}
          <button
            className="v2r-workspace-header__icon-btn v2r-workspace-header__bell-btn"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={`View notifications (${unreadCount} unread)`}
            title="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="v2r-workspace-header__unread-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Plus Icon Button */}
          <button
            className="v2r-workspace-header__icon-btn sm:hidden"
            onClick={() => navigate('/validate-idea')}
            aria-label="Validate Idea"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Founder Profile Avatar */}
          <div
            className="v2r-workspace-header__profile hidden sm:flex"
            onClick={() => navigate('/founder/settings')}
            role="button"
            aria-label="Founder Profile Settings"
          >
            <div className="v2r-workspace-header__avatar">
              {getInitials(user?.full_name)}
            </div>
            <div className="v2r-workspace-header__status-dot" title="Authenticated Session" />
          </div>
        </div>
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        onDismiss={dismissNotification}
      />
    </>
  );
}
