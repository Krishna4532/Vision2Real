/**
 * Vision2Real – WelcomeBanner (Stage 6.3)
 * Time-based greeting, join date, last-refreshed indicator, manual refresh button.
 */

import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import type { UserProfile } from '@/services/auth/types';

interface WelcomeBannerProps {
  user: UserProfile;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0] || name;
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatLastRefreshed(date: Date | null): string {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export const WelcomeBanner = memo(function WelcomeBanner({
  user,
  lastRefreshedAt,
  onRefresh,
  isRefreshing = false,
}: WelcomeBannerProps) {
  const greeting = useMemo(() => getGreeting(user.full_name), [user.full_name]);
  const joinDate = useMemo(() => formatJoinDate(user.created_at), [user.created_at]);
  const lastUpdated = formatLastRefreshed(lastRefreshedAt);

  return (
    <motion.div
      className="v2r-welcome"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="v2r-welcome__content">
        <h1 className="v2r-welcome__greeting">{greeting}</h1>
        <p className="v2r-welcome__subtitle">
          {joinDate ? `Founder since ${joinDate}` : 'Welcome to your workspace.'}
          {lastUpdated && (
            <span className="v2r-welcome__refresh-label">
              &nbsp;· Updated {lastUpdated}
            </span>
          )}
        </p>
      </div>

      <button
        className="v2r-welcome__refresh-btn"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh dashboard data"
        title="Refresh dashboard"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
          className={isRefreshing ? 'v2r-spin' : ''}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        <span>Refresh</span>
      </button>
    </motion.div>
  );
});
