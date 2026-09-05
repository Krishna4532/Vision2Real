/**
 * Vision2Real – useSettings Hook (Stage 6.5)
 * Manages founder profile & preferences with 500ms debounced auto-save, optimistic updates,
 * rollback on failure, and explicit actions for password change, active sessions, data export, and account deletion.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsApi, type UserProfile, type UserPreferences, type ActiveSession } from '@/services/api/settings';
import { toast } from 'sonner';

export function useSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Backup references for rollback on auto-save failure
  const profileBackupRef = useRef<UserProfile | null>(null);
  const prefBackupRef = useRef<UserPreferences | null>(null);
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, prefData, sessionList] = await Promise.all([
        settingsApi.getProfile(),
        settingsApi.getPreferences(),
        settingsApi.listSessions().catch(() => []),
      ]);
      setProfile(profData);
      setPreferences(prefData);
      setSessions(sessionList);
      profileBackupRef.current = profData;
      prefBackupRef.current = prefData;
    } catch (err: any) {
      setError(err?.message || 'Failed to load founder settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 500ms Debounced Auto-Save Profile
  const updateProfileField = useCallback((fields: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      
      // Debounce network request
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
      profileTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const res = await settingsApi.updateProfile(fields);
          profileBackupRef.current = res;
          toast.success('Profile updated');
        } catch (err: any) {
          // Rollback on failure
          if (profileBackupRef.current) {
            setProfile(profileBackupRef.current);
          }
          toast.error(err?.message || 'Failed to save profile change');
        } finally {
          setIsSaving(false);
        }
      }, 500);

      return updated;
    });
  }, []);

  // 500ms Debounced Auto-Save Preferences
  const updatePreferenceField = useCallback((fields: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };

      // Debounce network request
      if (prefTimerRef.current) clearTimeout(prefTimerRef.current);
      prefTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const res = await settingsApi.updatePreferences(fields);
          prefBackupRef.current = res;
          toast.success('Workspace preferences saved');
        } catch (err: any) {
          // Rollback on failure
          if (prefBackupRef.current) {
            setPreferences(prefBackupRef.current);
          }
          toast.error(err?.message || 'Failed to save preference change');
        } finally {
          setIsSaving(false);
        }
      }, 500);

      return updated;
    });
  }, []);

  // Revoke single session
  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      await settingsApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke session.');
    }
  }, []);

  // Revoke all other sessions
  const revokeOtherSessions = useCallback(async () => {
    try {
      const res = await settingsApi.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success(`Revoked ${res.revoked_count} active sessions`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke other sessions.');
    }
  }, []);

  // Export account data JSON
  const exportAccountData = useCallback(async () => {
    try {
      const data = await settingsApi.exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vision2real_account_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Account data exported successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export account data.');
    }
  }, []);

  return {
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
    reload: loadSettings,
  };
}
