/**
 * Vision2Real – ActivityWidget / Recent Activity Feed (Stage 6.3)
 * Shows merged real activity from Validation, Reality Sprint, and Build Requests.
 * Each item has a type-specific icon, title, description, relative timestamp, and deep link.
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { DashboardActivityItem, ActivitySourceType } from '@/services/dashboard/types';

interface ActivityWidgetProps {
  activity: DashboardActivityItem[];
  loading?: boolean;
}

// ── Type-specific icons ──────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivitySourceType }) {
  const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', width: '16', height: '16' };

  if (type === 'validation') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
      </svg>
    );
  }
  if (type === 'sprint') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    );
  }
  if (type === 'message') {
    return (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    );
  }
  // build
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 14.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387" />
    </svg>
  );
}

// ── Relative time ────────────────────────────────────────────────────────────

function getRelative(iso: string): string {
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

const TYPE_DOT_COLOR: Record<ActivitySourceType, string> = {
  validation: '#6366f1',
  sprint: '#f59e0b',
  build: '#10b981',
  message: '#3b82f6',
};

// ── Component ────────────────────────────────────────────────────────────────

export const ActivityWidget = memo(function ActivityWidget({ activity, loading }: ActivityWidgetProps) {
  const navigate = useNavigate();
  const hasActivity = Array.isArray(activity) && activity.length > 0;

  return (
    <section className="v2r-activity" aria-label="Recent Activity">
      <div className="v2r-activity__header">
        <h3 className="v2r-activity__title">Recent Activity</h3>
        {hasActivity && (
          <span className="v2r-activity__count">{activity.length} events</span>
        )}
      </div>

      {loading ? (
        <div className="v2r-activity__list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="v2r-skeleton-activity-row">
              <div className="v2r-skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="v2r-skeleton" style={{ height: 13, width: '55%', borderRadius: 4 }} />
                <div className="v2r-skeleton" style={{ height: 11, width: '80%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : hasActivity ? (
        <ul className="v2r-activity__list">
          <AnimatePresence>
            {activity.map((item, idx) => (
              <motion.li
                key={item.id}
                className="v2r-activity__item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.25, 1, 0.5, 1] }}
                onClick={() => navigate(item.link)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(item.link); }}
                aria-label={`${item.title} — ${getRelative(item.timestamp)}`}
              >
                <div
                  className="v2r-activity__icon"
                  style={{ color: TYPE_DOT_COLOR[item.type] }}
                  aria-hidden="true"
                >
                  <ActivityIcon type={item.type} />
                </div>
                <div className="v2r-activity__info">
                  <div className="v2r-activity__top-row">
                    <strong className="v2r-activity__event-title">{item.title}</strong>
                    <time
                      className="v2r-activity__timestamp"
                      dateTime={item.timestamp}
                      title={new Date(item.timestamp).toLocaleString()}
                    >
                      {getRelative(item.timestamp)}
                    </time>
                  </div>
                  {item.description && (
                    <p className="v2r-activity__event-desc">{item.description}</p>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="v2r-activity__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No activity yet. Start your founder journey below.</span>
        </div>
      )}
    </section>
  );
});
