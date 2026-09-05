/**
 * Vision2Real – VisionCore Component
 * Phase 2 Final — Masterpiece Polish: Zone 2 — Energy Presence.
 *
 * Principles:
 *   - Understated energy presence at [-1.8, 0.1, -3.5]
 *   - Titanium crystallized planes (opacity 0.09)
 *   - Whisper-quiet point light (intensity 0.08)
 *   - Discovered rather than stared at
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';
import { MATERIAL_PRESETS } from './Materials';

const PLANE_ROTATIONS: [number, number, number][] = [
  [Math.PI / 2, 0, 0],
  [Math.PI / 4, Math.PI / 3, 0],
  [Math.PI / 6, -Math.PI / 5, Math.PI / 4],
];

export function VisionCore() {
  const groupRef  = useRef<THREE.Group>(null!);
  const hazeRef   = useRef<THREE.Mesh>(null!);
  const ringRef   = useRef<THREE.Mesh>(null!);
  const planeRefs = useRef<THREE.Mesh[]>([]);

  const { reducedMotion } = useSceneStore();

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const elapsed = clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = 0.1 + Math.sin(elapsed * 0.35) * 0.06;
    }

    if (planeRefs.current[0]) {
      planeRefs.current[0].rotation.z = elapsed * 0.02;
      planeRefs.current[0].rotation.y = elapsed * 0.035;
    }
    if (planeRefs.current[1]) {
      planeRefs.current[1].rotation.x = Math.PI / 4 + elapsed * 0.03;
      planeRefs.current[1].rotation.z = elapsed * 0.018;
    }
    if (planeRefs.current[2]) {
      planeRefs.current[2].rotation.y = -elapsed * 0.025;
      planeRefs.current[2].rotation.x = Math.PI / 6 + Math.sin(elapsed * 0.25) * 0.06;
    }

    if (hazeRef.current) {
      const breathe = 1 + Math.sin(elapsed * 0.45) * 0.03;
      hazeRef.current.scale.setScalar(breathe);
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = elapsed * 0.018;
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.14) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={[-1.8, 0.1, -3.5]}>

      {/* Three intersecting titanium planes */}
      {PLANE_ROTATIONS.map((rot, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) planeRefs.current[i] = el; }}
          rotation={rot}
        >
          <planeGeometry args={[0.80, 0.80]} />
          <meshStandardMaterial
            {...MATERIAL_PRESETS.titanium}
            transparent
            opacity={0.09}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Vision Haze */}
      <mesh ref={hazeRef}>
        <sphereGeometry args={[0.60, 12, 12]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.visionHaze}
          depthWrite={false}
        />
      </mesh>

      {/* Single orbital ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.95, 0.005, 8, 48]} />
        <meshStandardMaterial
          {...MATERIAL_PRESETS.accentGlow}
          transparent
          opacity={0.16}
        />
      </mesh>

      {/* Whisper point light */}
      <pointLight
        color="#6D5DF6"
        intensity={0.08}
        distance={3.5}
        decay={2}
      />
    </group>
  );
}
