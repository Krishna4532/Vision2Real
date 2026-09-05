/**
 * Vision2Real – ProfileSection Component (Stage 6.5)
 * Manages Full Name, Company, Designation, Bio, Website, LinkedIn, and GitHub with 500ms debounced auto-save.
 */

import { memo } from 'react';
import type { UserProfile } from '@/services/api/settings';

interface ProfileSectionProps {
  profile: UserProfile;
  onChange: (fields: Partial<UserProfile>) => void;
  isSaving: boolean;
}

export const ProfileSection = memo(function ProfileSection({
  profile,
  onChange,
  isSaving,
}: ProfileSectionProps) {
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
    <div className="v2r-settings-section">
      <div className="v2r-settings-section__header">
        <div>
          <h2 className="v2r-settings-section__title">Founder Profile</h2>
          <p className="v2r-settings-section__desc">
            Personal credentials and company background details. Changes auto-save automatically.
          </p>
        </div>
        {isSaving && <span className="v2r-settings-saving-badge">Saving…</span>}
      </div>

      {/* Avatar Header Row */}
      <div className="v2r-settings-avatar-row">
        <div className="v2r-settings-avatar-circle">
          {getInitials(profile.full_name)}
        </div>
        <div>
          <strong style={{ color: '#fff', fontSize: 16 }}>{profile.full_name || 'Founder'}</strong>
          <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {profile.email} • Authenticated via {profile.auth_provider}
          </span>
        </div>
      </div>

      <div className="v2r-settings-form-grid">
        {/* Full Name */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Full Name</label>
          <input
            type="text"
            className="v2r-settings-input"
            value={profile.full_name || ''}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="e.g. Alex Vance"
          />
        </div>

        {/* Email (Read-only) */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Email Address (Read-only)</label>
          <input
            type="email"
            className="v2r-settings-input v2r-settings-input--disabled"
            value={profile.email || ''}
            disabled
          />
        </div>

        {/* Company */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Company Name</label>
          <input
            type="text"
            className="v2r-settings-input"
            value={profile.company || ''}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="e.g. Vision2Real AI"
          />
        </div>

        {/* Designation */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Designation / Role</label>
          <input
            type="text"
            className="v2r-settings-input"
            value={profile.designation || ''}
            onChange={(e) => onChange({ designation: e.target.value })}
            placeholder="e.g. Founder & CEO"
          />
        </div>

        {/* Website */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">Website URL</label>
          <input
            type="url"
            className="v2r-settings-input"
            value={profile.website || ''}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://yourcompany.com"
          />
        </div>

        {/* LinkedIn */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">LinkedIn Profile</label>
          <input
            type="url"
            className="v2r-settings-input"
            value={profile.linkedin || ''}
            onChange={(e) => onChange({ linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/alexvance"
          />
        </div>

        {/* GitHub */}
        <div className="v2r-settings-field">
          <label className="v2r-settings-label">GitHub Profile</label>
          <input
            type="url"
            className="v2r-settings-input"
            value={profile.github || ''}
            onChange={(e) => onChange({ github: e.target.value })}
            placeholder="https://github.com/alexvance"
          />
        </div>

        {/* Bio (Full width) */}
        <div className="v2r-settings-field v2r-settings-field--full">
          <label className="v2r-settings-label">Founder Bio (max 500 characters)</label>
          <textarea
            className="v2r-settings-textarea"
            rows={3}
            maxLength={500}
            value={profile.bio || ''}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Brief description of your startup journey and vision..."
          />
        </div>
      </div>
    </div>
  );
});
