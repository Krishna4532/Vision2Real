/**
 * Vision2Real – Performance Utilities
 * Sprint 2A: Adaptive rendering quality detection.
 *
 * These utilities determine device capability to gracefully downgrade
 * 3D complexity on low-powered devices. They are infrastructure only —
 * no cinematic effects are implemented here.
 */

export type PerformanceTier = 'high' | 'medium' | 'low';

/**
 * Estimate device performance tier based on hardware concurrency
 * and device memory (where available).
 */
export function detectPerformanceTier(): PerformanceTier {
  const cores = navigator.hardwareConcurrency ?? 2;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memoryGB: number = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  if (cores >= 8 && memoryGB >= 8) return 'high';
  if (cores >= 4 && memoryGB >= 4) return 'medium';
  return 'low';
}

/**
 * DPR cap per tier — avoids over-rendering on high-DPI screens on low devices.
 */
export const DPR_CAPS: Record<PerformanceTier, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [1, 1],
};

/**
 * Shadow map resolution per tier.
 */
export const SHADOW_MAP_SIZES: Record<PerformanceTier, number> = {
  high: 2048,
  medium: 1024,
  low: 512,
};

/**
 * Maximum particle count per tier (for future Sprint 2B use).
 */
export const PARTICLE_COUNTS: Record<PerformanceTier, number> = {
  high: 3000,
  medium: 1500,
  low: 600,
};
