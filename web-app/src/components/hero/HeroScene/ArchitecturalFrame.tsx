/**
 * Vision2Real – ArchitecturalFrame Component
 * Phase 2 Final — Masterpiece Polish: Monumental Partially-Cropped Foreground Monoliths.
 *
 * Priorities:
 *   - Priority 1 (Monumental Scale): Monoliths extended to 52 & 42 units height,
 *     span 32 units. Partially cropped by view frustum (user never sees entire element).
 *   - Priority 2 (Foreground Depth): Soft, dark edge silhouettes at viewport bounds (x=±14).
 *   - Priority 4 & 5 (Lighting & Materials): Deep Obsidian & Matte Carbon, quiet accent glow.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';
import { MATERIAL_PRESETS } from './Materials';

export function ArchitecturalFrame() {
  const leftAccentRef  = useRef<THREE.Mesh>(null!);
  const rightAccentRef = useRef<THREE.Mesh>(null!);
  const { reducedMotion } = useSceneStore();

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const elapsed = clock.getElapsedTime();
    const pulse = 0.08 + Math.sin(elapsed * 0.35) * 0.04; // Whisper quiet pulse

    if (leftAccentRef.current) {
      (leftAccentRef.current.material as THREE.MeshStandardMaterial).opacity = pulse;
    }
    if (rightAccentRef.current) {
      (rightAccentRef.current.material as THREE.MeshStandardMaterial).opacity = pulse * 0.5;
    }
  });

  return (
    <group>

      {/* ── Left Foreground Monolith (Monumental: Height 52 Units, Partially Cropped) */}
      <mesh position={[-8.2, 12.0, -0.5]}>
        <boxGeometry args={[3.2, 52, 2.2]} />
        <meshStandardMaterial {...MATERIAL_PRESETS.obsidian} />
      </mesh>

      {/* Left monolith inner face — Titanium reveal */}
      <mesh position={[-6.55, 12.0, -0.5]}>
        <boxGeometry args={[0.08, 52, 2.2]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.titanium}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Left column subtle Vision Purple edge reveal */}
      <mesh ref={leftAccentRef} position={[-6.48, 6.0, -0.5]}>
        <boxGeometry args={[0.015, 22, 1.2]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.accentGlow}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* ── Right Foreground Monolith (Height 42 Units, Partially Cropped) ─ */}
      <mesh position={[9.0, 8.0, -0.5]}>
        <boxGeometry args={[2.2, 42, 1.6]} />
        <meshStandardMaterial {...MATERIAL_PRESETS.matteCarbon} />
      </mesh>

      {/* Right monolith inner titanium reveal */}
      <mesh position={[7.88, 8.0, -0.5]}>
        <boxGeometry args={[0.05, 42, 1.6]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.titanium}
          transparent
          opacity={0.18}
        />
      </mesh>

      {/* Right column subtle accent strip */}
      <mesh ref={rightAccentRef} position={[7.82, 4.0, -0.5]}>
        <boxGeometry args={[0.01, 16, 1.0]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.accentGlow}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* ── Overhead Transverse Architectural Beam (Span 32 Units) ────── */}
      <mesh position={[-0.5, 12.5, -0.5]}>
        <boxGeometry args={[32.0, 1.2, 2.0]} />
        <meshStandardMaterial {...MATERIAL_PRESETS.obsidian} />
      </mesh>

      <mesh position={[-0.5, 11.88, -0.5]}>
        <boxGeometry args={[32.0, 0.05, 2.0]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.titanium}
          transparent
          opacity={0.18}
        />
      </mesh>

      {/* ── Priority 2: Soft Dark Edge Silhouettes at Far Viewport Bounds ─ */}
      {/* Massive left-side far edge silhouette (partially hidden by fog) */}
      <mesh position={[-14.0, 10.0, -5.5]} rotation={[0, 0.20, 0]}>
        <boxGeometry args={[2.4, 36, 1.0]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.graphite}
          transparent
          opacity={0.60}
        />
      </mesh>

      {/* Righter sparser far edge silhouette */}
      <mesh position={[15.0, 6.0, -7.5]} rotation={[0, -0.15, 0]}>
        <boxGeometry args={[1.2, 26, 0.6]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.matteCarbon}
          transparent
          opacity={0.40}
        />
      </mesh>

    </group>
  );
}
