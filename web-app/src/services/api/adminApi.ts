import { apiClient } from './client';
import type { UserProfile } from '@/services/auth/types';

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface AdminDashboardSummary {
  total_founders: number;
  total_reality_sprints: number;
  total_build_requests: number;
}

// ── Founder Management ───────────────────────────────────────────────────────

export interface FounderListItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  auth_provider: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  validations_count: number;
  reality_sprints_count: number;
  build_requests_count: number;
}

export interface PaginatedFoundersResponse {
  items: FounderListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FounderWorkspaceSummary {
  validations_count: number;
  reality_sprints_count: number;
  build_requests_count: number;
  projects_count: number;
}

export interface FounderSubmissionItem {
  id: string;
  type: 'REALITY_SPRINT' | 'BUILD_REQUEST' | 'VALIDATION';
  title: string;
  status: string;
  priority: string | null;
  created_at: string;
}

export interface FounderActivityItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  created_at: string;
}

export interface FounderDetailResponse {
  id: string;
  full_name: string;
  email: string;
  role: string;
  auth_provider: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  summary: FounderWorkspaceSummary;
  submissions: FounderSubmissionItem[];
  activities: FounderActivityItem[];
}

export interface FounderListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

// ── Stage 7.5 Notification & Campaign Center Types ────────────────────────────

export interface CampaignAnalyticsResponse {
  total_campaigns: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_read: number;
  total_clicked: number;
  avg_delivery_rate: number;
  avg_ctr: number;
}

export interface MarketingCampaignItem {
  id: string;
  name: string;
  description?: string | null;
  audience: string;
  target_founder_ids?: string[] | null;
  channels: string[];
  title: string;
  body: string;
  deep_link: string;
  action_label: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  stats_sent: number;
  stats_delivered: number;
  stats_failed: number;
  stats_read: number;
  stats_clicked: number;
  extra_metadata?: Record<string, any>;
}

export interface PaginatedCampaignsResponse {
  items: MarketingCampaignItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CampaignCreatePayload {
  name: string;
  description?: string;
  audience: string;
  target_founder_ids?: string[];
  channels: string[];
  title: string;
  body: string;
  deep_link?: string;
  action_label?: string;
  scheduled_at?: string;
  extra_metadata?: Record<string, any>;
}

export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  audience?: string;
  target_founder_ids?: string[];
  channels?: string[];
  title?: string;
  body?: string;
  deep_link?: string;
  action_label?: string;
  scheduled_at?: string;
  extra_metadata?: Record<string, any>;
}

export interface CampaignDeliveryLogItem {
  id: string;
  campaign_id: string;
  founder_id: string;
  founder_name?: string | null;
  founder_email?: string | null;
  channel: string;
  status: string;
  error_message?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  clicked_at?: string | null;
  created_at: string;
}

export interface PaginatedDeliveryLogsResponse {
  items: CampaignDeliveryLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface NotificationTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  deep_link: string;
  action_label: string;
  default_channels: string[];
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplatePayload {
  name: string;
  category: string;
  subject: string;
  body: string;
  deep_link?: string;
  action_label?: string;
  default_channels?: string[];
  variables?: string[];
}

export interface PushSubscriberItem {
  id: string;
  founder_id: string;
  founder_name?: string | null;
  founder_email?: string | null;
  endpoint: string;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
}

export interface PaginatedPushSubscribersResponse {
  items: PushSubscriberItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FounderPreferenceAdminItem {
  founder_id: string;
  founder_name?: string | null;
  founder_email?: string | null;
  browser_push_enabled: boolean;
  email_enabled: boolean;
  validation_notifications: boolean;
  sprint_notifications: boolean;
  build_notifications: boolean;
  marketing_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notification_frequency: string;
  updated_at: string;
}

export interface PaginatedFounderPreferencesResponse {
  items: FounderPreferenceAdminItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── API Object ───────────────────────────────────────────────────────────────

export const adminApi = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  getAdminMe: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>('/api/v1/admin/me');
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardSummary: async (): Promise<AdminDashboardSummary> => {
    const res = await apiClient.get<AdminDashboardSummary>('/api/v1/admin/dashboard/summary');
    return res.data;
  },

