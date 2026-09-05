/**
 * Vision2Real – Validation Session Context & Provider
 * Manages guest validation state, localStorage recovery, state stream subscriptions,
 * session transfer to founder account, and validation history.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  ValidationSession,
  ValidationSessionSummary,
  UploadedFileContext,
} from '@/types/validation';
import {
  createValidationSession,
  startBackendStateStream,
} from '@/services/api/validation';

const STORAGE_SESSION_KEY = 'v2r_guest_validation_session';
const STORAGE_HISTORY_KEY = 'v2r_validation_history';

interface ValidationSessionContextType {
  session: ValidationSession | null;
  validationHistory: ValidationSessionSummary[];
  isValidating: boolean;
  isCompleted: boolean;
  startValidation: (idea: string, files?: UploadedFileContext[]) => Promise<void>;
  transferSessionToAccount: (userData: { name: string; email: string }) => Promise<{ success: boolean }>;
  resetValidation: () => void;
  recoverSession: () => void;
}

const ValidationSessionContext = createContext<ValidationSessionContextType | undefined>(
  undefined
);

export function ValidationSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationSessionSummary[]>([]);
  const [cancelStream, setCancelStream] = useState<(() => void) | null>(null);

  /* Load stored session & history on initial mount */
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (storedHistory) {
        setValidationHistory(JSON.parse(storedHistory));
      }

      const storedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (storedSession) {
        const parsed: ValidationSession = JSON.parse(storedSession);
        setSession(parsed);
      }
    } catch (e) {
      console.warn('Failed to load validation session from storage:', e);
    }
  }, []);

  /* Persist active session changes */
  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    }
  }, [session]);

  /* Persist validation history */
  const saveToHistory = useCallback((completedSession: ValidationSession) => {
    if (!completedSession.reportPreview) return;

    const topRec = completedSession.recommendations[0]?.recommendedModule || 'Market Analysis';
    const summaryItem: ValidationSessionSummary = {
      id: completedSession.id,
      createdAt: completedSession.createdAt,
      ideaSnippet: completedSession.ideaText.substring(0, 90) + '...',
      confidence: completedSession.reportPreview.confidence,
      topRecommendation: topRec,
    };

    setValidationHistory((prev) => {
      const exists = prev.some((item) => item.id === summaryItem.id);
      if (exists) return prev;
      const updated = [summaryItem, ...prev];
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* Start AI validation process */
  const startValidation = useCallback(
    async (ideaText: string, files: UploadedFileContext[] = []) => {
      if (cancelStream) {
        cancelStream();
      }

      const newSession = await createValidationSession(ideaText, files);
      setSession(newSession);

      const cancel = startBackendStateStream(
        newSession,
        (updated) => {
          setSession(updated);
        },
        (completed) => {
          saveToHistory(completed);
        }
      );

      setCancelStream(() => cancel);
    },
    [cancelStream, saveToHistory]
  );

  /* Transfer guest session to newly created account */
  const transferSessionToAccount = useCallback(
    async (userData: { name: string; email: string }) => {
      if (!session) return { success: false };

      // Attach user info to session
      const updatedSession: ValidationSession = {
        ...session,
        userId: `usr_${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        updatedAt: new Date().toISOString(),
      };

      setSession(updatedSession);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedSession));
      saveToHistory(updatedSession);

      // In production, this syncs with auth API
      return { success: true };
    },
    [session, saveToHistory]
  );

  /* Reset validation flow for "Validate Another Idea" */
  const resetValidation = useCallback(() => {
    if (cancelStream) {
      cancelStream();
      setCancelStream(null);
    }
    setSession(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }, [cancelStream]);

  /* Explicit recover session trigger */
  const recoverSession = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to recover validation session:', e);
    }
  }, []);

  const isValidating =
    session?.status === 'preparing' ||
    session?.status === 'validating' ||
    session?.status === 'report_generating';

  const isCompleted = session?.status === 'completed';

  return (
    <ValidationSessionContext.Provider
      value={{
        session,
        validationHistory,
        isValidating,
        isCompleted,
        startValidation,
        transferSessionToAccount,
        resetValidation,
        recoverSession,
      }}
    >
      {children}
    </ValidationSessionContext.Provider>
  );
}

export function useValidationSession() {
  const context = useContext(ValidationSessionContext);
  if (!context) {
    throw new Error('useValidationSession must be used within a ValidationSessionProvider');
  }
  return context;
}
