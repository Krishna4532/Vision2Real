import { apiClient } from './client';
import { API_PREFIX } from './config';

export interface AnalysisRequest {
  idea: string;
}

export interface AnalysisStatus {
  analysis_id: string;
  status: string;
  current_stage: string;
  details?: Record<string, any>;
}

export interface AnalysisResult {
  id: string;
  status: string;
  // Further typed based on actual backend models when fully documented
  [key: string]: any; 
}

export interface FounderReport {
  id: string;
  summary: string;
  // Further typed based on actual backend models
  [key: string]: any;
}

/**
 * Creates a new analysis job based on an idea
 */
export async function createAnalysis(payload: AnalysisRequest): Promise<AnalysisStatus> {
  const { data } = await apiClient.post<AnalysisStatus>(`${API_PREFIX}/analysis`, payload);
  return data;
}

/**
 * Fetches the status and results of a specific analysis job
 */
export async function getAnalysis(analysisId: string): Promise<AnalysisResult> {
  const { data } = await apiClient.get<AnalysisResult>(`${API_PREFIX}/analysis/${analysisId}`);
  return data;
}

/**
 * Fetches the generated founder report for a specific analysis
 */
export async function getAnalysisReport(analysisId: string): Promise<FounderReport> {
  const { data } = await apiClient.get<FounderReport>(`${API_PREFIX}/analysis/${analysisId}/report`);
  return data;
}
