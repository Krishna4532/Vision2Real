/**
 * Vision2Real – NotificationDrawer (Stage 6.4)
 * Slide-over drawer on desktop & full-screen sheet on mobile displaying top 5 latest alerts,
 * instant unread badge counter, inline mark-read triggers, and direct deep links.
 */

import { memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCard } from './notifications/NotificationCard';
import type { NotificationItem } from '@/services/api/notification';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

export const NotificationDrawer = memo(function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
}: NotificationDrawerProps) {
  const navigate = useNavigate();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const topNotifications = notifications.slice(0, 5);

  return (
    <AnimatePresence>
      <div className="v2r-drawer-backdrop" onClick={onClose} aria-hidden="true" />

      <motion.aside
        className="v2r-notification-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        aria-label="Notification Drawer"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="v2r-notification-drawer__header">
          <div className="v2r-notification-drawer__title-row">
            <h3 className="v2r-notification-drawer__title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="v2r-notification-drawer__badge">{unreadCount} unread</span>
            )}
          </div>

          <div className="v2r-notification-drawer__header-actions">
            {unreadCount > 0 && (
              <button className="v2r-notification-drawer__text-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
            <button className="v2r-notification-drawer__close-btn" onClick={onClose} aria-label="Close drawer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="v2r-notification-drawer__body">
          {isLoading ? (
            <div className="v2r-notification-drawer__loading">
              {[0, 1, 2].map((i) => (
                <div key={i} className="v2r-skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : topNotifications.length > 0 ? (
            <div className="v2r-notification-drawer__list">
              {topNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          ) : (
            <div className="v2r-notification-drawer__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span>No unread notifications</span>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="v2r-notification-drawer__footer">
          <button
            className="v2r-notification-drawer__view-all-btn"
            onClick={() => {
              onClose();
              navigate('/founder/notifications');
            }}
          >
            View All Notifications ({notifications.length}) →
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
});
