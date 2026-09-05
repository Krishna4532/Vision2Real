/**
 * Vision2Real – TransformationBridge Component
 * Phase 2 Final — Masterpiece Polish: Zone 3 — Monumental Canyon & Layered Corridor.
 *
 * Priorities:
 *   - Priority 1 (Monumental Scale): Inner canyon walls height 65 units, outer walls 85 units.
 *     Structures continue outside viewport boundaries.
 *   - Priority 5 & 6 (Materials & Atmosphere): Dark Glass, Obsidian, Matte Carbon.
 *   - Priority 4 (Lighting): Restrained purple light trace reveals (opacity 0.16).
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';
import { MATERIAL_PRESETS } from './Materials';

const MONUMENTAL_RIBS: { z: number; opacity: number; heightLeft: number; heightRight: number }[] = [
  { z: -4.5,  opacity: 0.35, heightLeft: 28.0, heightRight: 20.0 },
  { z: -11.0, opacity: 0.25, heightLeft: 32.0, heightRight: 24.0 },
  { z: -20.0, opacity: 0.15, heightLeft: 38.0, heightRight: 28.0 },
  { z: -32.0, opacity: 0.08, heightLeft: 42.0, heightRight: 32.0 },
  { z: -45.0, opacity: 0.03, heightLeft: 48.0, heightRight: 36.0 },
];

const LIGHT_TRACES: { x: number; z: number; len: number; opacity: number }[] = [
  { x: -4.2, z: -7,  len: 14, opacity: 0.22 },
  { x:  4.6, z: -8,  len: 11, opacity: 0.16 },
  { x: -3.4, z: -22, len: 20, opacity: 0.14 },
  { x:  3.8, z: -24, len: 16, opacity: 0.10 },
  { x: -2.2, z: -36, len: 18, opacity: 0.06 },
];

export function TransformationBridge() {
  const groupRef = useRef<THREE.Group>(null!);
  const { reducedMotion } = useSceneStore();

  const walls = useMemo(() => [
    { side: -1, width: 5.5, xPos: -8.8, opacity: 0.28, rotY: -0.08 }, // Left inner canyon wall
    { side:  1, width: 4.8, xPos:  9.5, opacity: 0.18, rotY:  0.06 }, // Right inner canyon wall
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    const elapsed = clock.getElapsedTime();
    groupRef.current.position.y = -2.0 + Math.sin(elapsed * 0.20) * 0.03;
  });

  return (
    <group ref={groupRef} position={[0, -2.0, -2]}>

      {/* ── Inner Canyon Glass Walls (Height 65 Units) ────────────────── */}
      {walls.map(({ side, width, xPos, opacity, rotY }) => (
        <mesh
          key={side}
          position={[xPos, 10.0, -20]}
          rotation={[0, rotY, 0]}
        >
          <planeGeometry args={[width, 65, 1, 1]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.darkGlass}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ── Outer Massive Obsidian Planes (Height 85 Units) ───────────── */}
      {/* Continues far outside visible screen bounds for monumental scale */}
      <mesh position={[-16.5, 14.0, -22]} rotation={[0, -0.15, 0]}>
        <planeGeometry args={[10.0, 85]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.obsidian}
          transparent
          opacity={0.60}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[17.5, 12.0, -25]} rotation={[0, 0.11, 0]}>
        <planeGeometry args={[8.0, 75]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.matteCarbon}
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Overhead Structural Ceiling Plane ────────────────────────── */}
      <mesh position={[-0.5, 14.0, -25]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[45, 65]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.obsidian}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* ── Monumental Non-Uniform Ribs (Heights up to 48 Units) ────── */}
      {MONUMENTAL_RIBS.map((rib, i) => (
        <group key={i} position={[0, 0, rib.z]}>
          {/* Left Rib */}
          <mesh position={[-5.8, rib.heightLeft / 2 - 1, 0]}>
            <boxGeometry args={[0.18, rib.heightLeft, 0.18]} />
            <meshStandardMaterial
              {...MATERIAL_PRESETS.titanium}
              transparent
              opacity={rib.opacity}
            />
          </mesh>
          {/* Right Rib */}
          <mesh position={[6.2, rib.heightRight / 2 - 1, 0]}>
            <boxGeometry args={[0.12, rib.heightRight, 0.12]} />
            <meshStandardMaterial
              {...MATERIAL_PRESETS.titanium}
              transparent
              opacity={rib.opacity * 0.70}
            />
          </mesh>
        </group>
      ))}

      {/* ── Whisper-Quiet Light Traces Bleeding Through Joints ────────── */}
      {LIGHT_TRACES.map((trace, i) => (
        <mesh key={i} position={[trace.x, 0.6, trace.z]}>
          <planeGeometry args={[0.02, trace.len]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.accentGlow}
            transparent
            opacity={trace.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

    </group>
  );
}
