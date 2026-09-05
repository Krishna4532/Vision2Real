import { apiClient } from '@/services/api/client';
import { API_BASE_URL, API_PREFIX } from '@/services/api/config';
import type {
  ValidationCreateRequest,
  ValidationHealthResponse,
  ValidationListParams,
  ValidationListResponse,
  ValidationProgress,
  ValidationResponse,
  ValidationStatusResponse,
} from './types';

class ValidationService {
  /**
   * Submit a validation request with optional file attachments.
   * Uses multipart/form-data so axios handles the Content-Type boundary automatically.
   */
  async submitValidation(
    data: ValidationCreateRequest,
    files: File[]
  ): Promise<ValidationResponse> {
    const formData = new FormData();
    formData.append('request_data', JSON.stringify(data));
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<ValidationResponse>(`${API_PREFIX}/validations`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getValidation(validationId: string, guestSessionId?: string): Promise<ValidationResponse> {
    const params: Record<string, string> = {};
    if (guestSessionId) params['guest_session_id'] = guestSessionId;

    const response = await apiClient.get<ValidationResponse>(
      `${API_PREFIX}/validations/${validationId}`,
      { params }
    );
    return response.data;
  }

  async getStatus(validationId: string, guestSessionId?: string): Promise<ValidationStatusResponse> {
    const params: Record<string, string> = {};
    if (guestSessionId) params['guest_session_id'] = guestSessionId;

    const response = await apiClient.get<ValidationStatusResponse>(
      `${API_PREFIX}/validations/status/${validationId}`,
      { params }
    );
    return response.data;
  }

  async checkHealth(): Promise<ValidationHealthResponse> {
    const response = await apiClient.get<ValidationHealthResponse>(
      `${API_PREFIX}/validations/health`
    );
    return response.data;
  }

  /**
   * List the authenticated founder's validations with pagination, search, and sorting.
   * Calls GET /api/v1/validations — enforces founder ownership server-side.
   */
  async listValidations(
    params: ValidationListParams = {},
    options?: { signal?: AbortSignal }
  ): Promise<ValidationListResponse> {
    const response = await apiClient.get<ValidationListResponse>(
      `${API_PREFIX}/validations`,
      { params, signal: options?.signal }
    );
    return response.data;
  }

  /**
   * Subscribe to real-time validation progress via SSE.
   * Returns cleanup function to close the EventSource.
   */
  subscribeProgressStream(
    validationId: string,
    onProgress: (event: ValidationProgress) => void,
    onDone: () => void,
    onError?: (error: Event) => void
  ): () => void {
    const url = `${API_BASE_URL}${API_PREFIX}/validations/stream/${validationId}`;
    const es = new EventSource(url);

    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data: ValidationProgress = JSON.parse(e.data);
        onProgress(data);
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener('done', () => {
      es.close();
      onDone();
    });

    es.addEventListener('ping', () => {
      // heartbeat — keep-alive, no action needed
    });

    es.onerror = (e) => {
      onError?.(e);
      es.close();
    };

    return () => es.close();
  }

  /**
   * Get the PDF download URL for a completed validation.
   */
  getPDFDownloadUrl(validationId: string): string {
    return `${API_BASE_URL}${API_PREFIX}/validations/${validationId}/pdf`;
  }
}

export const validationService = new ValidationService();
