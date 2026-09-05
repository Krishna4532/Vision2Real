/**
 * Vision2Real – Build My Product & Reality Sprint Types
 * Type definitions for independent build request data, sprint data, contact info, and status.
 */

import type { UploadedFileContext } from './validation';

export type BuildStageOption =
  | 'Idea'
  | 'Validated Idea'
  | 'Prototype'
  | 'MVP'
  | 'Existing Product'
  | 'Redesign'
  | 'Scaling';

export type PreferredContactMethod = 'WhatsApp' | 'Phone Call' | 'Email';

export type BuildJourneyPath = 'build_product' | 'reality_sprint' | null;

export interface ProjectContextData {
  currentStage: BuildStageOption;
  estimatedBudget: string; // Free-text input e.g. "Example: ₹50,000, Around $2,000, Under ₹1 Lakh, Not sure yet..."
  additionalContext: string;
}

export interface ContactInfoData {
  name: string;
  email: string;
  preferredContactMethod: PreferredContactMethod;
  phone: string;
}

export type BuildRequestStatus = 'draft' | 'reviewing_summary' | 'submitted';

export type SubmissionType = 'REALITY_SPRINT' | 'BUILD_REQUEST';

export interface BuildRequestData {
  id: string;
  createdAt: string;
  journeyPath: BuildJourneyPath;
  submissionType?: SubmissionType;
  productDescription: string; // For Build My Product
  sprintDescription?: string; // For Reality Sprint
  uploadedFiles: UploadedFileContext[];
  projectContext: ProjectContextData;
  contactInfo: ContactInfoData;
  status: BuildRequestStatus;
  userId?: string;
}
