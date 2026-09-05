/**
 * Vision2Real – useDashboard Hook (Stage 6.6 Performance Optimized)
 * Parallel API fetching with stale-while-revalidate memory caching, independent widget loading,
 * and AbortController cancellation for instant dashboard responsiveness.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardService, deriveJourneySteps } from '@/services/dashboard/dashboardService';
import type {
  DashboardOverview,
  DashboardQuickStats,
  DerivedJourneyStep,
} from '@/services/dashboard/types';

export interface UseDashboardReturn {
  overview: DashboardOverview | null;
  stats: DashboardQuickStats | null;
  journey: DerivedJourneyStep[];
  isLoading: boolean;
  isOverviewLoading: boolean;
  isStatsLoading: boolean;
  overviewError: string | null;
  statsError: string | null;
  lastRefreshedAt: Date | null;
  refresh: () => void;
}

const DASHBOARD_CACHE_KEY = 'v2r_dashboard_cache';

export function useDashboard(): UseDashboardReturn {
  // Initialize state from stale-while-revalidate cache if available
  const cachedData = useRef<{
    overview?: DashboardOverview;
    stats?: DashboardQuickStats;
    journey?: DerivedJourneyStep[];
  } | null>(null);

  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (raw) cachedData.current = JSON.parse(raw);
  } catch {
    // silent
  }

  const [overview, setOverview] = useState<DashboardOverview | null>(cachedData.current?.overview || null);
  const [stats, setStats] = useState<DashboardQuickStats | null>(cachedData.current?.stats || null);
  const [journey, setJourney] = useState<DerivedJourneyStep[]>(cachedData.current?.journey || []);
  const [isOverviewLoading, setIsOverviewLoading] = useState(!cachedData.current?.overview);
  const [isStatsLoading, setIsStatsLoading] = useState(!cachedData.current?.stats);
  const [isLoading, setIsLoading] = useState(!cachedData.current?.overview && !cachedData.current?.stats);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (isFetchingRef.current && !silent) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    isFetchingRef.current = true;

    if (!silent && !cachedData.current) {
      setIsLoading(true);
      setIsOverviewLoading(true);
      setIsStatsLoading(true);
    }
    setOverviewError(null);
    setStatsError(null);

    try {
      // Parallel loading — overview and stats load concurrently
      const [overviewResult, statsResult] = await Promise.allSettled([
        dashboardService.getDashboardOverview(controller.signal),
        dashboardService.getDashboardStats(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      let freshOverview: DashboardOverview | null = null;
      let freshStats: DashboardQuickStats | null = null;
      let freshJourney: DerivedJourneyStep[] = [];

      if (overviewResult.status === 'fulfilled') {
        freshOverview = overviewResult.value;
        setOverview(freshOverview);
        setIsOverviewLoading(false);
      } else {
        setOverviewError('Failed to load overview data.');
      }

      if (statsResult.status === 'fulfilled') {
        const rawStats = statsResult.value;
        if (freshOverview) {
          const completed = freshOverview.allValidations.filter((v) => v.status === 'COMPLETED').length;
          const processing = freshOverview.allValidations.filter((v) => v.status === 'PROCESSING').length;
          freshStats = {
            ...rawStats,
            validation: {
              ...rawStats.validation,
              completed,
              processing,
            },
          };
        } else {
          freshStats = rawStats;
        }
        setStats(freshStats);
        setIsStatsLoading(false);

        freshJourney = deriveJourneySteps({
          validationsTotal: freshStats.validation.total,
          sprintsTotal: freshStats.sprint.total,
          buildsTotal: freshStats.build.total,
        });
        setJourney(freshJourney);
      } else if (freshOverview) {
        freshJourney = deriveJourneySteps({
          validationsTotal: freshOverview.allValidations.length,
          sprintsTotal: freshOverview.allSprints.length,
          buildsTotal: freshOverview.allBuildRequests.length,
        });
        setJourney(freshJourney);
      }

      // Update Stale-While-Revalidate Session Cache
      if (freshOverview || freshStats) {
        try {
          sessionStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({
              overview: freshOverview || overview,
              stats: freshStats || stats,
              journey: freshJourney.length > 0 ? freshJourney : journey,
            })
          );
        } catch {
          // silent
        }
      }

      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setOverviewError(err?.message || 'Dashboard fetch failed.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsOverviewLoading(false);
        setIsStatsLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [overview, stats, journey]);

  useEffect(() => {
    fetchAll(false);

    const handleFocus = () => fetchAll(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchAll(true);
    };

    const handleCacheInvalidation = () => {
      sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
      fetchAll(true);
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'v2r_reality_sprints_last_updated' ||
        e.key === 'v2r_build_requests_last_updated' ||
        e.key === 'v2r_validations_last_updated'
      ) {
        sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        fetchAll(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('v2r_cache_invalidation', handleCacheInvalidation);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('v2r_cache_invalidation', handleCacheInvalidation);
      window.removeEventListener('storage', handleStorage);
      abortRef.current?.abort();
    };
  }, [fetchAll]);

  const refresh = useCallback(() => {
    fetchAll(false);
  }, [fetchAll]);

  return {
    overview,
    stats,
    journey,
    isLoading,
    isOverviewLoading,
    isStatsLoading,
    overviewError,
    statsError,
    lastRefreshedAt,
    refresh,
  };
}
