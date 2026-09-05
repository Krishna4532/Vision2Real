/**
 * Vision2Real – useAdaptiveRendering Hook
 * Sprint 2A: Evaluates device tier and exposes rendering quality settings.
 *
 * Consumed by Scene.tsx to configure DPR, shadows, and particle counts.
 * Does NOT implement any visual effects — infrastructure only.
 */

import { useMemo } from 'react';
import {
  detectPerformanceTier,
  DPR_CAPS,
  SHADOW_MAP_SIZES,
  PARTICLE_COUNTS,
  type PerformanceTier,
} from '../utils/performance';

export interface AdaptiveRenderingConfig {
  tier: PerformanceTier;
  dpr: [number, number];
  shadowMapSize: number;
  maxParticles: number;
  enablePostProcessing: boolean;
  enableShadows: boolean;
}

/**
 * Detects the device performance tier once and returns stable rendering config.
 * Result is memoized for the component lifetime — no re-detection on re-render.
 */
export function useAdaptiveRendering(): AdaptiveRenderingConfig {
  return useMemo<AdaptiveRenderingConfig>(() => {
    const tier = detectPerformanceTier();
    return {
      tier,
      dpr: DPR_CAPS[tier],
      shadowMapSize: SHADOW_MAP_SIZES[tier],
      maxParticles: PARTICLE_COUNTS[tier],
      enablePostProcessing: tier === 'high',
      enableShadows: tier !== 'low',
    };
  }, []);
}
