/**
 * Vision2Real – HeroScene Component (Sprint 2A)
 * Full-screen R3F Canvas mounted as background scene layer.
 *
 * Layer position:
 *   - position: absolute, inset: 0, z-index: 1 (defined in Hero.css)
 *   - pointer-events: none (HeroOverlay remains fully interactive)
 *
 * Sprint 2A provides:
 *   - <Canvas> with adaptive DPR and shadow configuration
 *   - Camera, Lighting, Environment, and Particles infrastructure
 *   - SceneProvider for shared scene state across all child 3D components
 *
 * Sprint 2B will add:
 *   - Vision Core 3D object
 *   - Transformation Bridge
 *   - Reality Horizon ground plane
 *   - GSAP scroll-driven animation timeline
 *   - PostProcessing (Bloom, Vignette) for high-tier devices
 */

import { Canvas } from '@react-three/fiber';
import { SceneProvider } from './HeroScene/hooks/SceneProvider';
import { Scene } from './HeroScene/Scene';
import { detectPerformanceTier, DPR_CAPS } from './HeroScene/utils/performance';

interface HeroSceneProps {
  className?: string;
}

// Detect tier once at module level to avoid re-detection on re-render
const PERFORMANCE_TIER = detectPerformanceTier();
const DPR = DPR_CAPS[PERFORMANCE_TIER];
const ENABLE_SHADOWS = PERFORMANCE_TIER !== 'low';
const ENABLE_ANTIALIAS = PERFORMANCE_TIER !== 'low';

export function HeroScene({ className = '' }: HeroSceneProps) {
  return (
    <div
      className={`v2r-hero-scene ${className}`}
      aria-hidden="true"
    >
      {/*
        SceneProvider supplies shared state (phase, reducedMotion) to all
        child components inside Canvas. R3F v9 propagates React context
        through its internal portal, so this correctly reaches Particles, etc.
      */}
      <SceneProvider>
        <Canvas
          dpr={DPR}
          shadows={ENABLE_SHADOWS}
          gl={{
            antialias: ENABLE_ANTIALIAS,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <Scene />
        </Canvas>
      </SceneProvider>
    </div>
  );
}
