/**
 * Vision2Real – NotificationCard (Stage 6.4)
 * Displays a single notification item with icon mapped from NotificationType,
 * priority badge, relative timestamp, action CTA button, mark read, and soft dismiss triggers.
 */

import { memo } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import type { NotificationItem } from '@/services/api/notification';

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

function getNotificationIcon(type: string, category: string): ReactElement {
  const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', width: '20', height: '20' };

  if (type.startsWith('VALIDATION') || category === 'VALIDATION') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
      </svg>
    );
  }
  if (type.startsWith('REALITY_SPRINT') || category === 'REALITY_SPRINT') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    );
  }
  if (type === 'BUILD_MESSAGE_RECEIVED') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    );
  }
  if (type.startsWith('BUILD') || category === 'BUILD_REQUEST') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 14.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387" />
      </svg>
    );
  }
  if (category === 'MARKETING' || type === 'MARKETING_CAMPAIGN') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.38-.09-2.072-.09-1.93 0-3.77.264-5.522.753.818-1.574 2.08-2.836 3.654-3.654C7.153 11.096 8.7 10.5 10.34 10.5m0 5.34c.688.06 1.38.09 2.072.09 1.93 0 3.77-.264 5.522-.753-.818 1.574-2.08 2.836-3.654 3.654C13.527 20.904 11.98 21.5 10.34 21.5m0-11c.688.06 1.38.09 2.072.09 1.93 0 3.77.264 5.522.753" />
      </svg>
    );
  }
  // System / Welcome default
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function getIconColor(type: string, category: string): string {
  if (type.startsWith('VALIDATION') || category === 'VALIDATION') return '#6366f1';
  if (type.startsWith('REALITY_SPRINT') || category === 'REALITY_SPRINT') return '#f59e0b';
  if (type === 'BUILD_MESSAGE_RECEIVED') return '#3b82f6';
  if (type.startsWith('BUILD') || category === 'BUILD_REQUEST') return '#10b981';
  if (category === 'MARKETING') return '#ec4899';
  return '#8b5cf6';
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const NotificationCard = memo(function NotificationCard({
  notification,
  onMarkRead,
  onDismiss,
}: NotificationCardProps) {
  const navigate = useNavigate();
  const { id, notification_type, category, title, body, deep_link, action_label, priority, is_read, created_at } = notification;

  const color = getIconColor(notification_type, category);
  const isHighPriority = priority === 'HIGH';

  const handleClick = () => {
    if (!is_read && onMarkRead) {
      onMarkRead(id);
    }
    navigate(deep_link);
  };

  return (
    <motion.article
      className={`v2r-notification-card ${!is_read ? 'v2r-notification-card--unread' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.25 }}
    >
      {!is_read && <span className="v2r-notification-card__unread-dot" aria-label="Unread notification" />}

      <div className="v2r-notification-card__icon-col">
        <div className="v2r-notification-card__icon" style={{ color, backgroundColor: `${color}15` }}>
          {getNotificationIcon(notification_type, category)}
        </div>
      </div>

      <div className="v2r-notification-card__content" onClick={handleClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}>
        <div className="v2r-notification-card__header">
          <h4 className="v2r-notification-card__title">{title}</h4>
          <div className="v2r-notification-card__meta">
            {isHighPriority && (
              <span className="v2r-notification-card__badge v2r-notification-card__badge--high">
                High Priority
              </span>
            )}
            <time className="v2r-notification-card__time" dateTime={created_at}>
              {getRelativeTime(created_at)}
            </time>
          </div>
        </div>

        <p className="v2r-notification-card__body">{body}</p>

        <div className="v2r-notification-card__actions">
          <button className="v2r-notification-card__cta-btn" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
            {action_label || 'View Details'} →
          </button>
        </div>
      </div>

      <div className="v2r-notification-card__controls">
        {!is_read && onMarkRead && (
          <button
            className="v2r-notification-card__control-btn"
            onClick={() => onMarkRead(id)}
            aria-label="Mark as read"
            title="Mark as read"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
        )}
        {onDismiss && (
          <button
            className="v2r-notification-card__control-btn v2r-notification-card__control-btn--dismiss"
            onClick={() => onDismiss(id)}
            aria-label="Dismiss notification"
            title="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.article>
  );
});
