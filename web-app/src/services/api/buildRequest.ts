/**
 * Vision2Real – Build Request API Service
 * Production API client methods for managing Build Requests, attachments,
 * timeline events, messages, and analytics in the Founder Workspace.
 * Read-focused service; request mutations/status changes belong to Admin Panel (Stage 7).
 */

import { apiClient } from './client';
import { API_PREFIX } from './config';

export type BuildRequestStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'PLANNING'
  | 'UI_DESIGN'
  | 'BACKEND'
  | 'FRONTEND'
  | 'TESTING'
  | 'DEPLOYMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type Priority = 'HIGH' | 'NORMAL' | 'LOW';

export type BuildRequestTimelineEventType =
  | 'REQUEST_CREATED'
  | 'REQUEST_ACCEPTED'
  | 'PLANNING_STARTED'
  | 'UI_DESIGN_STARTED'
  | 'BACKEND_STARTED'
  | 'FRONTEND_STARTED'
  | 'TESTING_STARTED'
  | 'DEPLOYMENT_STARTED'
  | 'MESSAGE_POSTED'
  | 'STATUS_UPDATED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_CANCELLED';

export interface BuildRequestAttachment {
  id: string;
  build_request_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  download_url: string;
  created_at: string;
}

export interface TimelineEventResponse {
  id: string;
  build_request_id: string;
  event_type: BuildRequestTimelineEventType;
  title: string;
  description?: string | null;
  created_at: string;
}

export interface MessageResponse {
  id: string;
  build_request_id: string;
  sender_type: 'FOUNDER' | 'ADMIN';
  sender_id: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface MessageCreate {
  message: string;
}

export interface BuildRequestResponse {
  id: string;
  founder_id: string;
  title: string;
  startup_name?: string | null;
  description: string;
  product_category?: string | null;
  target_customer?: string | null;
  target_market?: string | null;
  founder_stage?: string | null;
  priority: Priority;
  status: BuildRequestStatus;
  estimated_duration_days?: number | null;
  current_phase?: string | null;
  current_work?: string | null;
  current_milestone?: string | null;
  progress_percentage: number;
  execution_mode: string;
  version: number;
  is_archived: boolean;
  extra_metadata: Record<string, any>;
  founder_unread_count: number;
  admin_unread_count: number;
  project_slug?: string | null;
  project_id?: string | null;
  workspace_id?: string | null;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  expected_completion_at?: string | null;
  attachments: BuildRequestAttachment[];
  timeline_events: TimelineEventResponse[];
  messages: MessageResponse[];
}

export interface BuildRequestListItem {
  id: string;
  founder_id: string;
  title: string;
  startup_name?: string | null;
  product_category?: string | null;
  target_market?: string | null;
  priority: Priority;
  status: BuildRequestStatus;
  current_phase?: string | null;
  current_milestone?: string | null;
  progress_percentage: number;
  is_archived: boolean;
  founder_unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface BuildRequestAnalytics {
  total_requests: number;
  active_requests: number;
  completed_requests: number;
  cancelled_requests: number;
  average_progress: number;
  average_completion_time_days: number;
  completion_rate: number;
  most_requested_category: string;
  most_requested_market: string;
  latest_request: string;
}

export interface BuildRequestCreateData {
  title: string;
  startup_name?: string | null;
  description: string;
  product_category?: string | null;
  target_customer?: string | null;
  target_market?: string | null;
  founder_stage?: string | null;
  priority?: Priority;
  estimated_duration_days?: number | null;
  current_phase?: string | null;
  current_work?: string | null;
  current_milestone?: string | null;
  execution_mode?: string;
  version?: number;
  extra_metadata?: Record<string, any>;
  project_slug?: string | null;
  project_id?: string | null;
  workspace_id?: string | null;
  /** Idempotency key — passed as both body field and Idempotency-Key header */
  idempotency_key?: string | null;
}

export interface BuildRequestListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  product_category?: string;
  target_market?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_archived?: boolean;
}

export interface BuildRequestPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface BuildRequestListResponse {
  data: BuildRequestListItem[];
  pagination: BuildRequestPagination;
}

export interface BuildRequestMutationResponse {
  message: string;
  data: BuildRequestResponse;
}

export const buildRequestApi = {
  /**
   * Create a new Build Request (used by marketing integration submission).
   * Passes idempotency_key as both body field and Idempotency-Key header so the
   * backend can safely de-duplicate retried submissions.
   */
  async createBuildRequest(
    data: BuildRequestCreateData,
    idempotencyKey?: string
  ): Promise<BuildRequestResponse> {
    const headers: Record<string, string> = {};
    const key = idempotencyKey ?? data.idempotency_key;
    if (key) {
      headers['Idempotency-Key'] = key;
    }
    const res = await apiClient.post<BuildRequestMutationResponse>(
      `${API_PREFIX}/build-requests`,
      data,
      { headers }
    );
    return res.data.data;
  },

  /**
   * List founder's Build Requests with filtering, search, pagination, and sorting
   */
  async listBuildRequests(
    params: BuildRequestListParams = {},
    options?: { signal?: AbortSignal }
  ): Promise<BuildRequestListResponse> {
    const res = await apiClient.get<BuildRequestListResponse>(`${API_PREFIX}/build-requests`, {
      params,
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Fetch a single Build Request by ID (tracking portal view)
   */
  async getBuildRequest(
    id: string,
    include_archived = false,
    options?: { signal?: AbortSignal }
  ): Promise<BuildRequestResponse> {
    const res = await apiClient.get<BuildRequestResponse>(`${API_PREFIX}/build-requests/${id}`, {
      params: { include_archived },
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Upload attachment files for a Build Request
   */
  async uploadAttachment(id: string, files: File[]): Promise<BuildRequestResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const res = await apiClient.post<BuildRequestMutationResponse>(
      `${API_PREFIX}/build-requests/${id}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  /**
   * Download a secure attachment blob
   */
  async downloadAttachment(request_id: string, attachment_id: string): Promise<Blob> {
    const res = await apiClient.get(`${API_PREFIX}/build-requests/${request_id}/attachments/${attachment_id}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Fetch chronological timeline events for a Build Request
   */
  async getTimeline(id: string, options?: { signal?: AbortSignal }): Promise<TimelineEventResponse[]> {
    const res = await apiClient.get<TimelineEventResponse[]>(`${API_PREFIX}/build-requests/${id}/timeline`, {
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Fetch conversation messages for a Build Request
   */
  async getMessages(id: string, options?: { signal?: AbortSignal }): Promise<MessageResponse[]> {
    const res = await apiClient.get<MessageResponse[]>(`${API_PREFIX}/build-requests/${id}/messages`, {
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Post a founder message to the thread
   */
  async postMessage(id: string, data: MessageCreate): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>(`${API_PREFIX}/build-requests/${id}/messages`, data);
    return res.data;
  },

  /**
   * Fetch aggregated analytics metrics for founder build requests
   */
  async getAnalytics(options?: { signal?: AbortSignal }): Promise<BuildRequestAnalytics> {
    const res = await apiClient.get<BuildRequestAnalytics>(`${API_PREFIX}/build-requests/analytics`, {
      signal: options?.signal,
    });
    return res.data;
  },
};
