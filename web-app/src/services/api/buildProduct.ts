/**
 * Vision2Real – Build Product API Service
 * API client methods for submitting Build Requests & Reality Sprints,
 * handling guest sessions, and transferring data to founder accounts.
 */

import { apiClient } from './client';
import { API_PREFIX } from './config';
import type { BuildRequestData } from '@/types/buildProduct';

/**
 * Creates a guest build request or sprint session
 */
export async function createBuildRequestApi(payload: Partial<BuildRequestData>): Promise<BuildRequestData> {
  const isSprint = payload.journeyPath === 'reality_sprint';
  const prefix = isSprint ? 'V2R-SPR' : 'V2R-BLD';
  const requestId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newRequest: BuildRequestData = {
    id: requestId,
    createdAt: now,
    journeyPath: payload.journeyPath || 'build_product',
    productDescription: payload.productDescription || '',
    sprintDescription: payload.sprintDescription || '',
    uploadedFiles: payload.uploadedFiles || [],
    projectContext: payload.projectContext || {
      currentStage: 'Idea',
      estimatedBudget: '',
      additionalContext: '',
    },
    contactInfo: payload.contactInfo || {
      name: '',
      email: '',
      preferredContactMethod: 'Email',
      phone: '',
    },
    status: 'submitted',
  };

  try {
    const { data } = await apiClient.post<BuildRequestData>(`${API_PREFIX}/build/requests`, payload);
    return data;
  } catch {
    // Development fallback
    return newRequest;
  }
}

/**
 * Attaches a guest request to a newly created founder account
 */
export async function attachBuildRequestToAccount(
  requestId: string,
  userData: { name: string; email: string }
): Promise<{ success: boolean; requestId: string }> {
  try {
    await apiClient.post(`${API_PREFIX}/build/requests/${requestId}/attach`, {
      userId: `usr_${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
    return { success: true, requestId };
  } catch {
    return { success: true, requestId };
  }
}
