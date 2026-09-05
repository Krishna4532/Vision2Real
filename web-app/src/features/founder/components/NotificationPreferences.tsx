/**
 * Vision2Real – NotificationPreferences Component (Stage 6.4)
 * Granular notification preferences panel integrated into Founder Settings page.
 * Features toggles for Browser Push, per-module alerts, quiet hours, and Test Notification trigger.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { notificationApi, type NotificationPreference } from '@/services/api/notification';
import { subscribeToWebPush } from '@/utils/pushSubscription';

export const NotificationPreferences = memo(function NotificationPreferences() {
  const [pref, setPref] = useState<NotificationPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationApi.getPreferences();
      setPref(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load preferences.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (key: keyof NotificationPreference, val: boolean | string) => {
    if (!pref) return;
    setPref((prev) => (prev ? { ...prev, [key]: val } : null));

    try {
      await notificationApi.updatePreferences({ [key]: val });
      setMessage({ type: 'success', text: 'Preferences saved.' });
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update preference.' });
    }
  };

  const handleQuietHoursChange = async (start: string, end: string) => {
    if (!pref) return;
    setPref((prev) => (prev ? { ...prev, quiet_hours_start: start, quiet_hours_end: end } : null));

    try {
      await notificationApi.updatePreferences({ quiet_hours_start: start, quiet_hours_end: end });
      setMessage({ type: 'success', text: 'Quiet hours updated.' });
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update quiet hours.' });
    }
  };

  const handleEnableWebPush = async () => {
    setIsPushSubscribing(true);
    try {
      const ok = await subscribeToWebPush();
      if (ok) {
        setPushPermissionStatus('granted');
        await handleToggle('browser_push_enabled', true);
        setMessage({ type: 'success', text: 'Browser Web Push notifications enabled!' });
      } else {
        setPushPermissionStatus(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');
        setMessage({ type: 'error', text: 'Could not enable Web Push. Please check browser permission settings.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Web Push error.' });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setMessage(null);
      await notificationApi.sendTestNotification();
      setMessage({ type: 'success', text: 'Test notification sent to your center & browser!' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to send test notification.' });
    }
  };

  if (isLoading) {
    return (
      <div className="v2r-notif-pref-loading" aria-busy="true">
        <div className="v2r-skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  if (!pref) return null;

  return (
    <div className="v2r-notif-pref-panel">
      <div className="v2r-notif-pref-panel__header">
        <h3 className="v2r-notif-pref-panel__title">Notification Preferences</h3>
        <p className="v2r-notif-pref-panel__desc">
          Manage real-time browser alerts, quiet hours, and per-module notifications.
        </p>
      </div>

      {message && (
        <div className={`v2r-notif-pref-msg v2r-notif-pref-msg--${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      {/* 1 — Browser Push Section */}
      <div className="v2r-notif-pref-group">
        <div className="v2r-notif-pref-row">
          <div>
            <strong className="v2r-notif-pref-row__label">Browser Web Push Notifications</strong>
            <p className="v2r-notif-pref-row__sub">
              Receive desktop & mobile browser alerts when validation reports or build milestones update.
            </p>
          </div>
          <div className="v2r-notif-pref-row__action">
            {pushPermissionStatus === 'granted' && pref.browser_push_enabled ? (
              <span className="v2r-notif-pref-status v2r-notif-pref-status--active">
                ✓ Web Push Active
              </span>
            ) : pushPermissionStatus === 'denied' ? (
              <span className="v2r-notif-pref-status" style={{ color: '#ef4444' }}>
                Blocked in Browser
              </span>
            ) : (
              <button
                className="v2r-notif-pref-btn"
                onClick={handleEnableWebPush}
                disabled={isPushSubscribing}
              >
                {isPushSubscribing ? 'Enabling…' : 'Enable Web Push'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2 — Notification Frequency */}
      <div className="v2r-notif-pref-group">
        <div className="v2r-notif-pref-toggle-row">
          <div>
            <span className="v2r-notif-pref-toggle-label">Notification Frequency</span>
            <p className="v2r-notif-pref-toggle-desc">
              Choose how frequently you receive alert notifications.
            </p>
          </div>
          <select
            className="v2r-notif-pref-time-input"
            value={pref.notification_frequency || 'INSTANT'}
            onChange={(e) => handleToggle('notification_frequency', e.target.value as any)}
            style={{ width: 'auto' }}
          >
            <option value="INSTANT">Instant (Real-Time)</option>
            <option value="DAILY_DIGEST">Daily Digest</option>
            <option value="WEEKLY_DIGEST">Weekly Digest</option>
          </select>
        </div>
      </div>

      {/* 2 — Module Toggles */}
      <div className="v2r-notif-pref-group">
        <h4 className="v2r-notif-pref-group__title">Category Toggles</h4>
        {[
          { key: 'validation_notifications', label: 'Validation Reports', desc: 'Alerts when market research & scorecard reports are ready.' },
          { key: 'sprint_notifications', label: 'Reality Sprint', desc: 'Alerts on sprint submissions, roadmap milestones, and deliverables.' },
          { key: 'build_notifications', label: 'Build My Product', desc: 'Alerts on software project phase changes, progress %, and admin messages.' },
          { key: 'marketing_notifications', label: 'Product News & Offers', desc: 'Updates on platform capabilities, marketing campaigns, and founder tools.' },
          { key: 'system_notifications', label: 'System & Security', desc: 'Account credentials, session security, and workspace alerts.' },
        ].map((item) => (
          <div key={item.key} className="v2r-notif-pref-toggle-row">
            <div>
              <span className="v2r-notif-pref-toggle-label">{item.label}</span>
              <p className="v2r-notif-pref-toggle-desc">{item.desc}</p>
            </div>
            <label className="v2r-switch">
              <input
                type="checkbox"
                checked={Boolean(pref[item.key as keyof NotificationPreference])}
                onChange={(e) => handleToggle(item.key as keyof NotificationPreference, e.target.checked)}
              />
              <span className="v2r-slider" />
            </label>
          </div>
        ))}
      </div>

      {/* 3 — Quiet Hours */}
      <div className="v2r-notif-pref-group">
        <div className="v2r-notif-pref-toggle-row">
          <div>
            <span className="v2r-notif-pref-toggle-label">Quiet Hours</span>
            <p className="v2r-notif-pref-toggle-desc">
              Suppress browser push notifications during set hours (e.g. overnight).
            </p>
          </div>
          <label className="v2r-switch">
            <input
              type="checkbox"
              checked={pref.quiet_hours_enabled}
              onChange={(e) => handleToggle('quiet_hours_enabled', e.target.checked)}
            />
            <span className="v2r-slider" />
          </label>
        </div>

        {pref.quiet_hours_enabled && (
          <div className="v2r-notif-pref-quiet-inputs">
            <div>
              <label className="v2r-notif-pref-input-label">Start Time</label>
              <input
                type="time"
                value={pref.quiet_hours_start}
                onChange={(e) => handleQuietHoursChange(e.target.value, pref.quiet_hours_end)}
                className="v2r-notif-pref-time-input"
              />
            </div>
            <div>
              <label className="v2r-notif-pref-input-label">End Time</label>
              <input
                type="time"
                value={pref.quiet_hours_end}
                onChange={(e) => handleQuietHoursChange(pref.quiet_hours_start, e.target.value)}
                className="v2r-notif-pref-time-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4 — Test Notification Action */}
      <div className="v2r-notif-pref-group v2r-notif-pref-group--footer">
        <button className="v2r-notif-pref-test-btn" onClick={handleSendTest}>
          🔔 Send Test Notification
        </button>
      </div>
    </div>
  );
});