  // ── Founder Management ────────────────────────────────────────────────────
  listFounders: async (params: FounderListParams = {}): Promise<PaginatedFoundersResponse> => {
    const res = await apiClient.get<PaginatedFoundersResponse>('/api/v1/admin/founders', {
      params,
    });
    return res.data;
  },

  getFounderDetail: async (founderId: string): Promise<FounderDetailResponse> => {
    const res = await apiClient.get<FounderDetailResponse>(`/api/v1/admin/founders/${founderId}`);
    return res.data;
  },

  // ── Validation Management ─────────────────────────────────────────────────
  listValidations: async (params: ValidationListParams = {}): Promise<PaginatedValidationsResponse> => {
    const res = await apiClient.get<PaginatedValidationsResponse>('/api/v1/admin/validations', {
      params,
    });
    return res.data;
  },

  getValidationDetail: async (validationId: string): Promise<AdminValidationDetailResponse> => {
    const res = await apiClient.get<AdminValidationDetailResponse>(`/api/v1/admin/validations/${validationId}`);
    return res.data;
  },

  // ── Reality Sprint Operations ──────────────────────────────────────────────
  listRealitySprints: async (params: RealitySprintListParams = {}): Promise<PaginatedRealitySprintsResponse> => {
    const res = await apiClient.get<PaginatedRealitySprintsResponse>('/api/v1/admin/reality-sprints', {
      params,
    });
    return res.data;
  },

