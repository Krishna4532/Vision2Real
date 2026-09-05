/**
 * Vision2Real – Build Context & Provider (Stage 6.7.1 Explicit Submission Isolation)
 * Completely decouples Build My Product and Reality Sprint flows via explicit immutable submission types,
 * enforces ephemeral runtime-only confirmation screens (never persisted across browser reloads),
 * handles post-auth auto-resume cleanly, clears dashboard cache on submit, and dispatches real-time invalidation.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type {
  BuildRequestData,
  BuildJourneyPath,
  ProjectContextData,
  ContactInfoData,
  SubmissionType,
} from '@/types/buildProduct';
import type { UploadedFileContext } from '@/types/validation';
import { buildRequestApi } from '@/services/api/buildRequest';
import { realitySprintApi } from '@/services/api/realitySprint';
import { useAuth } from '@/features/auth/context/AuthProvider';

const STORAGE_BUILD_KEY = 'v2r_guest_build_request';
const PENDING_SPRINT_STORAGE_KEY = 'v2r_pending_reality_sprint';
const PENDING_BUILD_STORAGE_KEY = 'v2r_pending_build_request';
const IDEMPOTENCY_KEY_SPRINT = 'v2r_idem_sprint';
const IDEMPOTENCY_KEY_BUILD = 'v2r_idem_build';

// Module-level in-memory cache to preserve File objects across SPA auth redirects
let pendingFilesCache: File[] = [];

/** Generate a UUID v4 string */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get or create a persistent idempotency key in sessionStorage */
function getOrCreateIdempotencyKey(storageKey: string): string {
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const key = generateUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}

export interface SubmitResult {
  success: boolean;
  requiresAuth?: boolean;
  error?: string;
}

interface BuildContextType {
  selectedPath: BuildJourneyPath;
  buildRequest: BuildRequestData;
  createdBuildRequestId: string | null;
  createdSprintId: string | null;
  createdBackendRequestId: string | null; // legacy compatibility
  isSubmitting: boolean;
  isBuildSubmitted: boolean;
  isSprintSubmitted: boolean;
  isSubmitted: boolean; // legacy compatibility
  submissionError: string | null;
  selectJourneyPath: (path: BuildJourneyPath) => void;
  updateProductDescription: (desc: string) => void;
  updateSprintDescription: (desc: string) => void;
  updateUploadedFiles: (files: UploadedFileContext[]) => void;
  updateProjectContext: (context: Partial<ProjectContextData>) => void;
  updateContactInfo: (info: Partial<ContactInfoData>) => void;
  submitRequest: (userData?: { name: string; email: string }) => Promise<SubmitResult>;
  resetBuildRequest: () => void;
  resetSprintRequest: () => void;
  resetRequest: () => void;
  clearSubmissionError: () => void;
}

const createInitialRequest = (): BuildRequestData => ({
  id: `V2R-BLD-${Math.floor(1000 + Math.random() * 9000)}`,
  createdAt: new Date().toISOString(),
  journeyPath: null,
  submissionType: undefined,
  productDescription: '',
  sprintDescription: '',
  uploadedFiles: [],
  projectContext: {
    currentStage: 'Idea',
    estimatedBudget: '',
    additionalContext: '',
  },
  contactInfo: {
    name: '',
    email: '',
    preferredContactMethod: 'Email',
    phone: '',
  },
  status: 'draft',
});

const BuildContext = createContext<BuildContextType | undefined>(undefined);

