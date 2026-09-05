/**
 * Vision2Real – DangerZoneSection Component (Stage 6.5)
 * Account deactivation & soft account deletion with password re-authentication.
 */

import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsApi } from '@/services/api/settings';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { toast } from 'sonner';

export const DangerZoneSection = memo(function DangerZoneSection() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      await settingsApi.deleteAccount({ password, reason: reason.trim() || undefined });
      toast.success('Account deactivated. Logging out...');
      await logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="v2r-settings-section v2r-settings-section--danger">
      <div className="v2r-settings-section__header">
        <div>
          <h2 className="v2r-settings-section__title" style={{ color: '#ef4444' }}>Danger Zone</h2>
          <p className="v2r-settings-section__desc">
            Irreversible account actions. Deactivating soft-deletes your account credentials while preserving project historical data.
          </p>
        </div>
      </div>

      <div className="v2r-settings-danger-card">
        <div>
          <strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>Deactivate Account</strong>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '2px 0 0 0' }}>
            Revokes all active sessions and deactivates founder login. Historical validation reports and software build records are preserved.
          </p>
        </div>

        <button
          className="v2r-settings-danger-btn"
          onClick={() => setIsModalOpen(true)}
        >
          Deactivate Account
        </button>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="v2r-drawer-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div
            className="v2r-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h3 id="delete-modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
              Confirm Account Deactivation
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Are you sure you want to deactivate your account? Your login will be disabled and all active sessions revoked.
            </p>

            <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="v2r-settings-label">Re-enter Password to Confirm</label>
                <input
                  type="password"
                  className="v2r-settings-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  autoFocus
                />
              </div>

              <div>
                <label className="v2r-settings-label">Reason for leaving (Optional)</label>
                <input
                  type="text"
                  className="v2r-settings-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Feedback helps us improve..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="v2r-settings-ghost-btn"
                  onClick={() => {
                    setIsModalOpen(false);
                    setPassword('');
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="v2r-settings-danger-btn"
                  disabled={isDeleting || !password}
                >
                  {isDeleting ? 'Deactivating…' : 'Yes, Deactivate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
