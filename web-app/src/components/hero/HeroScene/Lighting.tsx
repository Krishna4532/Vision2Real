/**
 * Vision2Real – Lighting Component
 * Phase 2 Final — Masterpiece Polish: Darkness-Dominant Cinematic Lighting.
 *
 * Principles:
 *   - Darkness dominates. Architecture emerges gently from pitch black shadows.
 *   - Key light intensity: 0.22 (warm-neutral directional shadow accent).
 *   - Purple rim light intensity: 0.28 (whisper-quiet, visible after observation).
 *   - Ambient fill: 0.03 (preserves deep black contrast).
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AdaptiveRenderingConfig } from './hooks/useAdaptiveRendering';
import { useSceneStore } from './hooks/useSceneStore';

interface LightingProps {
  renderConfig: AdaptiveRenderingConfig;
}

export function Lighting({ renderConfig }: LightingProps) {
  const { enableShadows } = renderConfig;
  const rimRef = useRef<THREE.PointLight>(null!);
  const { reducedMotion } = useSceneStore();

  useFrame(({ clock }) => {
    if (!rimRef.current || reducedMotion) return;
    const elapsed = clock.getElapsedTime();
    rimRef.current.intensity = 0.28 + Math.sin(elapsed * 0.30) * 0.08;
  });

  return (
    <>
      {/* 1. Ambient — ultra-low fill preserving pitch-black shadows */}
      <ambientLight intensity={0.03} color="#080810" />

      {/* 2. Key Light — primary directional light (0.22 intensity) */}
      <directionalLight
        position={[6, 12, 6]}
        intensity={0.22}
        color="#DDD5CA"
        castShadow={enableShadows}
        shadow-mapSize-width={renderConfig.shadowMapSize}
        shadow-mapSize-height={renderConfig.shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0002}
      />

      {/* 3. Fill Light — cool tone, very restrained */}
      <directionalLight
        position={[-6, 4, 6]}
        intensity={0.08}
        color="#A8B4C8"
      />

      {/* 4. Rim Light — Vision Purple edge definition (0.28 intensity).
              Visible only after a moment of observation. */}
      <pointLight
        ref={rimRef}
        position={[0, 5, -8]}
        intensity={0.28}
        color="#6D5DF6"
        distance={22}
        decay={2}
      />

      {/* 5. Ground Rim — cool below-left ground plane separation */}
      <pointLight
        position={[-10, -5, 4]}
        intensity={0.16}
        color="#121624"
        distance={25}
        decay={1.8}
      />

      {/* 6. Front Wash — ultra-dim near-dark fill */}
      <directionalLight
        position={[0, 2, 8]}
        intensity={0.04}
        color="#080810"
      />

      {/* 7. Deep Accent — indigo, reaches deep Transformation Bridge zone */}
      <pointLight
        position={[0, 2, -22]}
        intensity={0.10}
        color="#3D2F8F"
        distance={40}
        decay={2}
      />

      {/* Hemisphere sky/ground contrast */}
      <hemisphereLight args={["#05050C", "#030305", 0.06]} />
    </>
  );
}
