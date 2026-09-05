/**
 * Vision2Real – Reality Sprint API Service
 * Production API client methods for managing Reality Sprint requests, attachments,
 * status transitions, filtering, search, pagination, and analytics.
 */

import { apiClient } from './client';
import { API_PREFIX } from './config';

export type RealitySprintStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RealitySprintAttachment {
  id: string;
  reality_sprint_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  download_url: string;
  created_at: string;
}

export interface RealitySprintRequest {
  id: string;
  founder_id: string;
  title: string;
  startup_name: string | null;
  description: string;
  target_customer: string | null;
  target_market: string | null;
  founder_stage: string | null;
  status: RealitySprintStatus;
  priority: string;
  request_source: string;
  estimated_duration_days: number | null;
  execution_mode: string;
  version: number;
  is_archived: boolean;
  extra_metadata: Record<string, any>;
  project_id?: string | null;
  workspace_id?: string | null;
  roadmap_id?: string | null;

  // Optional V2 Deliverables
  agent_execution?: Record<string, any> | null;
  deliverables?: any[];
  timeline?: any[];
  research?: Record<string, any> | null;
  roadmap?: Record<string, any> | null;
  prd?: Record<string, any> | null;
  architecture?: Record<string, any> | null;
  technical_plan?: Record<string, any> | null;
  generated_assets?: any[];
  design?: Record<string, any> | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  review_started_at: string | null;
  accepted_at: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  attachments: RealitySprintAttachment[];
}

export interface RealitySprintCreateData {
  title: string;
  startup_name?: string | null;
  description: string;
  target_customer?: string | null;
  target_market?: string | null;
  founder_stage?: string | null;
  priority?: string;
  request_source?: string;
  estimated_duration_days?: number | null;
  execution_mode?: string;
  version?: number;
  extra_metadata?: Record<string, any>;
  project_id?: string | null;
  workspace_id?: string | null;
  roadmap_id?: string | null;
}

export interface RealitySprintUpdateData {
  title?: string;
  startup_name?: string | null;
  description?: string;
  target_customer?: string | null;
  target_market?: string | null;
  founder_stage?: string | null;
  status?: RealitySprintStatus;
  priority?: string;
  estimated_duration_days?: number | null;
  is_archived?: boolean;
  extra_metadata?: Record<string, any>;
}

export interface RealitySprintAnalyticsData {
  total_requests: number;
  submitted: number;
  under_review: number;
  accepted: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  pending: number;
  acceptance_rate: number;
  completion_rate: number;
  average_review_time: number;
  average_completion_time: number;
  latest_request: string;
  most_requested_target_market: string;
  most_requested_founder_stage: string;
}

export interface RealitySprintListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  target_market?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_archived?: boolean;
}

export interface RealitySprintPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface RealitySprintListResponse {
  status: string;
  message: string;
  data: RealitySprintRequest[];
  pagination: RealitySprintPagination;
}

export interface RealitySprintMutationResponse {
  status: string;
  message: string;
  data: RealitySprintRequest;
}

export interface RealitySprintAnalyticsResponse {
  status: string;
  message: string;
  analytics: RealitySprintAnalyticsData;
}

export const realitySprintApi = {
  /**
   * Create a new Reality Sprint request
   */
  async createRealitySprint(data: RealitySprintCreateData): Promise<RealitySprintRequest> {
    const res = await apiClient.post<RealitySprintMutationResponse>(`${API_PREFIX}/reality-sprints`, data);
    return res.data.data;
  },

  /**
   * List founder's Reality Sprint requests with filtering, pagination, and search
   */
  async listRealitySprints(
    params: RealitySprintListParams = {},
    options?: { signal?: AbortSignal }
  ): Promise<RealitySprintListResponse> {
    const res = await apiClient.get<RealitySprintListResponse>(`${API_PREFIX}/reality-sprints`, {
      params,
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Fetch a single Reality Sprint request by ID
   */
  async getRealitySprint(id: string, include_archived = false): Promise<RealitySprintRequest> {
    const res = await apiClient.get<RealitySprintRequest>(`${API_PREFIX}/reality-sprints/${id}`, {
      params: { include_archived },
    });
    return res.data;
  },

  /**
   * Update a Reality Sprint request (details, status, or soft archive toggle)
   */
  async updateRealitySprint(id: string, data: RealitySprintUpdateData): Promise<RealitySprintRequest> {
    const res = await apiClient.patch<RealitySprintMutationResponse>(`${API_PREFIX}/reality-sprints/${id}`, data);
    return res.data.data;
  },

  /**
   * Upload file attachments for a Reality Sprint request
   */
  async uploadAttachment(id: string, files: File[]): Promise<RealitySprintRequest> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const res = await apiClient.post<RealitySprintMutationResponse>(
      `${API_PREFIX}/reality-sprints/${id}/attachments`,
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
   * Get direct download blob URL for a specific attachment
   */
  async downloadAttachment(request_id: string, attachment_id: string): Promise<Blob> {
    const res = await apiClient.get(`${API_PREFIX}/reality-sprints/${request_id}/attachments/${attachment_id}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Fetch founder's aggregated Reality Sprint analytics metrics
   */
  async getAnalytics(options?: { signal?: AbortSignal }): Promise<RealitySprintAnalyticsData> {
    const res = await apiClient.get<RealitySprintAnalyticsResponse>(`${API_PREFIX}/reality-sprints/analytics`, {
      signal: options?.signal,
    });
    return res.data.analytics;
  },
};
