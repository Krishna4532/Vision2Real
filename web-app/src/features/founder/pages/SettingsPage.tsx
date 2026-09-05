/**
 * Vision2Real – SettingsPage (Stage 6.5)
 * Production-ready Founder Workspace Settings page.
 * Includes Profile, Workspace Preferences, Notifications (reusing Stage 6.4 Engine),
 * Security (Password Change & Active Sessions), Data & Privacy (JSON Export), and Danger Zone.
 */

import { memo, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { ProfileSection } from '../components/settings/ProfileSection';
import { PreferencesSection } from '../components/settings/PreferencesSection';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { SecuritySection } from '../components/settings/SecuritySection';
import { DataPrivacySection } from '../components/settings/DataPrivacySection';
import { DangerZoneSection } from '../components/settings/DangerZoneSection';
import './SettingsPage.css';

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'security' | 'data' | 'danger';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security & Sessions' },
  { id: 'data', label: 'Data & Privacy' },
  { id: 'danger', label: 'Danger Zone' },
];

export const SettingsPage = memo(function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const {
    profile,
    preferences,
    sessions,
    isLoading,
    isSaving,
    error,
    updateProfileField,
    updatePreferenceField,
    revokeSession,
    revokeOtherSessions,
    exportAccountData,
    reload,
  } = useSettings();

  if (isLoading) {
    return (
      <div className="v2r-settings-page" aria-busy="true">
        <div className="v2r-skeleton" style={{ height: 40, width: 280, borderRadius: 'var(--radius-lg)' }} />
        <div className="v2r-skeleton" style={{ height: 240, borderRadius: 'var(--radius-2xl)' }} />
      </div>
    );
  }

  if (error || !profile || !preferences) {
    return (
      <div className="v2r-settings-page">
        <div className="v2r-widget__error">
          <span>{error || 'Failed to load settings.'}</span>
          <button className="v2r-widget__retry" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v2r-settings-page">
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#fff', margin: 0 }}>
          Founder Settings
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Manage your account profile, workspace preferences, security credentials, and platform alerts.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <nav className="v2r-settings-nav-tabs" aria-label="Settings categories">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`v2r-settings-nav-tab ${activeTab === tab.id ? 'v2r-settings-nav-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={tab.id === 'danger' ? { color: activeTab === 'danger' ? '#ef4444' : undefined } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <ProfileSection
          profile={profile}
          onChange={updateProfileField}
          isSaving={isSaving}
        />
      )}

      {activeTab === 'preferences' && (
        <PreferencesSection
          preferences={preferences}
          onChange={updatePreferenceField}
          isSaving={isSaving}
        />
      )}

      {activeTab === 'notifications' && (
        <div className="v2r-settings-section">
          <NotificationPreferences />
        </div>
      )}

      {activeTab === 'security' && (
        <SecuritySection
          sessions={sessions}
          onRevokeSession={revokeSession}
          onRevokeOtherSessions={revokeOtherSessions}
        />
      )}

      {activeTab === 'data' && (
        <DataPrivacySection onExportData={exportAccountData} />
      )}

      {activeTab === 'danger' && (
        <DangerZoneSection />
      )}
    </div>
  );
});
