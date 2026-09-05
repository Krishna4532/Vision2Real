/**
 * Vision2Real – PreferencesSection Component (Stage 6.5)
 * Manages theme, timezone, language, date/time format, and profile visibility with 500ms debounced auto-save.
 */

import { memo } from 'react';
import type { UserPreferences } from '@/services/api/settings';

interface PreferencesSectionProps {
  preferences: UserPreferences;
  onChange: (fields: Partial<UserPreferences>) => void;
  isSaving: boolean;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export const PreferencesSection = memo(function PreferencesSection({
  preferences,
  onChange,
  isSaving,
}: PreferencesSectionProps) {
  return (
    <div className="v2r-settings-section">
      <div className="v2r-settings-section__header">
        <div>
          <h2 className="v2r-settings-section__title">Workspace Preferences</h2>
          <p className="v2r-settings-section__desc">
            Customize visual theme, timezones, and regional formatting.
          </p>
        </div>
        {isSaving && <span className="v2r-settings-saving-badge">Saving…</span>}
      </div>

      <div className="v2r-settings-form-grid">
        {/* Theme */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Interface Theme</label>
          <select
            className="v2r-settings-select"
            value={preferences.theme || 'dark'}
            onChange={(e) => onChange({ theme: e.target.value as any })}
          >
            <option value="dark">Dark Mode (Default)</option>
            <option value="light">Light Mode</option>
            <option value="system">System Preference</option>
          </select>
        </div>

        {/* Timezone */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Primary Timezone</label>
          <select
            className="v2r-settings-select"
            value={preferences.timezone || 'UTC'}
            onChange={(e) => onChange({ timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Display Language</label>
          <select
            className="v2r-settings-select"
            value={preferences.language || 'en'}
            onChange={(e) => onChange({ language: e.target.value })}
          >
            <option value="en">English (US)</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        {/* Profile Visibility */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Profile Visibility</label>
          <select
            className="v2r-settings-select"
            value={preferences.profile_visibility || 'private'}
            onChange={(e) => onChange({ profile_visibility: e.target.value as any })}
          >
            <option value="private">Private (Workspace Only)</option>
            <option value="public">Public Founder Profile</option>
          </select>
        </div>

        {/* Date Format */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Date Format</label>
          <select
            className="v2r-settings-select"
            value={preferences.date_format || 'YYYY-MM-DD'}
            onChange={(e) => onChange({ date_format: e.target.value })}
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
          </select>
        </div>

        {/* Time Format */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Time Format</label>
          <select
            className="v2r-settings-select"
            value={preferences.time_format || '24h'}
            onChange={(e) => onChange({ time_format: e.target.value })}
          >
            <option value="24h">24-hour (16:30)</option>
            <option value="12h">12-hour (4:30 PM)</option>
          </select>
        </div>
      </div>
    </div>
  );
});
