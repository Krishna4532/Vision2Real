/**
 * Vision2Real – SecuritySection Component (Stage 6.5)
 * Password change form and active refresh token session management.
 */

import { memo, useState } from 'react';
import { settingsApi, type ActiveSession } from '@/services/api/settings';
import { toast } from 'sonner';

interface SecuritySectionProps {
  sessions: ActiveSession[];
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeOtherSessions: () => Promise<void>;
}

export const SecuritySection = memo(function SecuritySection({
  sessions,
  onRevokeSession,
  onRevokeOtherSessions,
}: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await settingsApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="v2r-settings-section-stack">
      {/* 1 — Password Change Form */}
      <div className="v2r-settings-section">
        <div className="v2r-settings-section__header">
          <div>
            <h2 className="v2r-settings-section__title">Password & Authentication</h2>
            <p className="v2r-settings-section__desc">
              Update your account password and enforce security standards.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="v2r-settings-form-grid">
          <div className="v2r-settings-field">
            <label className="v2r-settings-label">Current Password</label>
            <input
              type="password"
              className="v2r-settings-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••••••"
            />
          </div>

          <div className="v2r-settings-field">
            <label className="v2r-settings-label">New Password (min 8 chars)</label>
            <input
              type="password"
              className="v2r-settings-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••••••"
            />
          </div>

          <div className="v2r-settings-field">
            <label className="v2r-settings-label">Confirm New Password</label>
            <input
              type="password"
              className="v2r-settings-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••••••"
            />
          </div>

          <div className="v2r-settings-field v2r-settings-field--full" style={{ marginTop: 8 }}>
            <button
              type="submit"
              className="v2r-settings-primary-btn"
              disabled={isSubmitting || !currentPassword || !newPassword}
            >
              {isSubmitting ? 'Updating Password…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* 2 — Active Sessions */}
      <div className="v2r-settings-section">
        <div className="v2r-settings-section__header">
          <div>
            <h2 className="v2r-settings-section__title">Active Sessions</h2>
            <p className="v2r-settings-section__desc">
              Manage active refresh token sessions logged into your founder account.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              className="v2r-settings-danger-btn-outline"
              onClick={onRevokeOtherSessions}
            >
              Revoke All Other Devices
            </button>
          )}
        </div>

        {sessions.length > 0 ? (
          <div className="v2r-settings-sessions-list">
            {sessions.map((s) => (
              <div key={s.id} className="v2r-settings-session-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="v2r-settings-session-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0h-18" />
                    </svg>
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: 14 }}>{s.device_summary}</strong>
                    <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      Created {new Date(s.created_at).toLocaleDateString()} • Expires {new Date(s.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  {s.is_current ? (
                    <span className="v2r-settings-badge v2r-settings-badge--active">Current Session</span>
                  ) : (
                    <button
                      className="v2r-settings-ghost-btn"
                      onClick={() => onRevokeSession(s.id)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            No active token sessions found.
          </div>
        )}
      </div>
    </div>
  );
});