export function BuildContextProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [selectedPath, setSelectedPath] = useState<BuildJourneyPath>(null);
  const [buildRequest, setBuildRequest] = useState<BuildRequestData>(createInitialRequest);

  // Independent confirmation & ID states (ephemeral, in-memory runtime ONLY)
  const [createdBuildRequestId, setCreatedBuildRequestId] = useState<string | null>(null);
  const [createdSprintId, setCreatedSprintId] = useState<string | null>(null);
  const [isBuildSubmitted, setIsBuildSubmitted] = useState(false);
  const [isSprintSubmitted, setIsSprintSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  /* Load stored draft form data ONLY (Never persist confirmation/submitted state across page loads) */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_BUILD_KEY);
      if (stored) {
        const parsed: BuildRequestData = JSON.parse(stored);
        if (parsed.status !== 'submitted') {
          setBuildRequest(parsed);
          if (parsed.journeyPath) {
            setSelectedPath(parsed.journeyPath);
          }
        } else {
          localStorage.removeItem(STORAGE_BUILD_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load build request draft:', e);
    }
  }, []);

  const selectJourneyPath = useCallback((path: BuildJourneyPath) => {
    setSelectedPath(path);
    const prefix = path === 'reality_sprint' ? 'V2R-SPR' : 'V2R-BLD';
    const requestId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const subType: SubmissionType = path === 'reality_sprint' ? 'REALITY_SPRINT' : 'BUILD_REQUEST';

    setBuildRequest((prev) => {
      const updated: BuildRequestData = {
        ...prev,
        id: requestId,
        journeyPath: path,
        submissionType: subType,
      };
      if (prev.status !== 'submitted') {
        localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  /* Auto-Resume Engine for Pending Guest Submissions upon login/signup */
  useEffect(() => {
    if (!isAuthenticated) return;

    const resumePending = async () => {
      // 1. Check pending Reality Sprint
      const pendingSprintRaw = sessionStorage.getItem(PENDING_SPRINT_STORAGE_KEY);
      if (pendingSprintRaw) {
        try {
          const parsed = JSON.parse(pendingSprintRaw);
          const reqData: BuildRequestData = parsed.buildRequest;
          const desc = reqData.sprintDescription || reqData.productDescription || 'Reality Sprint Validation Brief';
          const title = desc.length > 60 ? `${desc.substring(0, 57)}...` : desc;
          const idemKey = sessionStorage.getItem(IDEMPOTENCY_KEY_SPRINT) || generateUUID();

          const sprintRecord = await realitySprintApi.createRealitySprint({
            title,
            startup_name: reqData.contactInfo.name ? `${reqData.contactInfo.name}'s Startup` : null,
            description: desc,
            target_customer: reqData.projectContext.additionalContext || 'General Target Users',
            target_market: 'Software & Technology',
            founder_stage: reqData.projectContext.currentStage || 'Idea',
            priority: 'NORMAL',
            request_source: 'MARKETING_BUILD_PAGE',
            execution_mode: 'v1',
            version: 1,
            extra_metadata: {
              contact_name: reqData.contactInfo.name,
              contact_email: reqData.contactInfo.email,
              contact_phone: reqData.contactInfo.phone,
              preferred_contact: reqData.contactInfo.preferredContactMethod,
              additional_context: reqData.projectContext.additionalContext,
              idempotency_key: idemKey,
            },
          });

          if (pendingFilesCache.length > 0) {
            try {
              await realitySprintApi.uploadAttachment(sprintRecord.id, pendingFilesCache);
            } catch (attErr) {
              console.warn('Failed to upload cached attachments for pending sprint:', attErr);
            }
          }

          pendingFilesCache = [];
          sessionStorage.removeItem(PENDING_SPRINT_STORAGE_KEY);
          sessionStorage.removeItem(IDEMPOTENCY_KEY_SPRINT);
          sessionStorage.removeItem('v2r_dashboard_cache');
          localStorage.removeItem(STORAGE_BUILD_KEY);

          setCreatedSprintId(sprintRecord.id);
          setIsSprintSubmitted(true);
          localStorage.setItem('v2r_reality_sprints_last_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('v2r_cache_invalidation', { detail: { type: 'sprint', id: sprintRecord.id } }));
          toast.success('Your pending Reality Sprint request has been submitted successfully!');
        } catch (err) {
          console.error('Failed to auto-resume pending Reality Sprint:', err);
        }
      }

      // 2. Check pending Build Request
      const pendingBuildRaw = sessionStorage.getItem(PENDING_BUILD_STORAGE_KEY);
      if (pendingBuildRaw) {
        try {
          const parsed = JSON.parse(pendingBuildRaw);
          const reqData: BuildRequestData = parsed.buildRequest;
          const desc = reqData.productDescription || 'Build My Product Specification';
          const title = desc.length > 60 ? `${desc.substring(0, 57)}...` : desc;
          const idemKey = sessionStorage.getItem(IDEMPOTENCY_KEY_BUILD) || generateUUID();

          const buildRecord = await buildRequestApi.createBuildRequest(
            {
              title,
              startup_name: reqData.contactInfo.name ? `${reqData.contactInfo.name}'s Startup` : null,
              description: desc,
              product_category: 'Full-Stack Software',
              target_customer: reqData.contactInfo.preferredContactMethod || 'Email',
              target_market: 'Software & Technology',
              founder_stage: reqData.projectContext.currentStage || 'Idea',
              priority: 'NORMAL',
              estimated_duration_days: 30,
              current_phase: 'Submission',
              current_milestone: 'Request Received',
              idempotency_key: idemKey,
              extra_metadata: {
                contact_name: reqData.contactInfo.name,
                contact_email: reqData.contactInfo.email,
                contact_phone: reqData.contactInfo.phone,
                preferred_contact: reqData.contactInfo.preferredContactMethod,
                estimated_budget: reqData.projectContext.estimatedBudget,
                additional_context: reqData.projectContext.additionalContext,
              },
            },
            idemKey
          );

          if (pendingFilesCache.length > 0) {
            try {
              await buildRequestApi.uploadAttachment(buildRecord.id, pendingFilesCache);
            } catch (attErr) {
              console.warn('Failed to upload cached attachments for pending build request:', attErr);
            }
          }

          pendingFilesCache = [];
          sessionStorage.removeItem(PENDING_BUILD_STORAGE_KEY);
          sessionStorage.removeItem(IDEMPOTENCY_KEY_BUILD);
          sessionStorage.removeItem('v2r_dashboard_cache');
          localStorage.removeItem(STORAGE_BUILD_KEY);

          setCreatedBuildRequestId(buildRecord.id);
          setIsBuildSubmitted(true);
          localStorage.setItem('v2r_build_requests_last_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('v2r_cache_invalidation', { detail: { type: 'build', id: buildRecord.id } }));
          toast.success('Your pending Build Request has been submitted successfully!');
        } catch (err) {
          console.error('Failed to auto-resume pending Build Request:', err);
        }
      }
    };

    resumePending();
  }, [isAuthenticated]);

  const updateProductDescription = useCallback((desc: string) => {
    setBuildRequest((prev) => {
      const updated = { ...prev, productDescription: desc };
      localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSprintDescription = useCallback((desc: string) => {
    setBuildRequest((prev) => {
      const updated = { ...prev, sprintDescription: desc };
      localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateUploadedFiles = useCallback((files: UploadedFileContext[]) => {
    const raw = files
      .map((f: any) => f.rawFile || f.file)
      .filter((f): f is File => f instanceof File);
    if (raw.length > 0) {
      pendingFilesCache = raw;
    }
    setBuildRequest((prev) => {
      const updated = { ...prev, uploadedFiles: files };
      localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateProjectContext = useCallback((contextData: Partial<ProjectContextData>) => {
    setBuildRequest((prev) => {
      const updated = {
        ...prev,
        projectContext: { ...prev.projectContext, ...contextData },
      };
      localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateContactInfo = useCallback((infoData: Partial<ContactInfoData>) => {
    setBuildRequest((prev) => {
      const updated = {
        ...prev,
        contactInfo: { ...prev.contactInfo, ...infoData },
      };
      localStorage.setItem(STORAGE_BUILD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSubmissionError = useCallback(() => {
    setSubmissionError(null);
  }, []);

  /**
   * Submit Request
   * Enforces strict isolation between Reality Sprint and Build My Product flows based on explicit submissionType.
   */
  const submitRequest = useCallback(
    async (userData?: { name: string; email: string }): Promise<SubmitResult> => {
      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const finalInfo = {
          ...buildRequest.contactInfo,
          name: userData?.name || buildRequest.contactInfo.name || 'Founder',
          email: userData?.email || buildRequest.contactInfo.email,
        };

        const isSprint =
          buildRequest.submissionType === 'REALITY_SPRINT' ||
          selectedPath === 'reality_sprint' ||
          buildRequest.journeyPath === 'reality_sprint';

        // ── Unauthenticated Guard ──
        if (!isAuthenticated) {
          const rawFiles = buildRequest.uploadedFiles
            .map((f: any) => f.rawFile || f.file)
            .filter((f): f is File => f instanceof File);
          if (rawFiles.length > 0) {
            pendingFilesCache = rawFiles;
          }

          const idemStorageKey = isSprint ? IDEMPOTENCY_KEY_SPRINT : IDEMPOTENCY_KEY_BUILD;
          getOrCreateIdempotencyKey(idemStorageKey);

          const pendingKey = isSprint ? PENDING_SPRINT_STORAGE_KEY : PENDING_BUILD_STORAGE_KEY;
          const pendingData = {
            buildRequest: {
              ...buildRequest,
              journeyPath: isSprint ? 'reality_sprint' : 'build_product',
              submissionType: isSprint ? 'REALITY_SPRINT' : 'BUILD_REQUEST',
              contactInfo: finalInfo,
            },
            selectedPath: isSprint ? 'reality_sprint' : 'build_product',
            timestamp: Date.now(),
          };
          sessionStorage.setItem(pendingKey, JSON.stringify(pendingData));
          setIsSubmitting(false);
          return { success: false, requiresAuth: true };
        }

        // ── Authenticated Reality Sprint Submission ──
        if (isSprint) {
          const desc =
            buildRequest.sprintDescription || buildRequest.productDescription || 'Reality Sprint Validation Brief';
          const title = desc.length > 60 ? `${desc.substring(0, 57)}...` : desc;
          const idemKey = getOrCreateIdempotencyKey(IDEMPOTENCY_KEY_SPRINT);

          const sprintRecord = await realitySprintApi.createRealitySprint({
            title,
            startup_name: finalInfo.name ? `${finalInfo.name}'s Startup` : null,
            description: desc,
            target_customer: buildRequest.projectContext.additionalContext || 'General Target Users',
            target_market: 'Software & Technology',
            founder_stage: buildRequest.projectContext.currentStage || 'Idea',
            priority: 'NORMAL',
            request_source: 'MARKETING_BUILD_PAGE',
            execution_mode: 'v1',
            version: 1,
            extra_metadata: {
              contact_name: finalInfo.name,
              contact_email: finalInfo.email,
              contact_phone: finalInfo.phone,
              preferred_contact: finalInfo.preferredContactMethod,
              additional_context: buildRequest.projectContext.additionalContext,
              idempotency_key: idemKey,
            },
          });

          const rawFiles = buildRequest.uploadedFiles
            .map((f: any) => f.rawFile || f.file)
            .filter((f): f is File => f instanceof File);
          const filesToUpload = rawFiles.length > 0 ? rawFiles : pendingFilesCache;

          if (filesToUpload.length > 0) {
            try {
              await realitySprintApi.uploadAttachment(sprintRecord.id, filesToUpload);
            } catch (attErr) {
              console.warn('Failed to upload attachments for sprint:', attErr);
            }
          }

          // Cleanup transient keys upon complete success
          pendingFilesCache = [];
          sessionStorage.removeItem(PENDING_SPRINT_STORAGE_KEY);
          sessionStorage.removeItem(IDEMPOTENCY_KEY_SPRINT);
          sessionStorage.removeItem('v2r_dashboard_cache');
          localStorage.removeItem(STORAGE_BUILD_KEY);

          // Update Sprint state ONLY (do not touch Build Request state)
          setCreatedSprintId(sprintRecord.id);
          setIsSprintSubmitted(true);
          setSubmissionError(null);
          localStorage.setItem('v2r_reality_sprints_last_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('v2r_cache_invalidation', { detail: { type: 'sprint', id: sprintRecord.id } }));

          return { success: true };
        } else {
          // ── Authenticated Build My Product Submission ──
          const desc = buildRequest.productDescription || 'Build My Product Specification';
          const title = desc.length > 60 ? `${desc.substring(0, 57)}...` : desc;
          const idemKey = getOrCreateIdempotencyKey(IDEMPOTENCY_KEY_BUILD);

          const buildRecord = await buildRequestApi.createBuildRequest(
            {
              title,
              startup_name: finalInfo.name ? `${finalInfo.name}'s Startup` : null,
              description: desc,
              product_category: 'Full-Stack Software',
              target_customer: finalInfo.preferredContactMethod || 'Email',
              target_market: 'Software & Technology',
              founder_stage: buildRequest.projectContext.currentStage || 'Idea',
              priority: 'NORMAL',
              estimated_duration_days: 30,
              current_phase: 'Submission',
              current_milestone: 'Request Received',
              idempotency_key: idemKey,
              extra_metadata: {
                contact_name: finalInfo.name,
                contact_email: finalInfo.email,
                contact_phone: finalInfo.phone,
                preferred_contact: finalInfo.preferredContactMethod,
                estimated_budget: buildRequest.projectContext.estimatedBudget,
                additional_context: buildRequest.projectContext.additionalContext,
              },
            },
            idemKey
          );

          const rawFiles = buildRequest.uploadedFiles
            .map((f: any) => f.rawFile || f.file)
            .filter((f): f is File => f instanceof File);
          const filesToUpload = rawFiles.length > 0 ? rawFiles : pendingFilesCache;

          if (filesToUpload.length > 0) {
            try {
              await buildRequestApi.uploadAttachment(buildRecord.id, filesToUpload);
            } catch (attErr) {
              console.warn('Failed to upload attachments for build request:', attErr);
            }
          }

          // Cleanup transient keys upon complete success
          pendingFilesCache = [];
          sessionStorage.removeItem(PENDING_BUILD_STORAGE_KEY);
          sessionStorage.removeItem(IDEMPOTENCY_KEY_BUILD);
          sessionStorage.removeItem('v2r_dashboard_cache');
          localStorage.removeItem(STORAGE_BUILD_KEY);

          // Update Build Request state ONLY (do not touch Reality Sprint state)
          setCreatedBuildRequestId(buildRecord.id);
          setIsBuildSubmitted(true);
          setSubmissionError(null);
          localStorage.setItem('v2r_build_requests_last_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('v2r_cache_invalidation', { detail: { type: 'build', id: buildRecord.id } }));

          return { success: true };
        }
      } catch (err: any) {
        console.error('Failed to submit build request:', err);
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to submit request to server. Please try again.';
        setSubmissionError(msg);
        toast.error(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [buildRequest, selectedPath, isAuthenticated]
  );

  const resetBuildRequest = useCallback(() => {
    setIsBuildSubmitted(false);
    setCreatedBuildRequestId(null);
    setSubmissionError(null);
    sessionStorage.removeItem(PENDING_BUILD_STORAGE_KEY);
    sessionStorage.removeItem(IDEMPOTENCY_KEY_BUILD);
    localStorage.removeItem(STORAGE_BUILD_KEY);
    setBuildRequest(createInitialRequest());
  }, []);

  const resetSprintRequest = useCallback(() => {
    setIsSprintSubmitted(false);
    setCreatedSprintId(null);
    setSubmissionError(null);
    sessionStorage.removeItem(PENDING_SPRINT_STORAGE_KEY);
    sessionStorage.removeItem(IDEMPOTENCY_KEY_SPRINT);
    localStorage.removeItem(STORAGE_BUILD_KEY);
    setBuildRequest(createInitialRequest());
  }, []);

  const resetRequest = useCallback(() => {
    resetBuildRequest();
    resetSprintRequest();
    setSelectedPath(null);
  }, [resetBuildRequest, resetSprintRequest]);

  return (
    <BuildContext.Provider
      value={{
        selectedPath,
        buildRequest,
        createdBuildRequestId,
        createdSprintId,
        createdBackendRequestId: createdBuildRequestId || createdSprintId,
        isSubmitting,
        isBuildSubmitted,
        isSprintSubmitted,
        isSubmitted: isBuildSubmitted || isSprintSubmitted,
        submissionError,
        selectJourneyPath,
        updateProductDescription,
        updateSprintDescription,
        updateUploadedFiles,
        updateProjectContext,
        updateContactInfo,
        submitRequest,
        resetBuildRequest,
        resetSprintRequest,
        resetRequest,
        clearSubmissionError,
      }}
    >
      {children}
    </BuildContext.Provider>
  );
}

export function useBuildContext() {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error('useBuildContext must be used within a BuildContextProvider');
  }
  return context;
}
