import { apiClient } from '../api/client';
import { API_PREFIX } from '../api/config';
import type {
  Idea,
  IdeaCreatePayload,
  IdeaFilters,
  IdeaPaginationResponse,
  IdeaStats,
  IdeaUpdatePayload,
} from './types';

const IDEAS_ENDPOINT = `${API_PREFIX}/ideas`;

export const ideaService = {
  async fetchIdeas(filters: IdeaFilters = {}): Promise<IdeaPaginationResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.industry) params.industry = filters.industry;
    if (filters.stage) params.stage = filters.stage;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.include_archived !== undefined) params.include_archived = filters.include_archived;

    const response = await apiClient.get<IdeaPaginationResponse>(IDEAS_ENDPOINT, { params });
    return response.data;
  },

  async fetchIdeaStats(): Promise<IdeaStats> {
    const response = await apiClient.get<IdeaStats>(`${IDEAS_ENDPOINT}/stats`);
    return response.data;
  },

  async fetchIdeaByIdOrSlug(idOrSlug: string): Promise<Idea> {
    const response = await apiClient.get<Idea>(`${IDEAS_ENDPOINT}/${idOrSlug}`);
    return response.data;
  },

  async createIdea(payload: IdeaCreatePayload): Promise<Idea> {
    const response = await apiClient.post<Idea>(IDEAS_ENDPOINT, payload);
    return response.data;
  },

  async updateIdea(id: string, payload: IdeaUpdatePayload): Promise<Idea> {
    const response = await apiClient.patch<Idea>(`${IDEAS_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async archiveIdea(id: string): Promise<Idea> {
    const response = await apiClient.post<Idea>(`${IDEAS_ENDPOINT}/${id}/archive`);
    return response.data;
  },

  async restoreIdea(id: string): Promise<Idea> {
    const response = await apiClient.post<Idea>(`${IDEAS_ENDPOINT}/${id}/restore`);
    return response.data;
  },

  async deleteIdea(id: string): Promise<Idea> {
    const response = await apiClient.delete<Idea>(`${IDEAS_ENDPOINT}/${id}`);
    return response.data;
  },
};
