/**
 * Vision2Real – Validation Types
 * Type definitions for guest/authenticated validation session, stages,
 * live backend messages, preview report data, and evidence-based recommendations.
 */

export type ValidationStageCode = '01' | '02' | '03' | '04' | '05' | '06' | '07' | 'final';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ValidationStage {
  code: ValidationStageCode;
  name: string;
  description: string;
  status: StageStatus;
  progress?: number;
  liveMessage?: string;
  parallelGroup?: 'research' | 'none';
}

export interface UploadedFileContext {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  rawFile?: File;
}

export interface ReportExportMetadata {
  supportsPdf: boolean;
  supportsInteractive: boolean;
  supportsSharing: boolean;
  requiresAuthentication: boolean;
}

export interface ValidationReportPreviewData {
  id: string;
  generatedAt: string;
  // Executive Summary
  overallVerdict: string;
  aiSummary: string;
  biggestOpportunity: string;
  biggestRisk: string;
  confidence: 'High Confidence' | 'Moderate Confidence' | 'Exploratory';
  recommendedNextStep: string;
  
  // Backward compatibility fields
  currentAssessment: string;
  marketPotential: string;
  competition: string;
  keyStrength: string;
  
  // Detailed Multi-Specialist Sections
  detailedReport: {
    ideaStructuring: string;
    marketResearch: string;
    competitionAnalysis: string;
    customerAnalysis: string;
    productFeasibility: string;
    redAgentAnalysis: string;
    validationStrategy: string;
  };

  exportMetadata: ReportExportMetadata;
}

export interface FullValidationReport extends ValidationReportPreviewData {
  fullSections: {
    problemDeepDive: string;
    targetPersonaBreakdown: string;
    financialFeasibility: string;
    strategicMoatAnalysis: string;
  };
  pdfDownloadUrl?: string;
  shareableUrl?: string;
}

export type RecommendedModule = 'Market Analysis' | 'Sprint Reality' | 'Build Product' | 'Red Agent';

export interface ModuleRecommendation {
  id: string;
  recommendedModule: RecommendedModule;
  title: string;
  rank?: number;
  evidence: string;
  reasoning: string;
  badgeText: string;
  isPrimary?: boolean;
}

export type ValidationSessionStatus =
  | 'idle'
  | 'preparing'
  | 'validating'
  | 'report_generating'
  | 'completed'
  | 'taking_longer'
  | 'failed';

export interface ValidationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ValidationSessionStatus;
  ideaText: string;
  uploadedFiles: UploadedFileContext[];
  stages: ValidationStage[];
  reportPreview: ValidationReportPreviewData | null;
  recommendations: ModuleRecommendation[];
  isTakingLonger: boolean;
  userId?: string;
}

export interface ValidationSessionSummary {
  id: string;
  createdAt: string;
  ideaSnippet: string;
  confidence: string;
  topRecommendation: RecommendedModule;
}
