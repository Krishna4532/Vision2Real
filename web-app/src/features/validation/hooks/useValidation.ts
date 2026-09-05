import { useState, useCallback, useRef, useEffect } from 'react';
import { validationService } from '@/services/validation/validationService';
import {
  ValidationStatus,
  type AgentState,
  type TimelineStep,
  type ValidationCreateRequest,
  type ValidationProgress,
  type ValidationResponse,
} from '@/services/validation/types';
import { useAuth } from '@/features/auth/context/AuthProvider';

export type UIValidationStatus =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'streaming'
  | 'success'
  | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOrCreateGuestSessionId(): string {
  const KEY = 'v2r_guest_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Agent definitions (display-only metadata — status driven by SSE)
const INITIAL_AGENTS: AgentState[] = [
  { name: 'Document Parser', description: 'Parses your pitch documents into structured text', icon: '📄', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Research Agent', description: 'Researches market demand and evidence signals', icon: '🔬', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Market Intelligence', description: 'Evaluates TAM/SAM/SOM and competitive density', icon: '📊', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Business Model Agent', description: 'Analyzes monetization and value proposition', icon: '💼', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Financial Agent', description: 'Projects margins, CAC payback and unit economics', icon: '💰', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Risk Analysis Agent', description: 'Stress-tests technical and market adoption risks', icon: '⚠️', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Scoring Agent', description: 'Calculates dimensional scorecards and verdict', icon: '🎯', status: 'waiting', progress: 0, message: 'Waiting...' },
  { name: 'Report Generator', description: 'Synthesizes all outputs into executive report', icon: '📋', status: 'waiting', progress: 0, message: 'Waiting...' },
];

const INITIAL_TIMELINE: TimelineStep[] = [
  { label: 'Submission Received', status: 'pending' },
  { label: 'Documents Parsed', status: 'pending' },
  { label: 'Research Completed', status: 'pending' },
  { label: 'Market Analysis Complete', status: 'pending' },
  { label: 'Business Model Analyzed', status: 'pending' },
  { label: 'Financial Analysis Done', status: 'pending' },
  { label: 'Risk Assessment Done', status: 'pending' },
  { label: 'Scoring Finalized', status: 'pending' },
  { label: 'Report Generated', status: 'pending' },
  { label: 'PDF Created', status: 'pending' },
  { label: 'Validation Complete', status: 'pending' },
];

// Maps SSE stage names → agent name (for status updates)
const STAGE_TO_AGENT: Record<string, string> = {
  'Document Parsing': 'Document Parser',
  'Idea Extraction': 'Research Agent',
  'Research Agent': 'Research Agent',
  'Market Analysis': 'Market Intelligence',
  'Business Model': 'Business Model Agent',
  'Financial Analysis': 'Financial Agent',
  'Risk Analysis': 'Risk Analysis Agent',
  'Scoring': 'Scoring Agent',
  'Report Generation': 'Report Generator',
  'PDF Generation': 'Report Generator',
};

// Maps SSE stage → timeline index
const STAGE_TO_TIMELINE: Record<string, number> = {
  'Upload': 0,
  'Document Parsing': 1,
  'Idea Extraction': 2,
  'Research Agent': 2,
  'Market Analysis': 3,
  'Business Model': 4,
  'Financial Analysis': 5,
  'Risk Analysis': 6,
  'Scoring': 7,
  'Report Generation': 8,
  'PDF Generation': 9,
  'Save Results': 10,
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useValidation() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UIValidationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [timeline, setTimeline] = useState<TimelineStep[]>(INITIAL_TIMELINE);
  const [overallProgress, setOverallProgress] = useState(0);
  const [validationId, setValidationId] = useState<string | null>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);

  const cleanupSSE = useCallback(() => {
    if (sseCleanupRef.current) {
      sseCleanupRef.current();
      sseCleanupRef.current = null;
    }
  }, []);

  // Apply SSE progress event to agent + timeline state
  const applyProgressEvent = useCallback((event: ValidationProgress) => {
    setOverallProgress(event.progress_percentage);

    // Update matching agent card
    const agentName = STAGE_TO_AGENT[event.stage];
    if (agentName) {
      setAgents((prev) =>
        prev.map((a) =>
          a.name === agentName
            ? {
                ...a,
                status: event.status as AgentState['status'],
                message: event.message,
                progress: event.status === 'completed' ? 100 : event.status === 'running' ? 60 : a.progress,
                duration_ms: event.duration_ms,
                started_at: event.started_at,
                completed_at: event.completed_at,
              }
            : a
        )
      );
    }

    // Update timeline step
    const timelineIdx = STAGE_TO_TIMELINE[event.stage];
    if (timelineIdx !== undefined && event.status === 'completed') {
      setTimeline((prev) =>
        prev.map((step, idx) => {
          if (idx < timelineIdx) return { ...step, status: 'completed' };
          if (idx === timelineIdx)
            return {
              ...step,
              status: 'completed',
              timestamp: event.completed_at ?? event.timestamp,
              duration_ms: event.duration_ms,
            };
          return step;
        })
      );
    } else if (timelineIdx !== undefined && event.status === 'running') {
      setTimeline((prev) =>
        prev.map((step, idx) =>
          idx === timelineIdx ? { ...step, status: 'active' } : step
        )
      );
    }
  }, []);

  const submit = useCallback(
    async (
      data: Omit<ValidationCreateRequest, 'source' | 'guest_session_id'>,
      files: File[],
      source: string
    ) => {
      try {
        cleanupSSE();
        setError(null);
        setAgents(INITIAL_AGENTS);
        setTimeline(INITIAL_TIMELINE);
        setOverallProgress(0);
        setValidationResult(null);
        setStatus('uploading');

        const requestData: ValidationCreateRequest = { ...data, source };
        const guestSessionId = user ? undefined : getOrCreateGuestSessionId();
        if (guestSessionId) requestData.guest_session_id = guestSessionId;

        // POST → backend returns QUEUED validation instantly
        const queued = await validationService.submitValidation(requestData, files);
        setValidationId(queued.id);
        setStatus('queued');

        // If already completed (sync fallback), skip SSE
        if (queued.status === ValidationStatus.COMPLETED) {
          setValidationResult(queued);
          setStatus('success');
          return queued;
        }

        // Subscribe to SSE live stream
        setStatus('streaming');
        return new Promise<ValidationResponse | null>((resolve, reject) => {
          const cleanup = validationService.subscribeProgressStream(
            queued.id,
            (event) => applyProgressEvent(event),
            async () => {
              // SSE done — fetch final result
              try {
                const final = await validationService.getValidation(queued.id, guestSessionId);
                setValidationResult(final);
                setStatus('success');
                resolve(final);
              } catch (e) {
                setError('Failed to load validation report.');
                setStatus('error');
                reject(e);
              }
            },
            () => {
              setError('Lost connection to validation stream. Retrying...');
              setStatus('error');
              resolve(null);
            }
          );
          sseCleanupRef.current = cleanup;
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
        setStatus('error');
        return null;
      }
    },
    [user, cleanupSSE, applyProgressEvent]
  );

  const reset = useCallback(() => {
    cleanupSSE();
    setStatus('idle');
    setError(null);
    setValidationResult(null);
    setAgents(INITIAL_AGENTS);
    setTimeline(INITIAL_TIMELINE);
    setOverallProgress(0);
    setValidationId(null);
  }, [cleanupSSE]);

  // Cleanup SSE on unmount
  useEffect(() => () => cleanupSSE(), [cleanupSSE]);

  return {
    status,
    error,
    validationResult,
    agents,
    timeline,
    overallProgress,
    validationId,
    submit,
    reset,
  };
}
