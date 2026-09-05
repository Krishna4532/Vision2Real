export const ValidationStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ValidationStatus = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export interface ValidationCreateRequest {
  idea_description: string;
  target_customer?: string;
  target_market?: string;
  founder_stage?: string;
  source: string;
  guest_session_id?: string;
}

export interface ValidationAttachmentResponse {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface ValidationInputResponse {
  idea_description: string;
  target_customer?: string;
  target_market?: string;
  founder_stage?: string;
}

export interface ValidationMetadata {
  version: string;
  generated_at: string;
}

export interface ValidationResponse {
  id: string;
  founder_id?: string;
  idea_id?: string;
  guest_session_id?: string;
  source: string;
  status: ValidationStatus | string;
  overall_score?: number;
  recommendation?: string;
  llm_provider?: string;
  llm_model?: string;
  prompt_version?: string;
  report_schema_version?: string;
  processing_time_ms?: number;
  provider_latency_ms?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_cost?: number;
  created_at: string;
  updated_at: string;

  inputs?: ValidationInputResponse;
  attachments: ValidationAttachmentResponse[];
  report_data?: Record<string, unknown>;
  metadata: ValidationMetadata;
}

export interface ValidationStatusResponse {
  id: string;
  status: ValidationStatus | string;
  metadata: ValidationMetadata;
}

export interface ValidationHealthResponse {
  provider_status: string;
  database_status: string;
  storage_status: string;
}

// ── Live Progress / SSE ───────────────────────────────────────────────────────

export interface ValidationProgress {
  validation_id: string;
  stage: string;
  agent_name: string;
  status: 'waiting' | 'running' | 'completed' | 'failed';
  progress_percentage: number;
  message: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  timestamp: string;
}

export interface AgentState {
  name: string;
  description: string;
  icon: string;
  status: 'waiting' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
}

export interface TimelineStep {
  label: string;
  status: 'pending' | 'active' | 'completed';
  timestamp?: string;
  duration_ms?: number;
}

// ── Validation List (Reports History) ────────────────────────────────────────

export interface ValidationListItem {
  id: string;
  source: string;
  status: ValidationStatus | string;
  overall_score?: number;
  recommendation?: string;
  created_at: string;
  updated_at: string;
  idea_description?: string;
  target_customer?: string;
  target_market?: string;
  founder_stage?: string;
  report_available: boolean;
  pdf_available: boolean;
}

export interface ValidationListResponse {
  items: ValidationListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ValidationListParams {
  page?: number;
  page_size?: number;
  search?: string;
  recommendation?: string;
  sort_by?: 'created_at' | 'overall_score';
  sort_order?: 'asc' | 'desc';
}
