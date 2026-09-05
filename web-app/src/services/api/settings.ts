/**
 * Vision2Real – Settings API Client (Stage 6.5)
 * Axios client calls for Profile, Preferences, Change Password, Active Sessions, Data Export, and Account Deletion.
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  auth_provider: string;
  company?: string | null;
  designation?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  timezone: string;
  language: string;
  date_format: string;
  time_format: string;
  profile_visibility: 'public' | 'private';
  updated_at?: string | null;
}

export interface ActiveSession {
  id: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
  device_summary: string;
}

export interface AccountExportData {
  exported_at: string;
  profile: Record<string, any>;
  preferences: Record<string, any>;
  notification_preferences: Record<string, any>;
  summary_counts: Record<string, number>;
}

export const settingsApi = {
  /**
   * Fetch founder profile details.
   */
  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>(`${API_PREFIX}/settings/profile`);
    return res.data;
  },

  /**
   * Update profile details.
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await apiClient.patch<UserProfile>(`${API_PREFIX}/settings/profile`, data);
    return res.data;
  },

  /**
   * Fetch workspace preferences.
   */
  async getPreferences(): Promise<UserPreferences> {
    const res = await apiClient.get<UserPreferences>(`${API_PREFIX}/settings/preferences`);
    return res.data;
  },

  /**
   * Update workspace preferences.
   */
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await apiClient.patch<UserPreferences>(`${API_PREFIX}/settings/preferences`, data);
    return res.data;
  },

  /**
   * Change account password.
   */
  async changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<void> {
    await apiClient.post(`${API_PREFIX}/settings/change-password`, data);
  },

  /**
   * List active refresh token sessions.
   */
  async listSessions(): Promise<ActiveSession[]> {
    const res = await apiClient.get<ActiveSession[]>(`${API_PREFIX}/settings/sessions`);
    return res.data;
  },

  /**
   * Revoke a single active session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`${API_PREFIX}/settings/sessions/${sessionId}`);
  },

  /**
   * Revoke all other active sessions except current.
   */
  async revokeOtherSessions(): Promise<{ revoked_count: number }> {
    const res = await apiClient.delete<{ revoked_count: number }>(`${API_PREFIX}/settings/sessions`);
    return res.data;
  },

  /**
   * Export account data JSON.
   */
  async exportAccountData(): Promise<AccountExportData> {
    const res = await apiClient.get<AccountExportData>(`${API_PREFIX}/settings/export`);
    return res.data;
  },

  /**
   * Soft delete account.
   */
  async deleteAccount(data: { password: string; reason?: string }): Promise<void> {
    await apiClient.delete(`${API_PREFIX}/settings/account`, { data });
  },
};
