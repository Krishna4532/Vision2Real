export type IdeaLifecycleStage =
  | 'DRAFT'
  | 'READY_FOR_VALIDATION'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REALITY_SPRINT'
  | 'BUILD_REQUESTED'
  | 'IN_DEVELOPMENT'
  | 'LAUNCHED'
  | 'ARCHIVED';

export interface Idea {
  id: string;
  slug: string;
  founder_id: string;
  title: string;
  problem_statement: string;
  proposed_solution: string;
  industry: string;
  target_market: string;
  current_stage: IdeaLifecycleStage | string;
  status: string;
  validation_status: string;
  assigned_admin?: string | null;
  current_owner?: string | null;
  priority?: string | null;
  visibility: string;
  is_archived: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  version?: string;
  generated_at?: string;
}

export interface IdeaCreatePayload {
  title: string;
  problem_statement: string;
  proposed_solution: string;
  industry: string;
  target_market: string;
  current_stage?: IdeaLifecycleStage;
}

export interface IdeaUpdatePayload {
  title?: string;
  problem_statement?: string;
  proposed_solution?: string;
  industry?: string;
  target_market?: string;
  current_stage?: IdeaLifecycleStage;
  status?: string;
  validation_status?: string;
}

export interface IdeaFilters {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  stage?: string;
  sort_by?: 'newest' | 'oldest' | 'recently_updated' | 'validation_score';
  include_archived?: boolean;
}

export interface IdeaPaginationResponse {
  items: Idea[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  version: string;
  generated_at: string;
}

export interface IdeaStats {
  total_ideas: number;
  draft_count: number;
  validated_count: number;
  active_sprint_count: number;
  projects_count: number;
  archived_count: number;
  version: string;
  generated_at: string;
}
