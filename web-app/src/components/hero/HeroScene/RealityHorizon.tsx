/**
 * Vision2Real – RealityHorizon Component
 * Phase 2 Final — Masterpiece Polish: Zone 4 — Distant Horizon & Gateway.
 *
 * Priorities:
 *   - Priority 3 (Horizon): Gateway Arch pillars height 36 units, beam 14.0 units span.
 *     Disappearing structural silhouettes in layered fog.
 *   - Suggests possibility, not spectacle. No glowing portals.
 *   - 300-unit wide horizon monolith and ground plane.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';
import { MATERIAL_PRESETS } from './Materials';

const MONUMENTAL_SLABS: [number, number, number, number][] = [
  [-32, 28, 3.0, 0.22],
  [-16, 36, 4.0, 0.32],
  [ -4, 15, 1.8, 0.18],
  [+12, 42, 5.0, 0.42], // Dominant right-side slab anchor
  [+28, 24, 2.8, 0.25],
  [+42, 18, 2.2, 0.15],
];

export function RealityHorizon() {
  const groupRef = useRef<THREE.Group>(null!);
  const monolithRef = useRef<THREE.Mesh>(null!);
  const { reducedMotion } = useSceneStore();

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    const elapsed = clock.getElapsedTime();

    groupRef.current.position.y = -3.2 + Math.sin(elapsed * 0.10) * 0.04;

    if (monolithRef.current) {
      const mat = monolithRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.60 + Math.sin(elapsed * 0.16) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, -3.2, -45]}>

      {/* ── Wide Horizon Monolith (300 Units Wide) ──────────────────── */}
      <mesh ref={monolithRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[300, 1.8, 6.0]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.obsidian}
          transparent
          opacity={0.60}
        />
      </mesh>

      {/* ── Off-Center Distant Gateway Arch (Pillars Height 36 Units) ── */}
      {/* Positioned at X = +3.0 — Understated distant architectural horizon */}
      <group position={[3.0, 0, -1]}>
        {/* Left Arch Pillar */}
        <mesh position={[-5.5, 18.0, 0]}>
          <boxGeometry args={[1.5, 36, 1.5]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.obsidian}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* Right Arch Pillar */}
        <mesh position={[5.5, 18.0, 0]}>
          <boxGeometry args={[1.5, 36, 1.5]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.matteCarbon}
            transparent
            opacity={0.50}
          />
        </mesh>

        {/* Arch Transverse Beam */}
        <mesh position={[0, 35.5, 0]}>
          <boxGeometry args={[14.0, 1.2, 1.5]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.obsidian}
            transparent
            opacity={0.60}
          />
        </mesh>

        {/* Atmosphere reveal inside gateway (no bright bloom, no glowing portal) */}
        <mesh position={[0, 17.0, -0.3]}>
          <planeGeometry args={[9.5, 32]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.softGlow}
            transparent
            opacity={0.03}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── Disappearing Architectural Silhouettes ─────────────────── */}
      {MONUMENTAL_SLABS.map(([x, height, width, opacity], i) => (
        <mesh key={i} position={[x, height / 2 + 0.5, 0.6]}>
          <boxGeometry args={[width, height, 1.8]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.obsidian}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}

      {/* ── Atmospheric Horizon Ground Plane (300 Units Wide) ────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[300, 100]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.obsidian}
          transparent
          opacity={0.14}
        />
      </mesh>

      {/* ── Deep Indigo Ambient Point Light ─────────────────────────── */}
      <pointLight
        position={[3.0, 8, 10]}
        color="#3D2F8F"
        intensity={0.15}
        distance={60}
        decay={1.6}
      />

    </group>
  );
}
