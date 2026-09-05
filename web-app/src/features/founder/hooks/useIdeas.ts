import { useState, useCallback, useEffect, useRef } from 'react';
import { ideaService } from '@/services/ideas/ideaService';
import type {
  Idea,
  IdeaCreatePayload,
  IdeaFilters,
  IdeaStats,
  IdeaUpdatePayload,
} from '@/services/ideas/types';
import { toast } from 'sonner';

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [stats, setStats] = useState<IdeaStats | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<IdeaFilters>({
    page: 1,
    limit: 10,
    search: '',
    industry: '',
    stage: '',
    sort_by: 'newest',
    include_archived: false,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIdeas = useCallback(async (currentFilters: IdeaFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const [ideasData, statsData] = await Promise.all([
        ideaService.fetchIdeas(currentFilters),
        ideaService.fetchIdeaStats(),
      ]);

      setIdeas(ideasData.items);
      setStats(statsData);
      setPagination({
        total: ideasData.total,
        page: ideasData.page,
        limit: ideasData.limit,
        totalPages: ideasData.total_pages,
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to load portfolio ideas.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchIdeaDetail = useCallback(async (idOrSlug: string) => {
    setIsDetailLoading(true);
    setError(null);
    try {
      const idea = await ideaService.fetchIdeaByIdOrSlug(idOrSlug);
      setSelectedIdea(idea);
      return idea;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to load idea details.';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  // Effect to refetch when filters change
  useEffect(() => {
    fetchIdeas(filters);
  }, [filters, fetchIdeas]);

  const updateSearchFilter = useCallback((searchTerm: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
    }, 350);
  }, []);

  const updateFilter = useCallback((key: keyof IdeaFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      industry: '',
      stage: '',
      sort_by: 'newest',
      include_archived: false,
    });
  }, []);

  // Action methods (no optimistic updates: state updates strictly after backend HTTP 200/201 response)
  const createIdea = useCallback(
    async (payload: IdeaCreatePayload): Promise<Idea | null> => {
      try {
        const created = await ideaService.createIdea(payload);
        toast.success(`Created idea "${created.title}"`);
        await fetchIdeas(filters);
        return created;
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to create startup idea.';
        toast.error(msg);
        return null;
      }
    },
    [fetchIdeas, filters]
  );

  const updateIdea = useCallback(
    async (id: string, payload: IdeaUpdatePayload): Promise<Idea | null> => {
      try {
        const updated = await ideaService.updateIdea(id, payload);
        toast.success(`Updated idea "${updated.title}"`);
        await fetchIdeas(filters);
        if (selectedIdea && selectedIdea.id === id) {
          setSelectedIdea(updated);
        }
        return updated;
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to update idea.';
        toast.error(msg);
        return null;
      }
    },
    [fetchIdeas, filters, selectedIdea]
  );

  const archiveIdea = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await ideaService.archiveIdea(id);
        toast.success('Archived startup idea.');
        await fetchIdeas(filters);
        return true;
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to archive idea.';
        toast.error(msg);
        return false;
      }
    },
    [fetchIdeas, filters]
  );

  const restoreIdea = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await ideaService.restoreIdea(id);
        toast.success('Restored startup idea to portfolio.');
        await fetchIdeas(filters);
        return true;
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to restore idea.';
        toast.error(msg);
        return false;
      }
    },
    [fetchIdeas, filters]
  );

  return {
    ideas,
    stats,
    selectedIdea,
    isLoading,
    isDetailLoading,
    error,
    filters,
    pagination,
    updateSearchFilter,
    updateFilter,
    resetFilters,
    fetchIdeas: () => fetchIdeas(filters),
    fetchIdeaDetail,
    createIdea,
    updateIdea,
    archiveIdea,
    restoreIdea,
  };
}