  getRealitySprintDetail: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.get<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}`);
    return res.data;
  },

  approveRealitySprint: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/approve`);
    return res.data;
  },

  rejectRealitySprint: async (sprintId: string, reason?: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/reject`, { reason });
    return res.data;
  },

  startRealitySprint: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/start`);
    return res.data;
  },

  pauseRealitySprint: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/pause`);
    return res.data;
  },

  resumeRealitySprint: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/resume`);
    return res.data;
  },

  updateRealitySprintProgress: async (
    sprintId: string,
    progress: number,
    milestones?: RealitySprintMilestoneItem[]
  ): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/progress`, {
      progress,
      milestones,
    });
    return res.data;
  },

  completeRealitySprint: async (sprintId: string): Promise<AdminRealitySprintDetailResponse> => {
    const res = await apiClient.patch<AdminRealitySprintDetailResponse>(`/api/v1/admin/reality-sprints/${sprintId}/complete`);
    return res.data;
  },

  downloadRealitySprintAttachment: async (sprintId: string, attachmentId: string): Promise<Blob> => {
    const res = await apiClient.get(`/api/v1/admin/reality-sprints/${sprintId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  // ── Build Request Operations ───────────────────────────────────────────────
  listBuildRequests: async (params: BuildRequestListParams = {}): Promise<PaginatedBuildRequestsResponse> => {
    const res = await apiClient.get<PaginatedBuildRequestsResponse>('/api/v1/admin/build-requests', {
      params,
    });
    return res.data;
  },

  getBuildRequestDetail: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.get<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}`);
    return res.data;
  },

  approveBuildRequest: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/approve`);
    return res.data;
  },

  rejectBuildRequest: async (requestId: string, reason?: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/reject`, { reason });
    return res.data;
  },

  startBuildDevelopment: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/start`);
    return res.data;
  },

  pauseBuildDevelopment: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/pause`);
    return res.data;
  },

  resumeBuildDevelopment: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/resume`);
    return res.data;
  },

  updateBuildRequestProgress: async (
    requestId: string,
    progressPercentage: number,
    currentPhase?: string,
    currentMilestone?: string,
    milestones?: BuildRequestMilestoneItem[]
  ): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/progress`, {
      progress_percentage: progressPercentage,
      current_phase: currentPhase,
      current_milestone: currentMilestone,
      milestones,
    });
    return res.data;
  },

  completeBuildDevelopment: async (requestId: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/complete`);
    return res.data;
  },

  addBuildRequestNote: async (requestId: string, content: string): Promise<AdminBuildRequestDetailResponse> => {
    const res = await apiClient.patch<AdminBuildRequestDetailResponse>(`/api/v1/admin/build-requests/${requestId}/note`, { content });
    return res.data;
  },

  downloadBuildRequestAttachment: async (requestId: string, attachmentId: string): Promise<Blob> => {
    const res = await apiClient.get(`/api/v1/admin/build-requests/${requestId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  // ── Stage 7.5 Notification & Campaign Center ────────────────────────────────
  getCampaignAnalytics: async (): Promise<CampaignAnalyticsResponse> => {
    const res = await apiClient.get<CampaignAnalyticsResponse>('/api/v1/admin/campaigns/analytics');
    return res.data;
  },

  listCampaigns: async (params: { page?: number; page_size?: number; search?: string; status?: string; audience?: string; sort_by?: string; sort_order?: string } = {}): Promise<PaginatedCampaignsResponse> => {
    const res = await apiClient.get<PaginatedCampaignsResponse>('/api/v1/admin/campaigns', { params });
    return res.data;
  },

  createCampaign: async (payload: CampaignCreatePayload): Promise<MarketingCampaignItem> => {
    const res = await apiClient.post<MarketingCampaignItem>('/api/v1/admin/campaigns', payload);
    return res.data;
  },

  getCampaignDetail: async (campaignId: string): Promise<MarketingCampaignItem> => {
    const res = await apiClient.get<MarketingCampaignItem>(`/api/v1/admin/campaigns/${campaignId}`);
    return res.data;
  },

  updateCampaign: async (campaignId: string, payload: CampaignUpdatePayload): Promise<MarketingCampaignItem> => {
    const res = await apiClient.patch<MarketingCampaignItem>(`/api/v1/admin/campaigns/${campaignId}`, payload);
    return res.data;
  },

  deleteCampaign: async (campaignId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/campaigns/${campaignId}`);
  },

  sendCampaign: async (campaignId: string): Promise<MarketingCampaignItem> => {
    const res = await apiClient.post<MarketingCampaignItem>(`/api/v1/admin/campaigns/${campaignId}/send`);
    return res.data;
  },

  testSendCampaign: async (campaignId: string, targetFounderId: string, previewVariables: Record<string, string> = {}): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/v1/admin/campaigns/${campaignId}/test`, {
      target_founder_id: targetFounderId,
      preview_variables: previewVariables,
    });
    return res.data;
  },

  listDeliveryLogs: async (params: { campaign_id?: string; page?: number; page_size?: number; status?: string; channel?: string } = {}): Promise<PaginatedDeliveryLogsResponse> => {
    const res = await apiClient.get<PaginatedDeliveryLogsResponse>('/api/v1/admin/campaigns/delivery-logs/list', { params });
    return res.data;
  },

  listNotificationTemplates: async (): Promise<NotificationTemplateItem[]> => {
    const res = await apiClient.get<NotificationTemplateItem[]>('/api/v1/admin/campaigns/templates/list');
    return res.data;
  },

  createNotificationTemplate: async (payload: NotificationTemplatePayload): Promise<NotificationTemplateItem> => {
    const res = await apiClient.post<NotificationTemplateItem>('/api/v1/admin/campaigns/templates/create', payload);
    return res.data;
  },

  updateNotificationTemplate: async (templateId: string, payload: Partial<NotificationTemplatePayload>): Promise<NotificationTemplateItem> => {
    const res = await apiClient.patch<NotificationTemplateItem>(`/api/v1/admin/campaigns/templates/${templateId}`, payload);
    return res.data;
  },

  deleteNotificationTemplate: async (templateId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/campaigns/templates/${templateId}`);
  },

  listPushSubscribers: async (params: { page?: number; page_size?: number; search?: string } = {}): Promise<PaginatedPushSubscribersResponse> => {
    const res = await apiClient.get<PaginatedPushSubscribersResponse>('/api/v1/admin/campaigns/subscribers/list', { params });
    return res.data;
  },

  listFounderPreferences: async (params: { page?: number; page_size?: number; search?: string } = {}): Promise<PaginatedFounderPreferencesResponse> => {
    const res = await apiClient.get<PaginatedFounderPreferencesResponse>('/api/v1/admin/campaigns/founder-preferences/list', { params });
    return res.data;
  },
};

// ── Validation Management Types ─────────────────────────────────────────────

export interface ValidationFounderInfo {
  id: string;
  full_name: string;
  email: string;
}

export interface ValidationInputData {
  idea_description: string;
  target_customer: string | null;
  target_market: string | null;
  founder_stage: string | null;
}

export interface ValidationEventItem {
  id: string;
  event_type: string;
  metadata_json: Record<string, any> | null;
  created_at: string;
}

