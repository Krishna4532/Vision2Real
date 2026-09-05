/**
 * Vision2Real – Scene Component
 * Phase 2 Final / Pass 1: Complete 5-Layer Cinematic Hero World Composition.
 *
 * Layers:
 *   1. ArchitecturalFrame (Foreground columns & frame at Z ~ -0.5)
 *   2. VisionCore (Zone 1 — Origin of energy, off-center left at Z ~ -3.5)
 *   3. TransformationBridge (Zone 2 — Non-uniform canyon corridor, Z ~ -4 to -42)
 *   4. RealityHorizon (Zone 3 — Off-center Gateway Arch & horizon monolith, Z ~ -40)
 *   5. Atmosphere, Particles, Lighting, & Environment Fog
 */

import { Suspense } from 'react';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
import { Particles } from './Particles';
import { ArchitecturalFrame } from './ArchitecturalFrame';
import { VisionCore } from './VisionCore';
import { TransformationBridge } from './TransformationBridge';
import { RealityHorizon } from './RealityHorizon';
import { FloatingGeometry } from './FloatingGeometry';
import { useAdaptiveRendering } from './hooks/useAdaptiveRendering';

export function Scene() {
  const renderConfig = useAdaptiveRendering();

  return (
    <>
      {/* Cinematic camera with lower height & subtle upward tilt */}
      <Camera />

      {/* Scene atmosphere — dark background, deep fog */}
      <Environment highFidelity={renderConfig.tier === 'high'} />

      {/* Cinematic darkness-first lighting rig */}
      <Lighting renderConfig={renderConfig} />

      {/* Ambient particle field — violet near, ice-blue far */}
      <Suspense fallback={null}>
        <Particles count={renderConfig.maxParticles} />
      </Suspense>

      {/* ─── Layer 1: Foreground Architectural Frame ───────────────── */}
      <Suspense fallback={null}>
        <ArchitecturalFrame />
      </Suspense>

      {/* ─── Layer 2: Vision Core (Off-Center Presence) ─────────────── */}
      <Suspense fallback={null}>
        <VisionCore />
      </Suspense>

      {/* ─── Layer 3: Transformation Bridge (Corridor & Canyon) ────── */}
      <Suspense fallback={null}>
        <TransformationBridge />
      </Suspense>

      {/* ─── Layer 4: Reality Horizon (Off-Center Gateway Arch) ─────── */}
      <Suspense fallback={null}>
        <RealityHorizon />
      </Suspense>

      {/* ─── Spatial Fragments (Foreground + Depth) ───────────────── */}
      <Suspense fallback={null}>
        <FloatingGeometry />
      </Suspense>
    </>
  );
}