export interface ValidationOperationalMeta {
  llm_provider: string | null;
  llm_model: string | null;
  prompt_version: string | null;
  report_schema_version: string | null;
  processing_time_ms: number | null;
  provider_latency_ms: number | null;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  estimated_cost: number | null;
  review_status: string | null;
}

export interface AdminValidationListItem {
  id: string;
  status: string;
  source: string;
  overall_score: number | null;
  recommendation: string | null;
  llm_model: string | null;
  llm_provider: string | null;
  processing_time_ms: number | null;
  created_at: string;
  founder: ValidationFounderInfo | null;
  idea_snippet: string | null;
}

export interface PaginatedValidationsResponse {
  items: AdminValidationListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminValidationDetailResponse {
  id: string;
  status: string;
  source: string;
  overall_score: number | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
  founder: ValidationFounderInfo | null;
  inputs: ValidationInputData | null;
  report_json: Record<string, any> | null;
  operational: ValidationOperationalMeta;
  events: ValidationEventItem[];
}

export interface ValidationListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  founder_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}

// ── Reality Sprint Management Types ─────────────────────────────────────────

export interface RealitySprintFounderInfo {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  founder_stage?: string | null;
  role?: string | null;
}

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

export interface AdminRealitySprintListItem {
  id: string;
  title: string;
  startup_name: string | null;
  description_snippet: string | null;
  status: string;
  priority: string;
  progress: number;
  created_at: string;
  updated_at: string;
  founder: RealitySprintFounderInfo | null;
}

export interface PaginatedRealitySprintsResponse {
  items: AdminRealitySprintListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RealitySprintActivityItem {
  id: string;
  actor_id: string | null;
  actor_role: string;
  event_type: string;
  metadata_json: Record<string, any> | null;
  created_at: string;
}

export interface RealitySprintMilestoneItem {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
}

export interface AdminRealitySprintDetailResponse {
  id: string;
  title: string;
  startup_name: string | null;
  description: string;
  target_customer: string | null;
  target_market: string | null;
  founder_stage: string | null;
  status: string;
  priority: string;
  progress: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  review_started_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  founder: RealitySprintFounderInfo | null;
  milestones: RealitySprintMilestoneItem[];
  activities: RealitySprintActivityItem[];
  attachments?: RealitySprintAttachment[];
  extra_metadata: Record<string, any>;
}

export interface RealitySprintListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  founder_id?: string;
  sort_by?: string;
  sort_order?: string;
}

// ── Build Request Operations Types ───────────────────────────────────────────

export interface BuildRequestFounderInfo {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  founder_stage?: string | null;
  role?: string;
}

export interface AdminBuildRequestListItem {
  id: string;
  founder_id: string;
  project_title: string;
  startup_name: string | null;
  description_snippet: string | null;
  product_category: string | null;
  priority: string;
  status: string;
  progress_percentage: number;
  current_phase: string | null;
  current_milestone: string | null;
  created_at: string;
  updated_at: string;
  founder: BuildRequestFounderInfo | null;
}

export interface PaginatedBuildRequestsResponse {
  items: AdminBuildRequestListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BuildRequestMilestoneItem {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  completed: boolean;
  completed_at?: string | null;
}

export interface BuildRequestOperationalNote {
  id: string;
  author_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface BuildRequestTimelineEventItem {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  created_at: string;
}

export interface BuildRequestAttachmentItem {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  download_url: string;
  created_at: string;
}

export interface AdminBuildRequestDetailResponse {
  id: string;
  founder_id: string;
  title: string;
  startup_name: string | null;
  description: string;
  product_category: string | null;
  target_customer: string | null;
  target_market: string | null;
  founder_stage: string | null;
  priority: string;
  status: string;
  estimated_duration_days: number | null;
  current_phase: string | null;
  current_work: string | null;
  current_milestone: string | null;
  progress_percentage: number;
  execution_mode: string;
  version: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  expected_completion_at: string | null;
  founder: BuildRequestFounderInfo | null;
  attachments: BuildRequestAttachmentItem[];
  timeline_events: BuildRequestTimelineEventItem[];
  milestones: BuildRequestMilestoneItem[];
  operational_notes: BuildRequestOperationalNote[];
  extra_metadata: Record<string, any>;
}

export interface BuildRequestListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  founder_id?: string;
  sort_by?: string;
  sort_order?: string;
}
