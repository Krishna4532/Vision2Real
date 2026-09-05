/**
 * Vision2Real – FloatingGeometry Component
 * Phase 2 Final / Pass 1: Independent spatial fragments with Foreground Layer.
 *
 * Refinements:
 *   - Expanded spatial range: X ±30, Z -0.5 to -35
 *   - 2-3 Foreground fragments at Z >= -1.5 with large scale & ultra-low opacity (0.04)
 *   - 14 total fragments with independent drift
 *   - Asymmetrical spatial density (slightly higher on left than right)
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';
import { MATERIAL_PRESETS } from './Materials';

interface FragmentData {
  position: [number, number, number];
  initialRotation: [number, number, number];
  scale: number;
  type: 'ring' | 'plane';
  driftPhase: number;
  driftSpeedY: number;
  driftAmplY: number;
  rotSpeedX: number;
  rotSpeedY: number;
  opacity: number;
}

const FRAGMENT_COUNT = 14;
const FRAGMENTS: FragmentData[] = [];

// Explicitly generate 3 Foreground fragments near camera (z >= -1.5)
FRAGMENTS.push(
  {
    position: [-4.2, 1.8, -0.8],
    initialRotation: [0.4, 0.2, 0.8],
    scale: 0.95,
    type: 'plane',
    driftPhase: 0.2,
    driftSpeedY: 0.05,
    driftAmplY: 0.14,
    rotSpeedX: 0.0004,
    rotSpeedY: 0.0005,
    opacity: 0.04, // Very subtle near camera
  },
  {
    position: [5.1, -1.2, -1.2],
    initialRotation: [0.8, -0.5, 0.3],
    scale: 1.10,
    type: 'ring',
    driftPhase: 1.5,
    driftSpeedY: 0.04,
    driftAmplY: 0.10,
    rotSpeedX: -0.0003,
    rotSpeedY: 0.0004,
    opacity: 0.03,
  },
  {
    position: [-5.8, -2.0, -1.4],
    initialRotation: [-0.3, 0.6, 0.2],
    scale: 0.85,
    type: 'plane',
    driftPhase: 3.1,
    driftSpeedY: 0.06,
    driftAmplY: 0.16,
    rotSpeedX: 0.0005,
    rotSpeedY: -0.0004,
    opacity: 0.04,
  }
);

// Generate remaining 11 mid-to-far fragments with asymmetrical distribution
for (let i = 3; i < FRAGMENT_COUNT; i++) {
  // Asymmetrical X biased slightly left
  const x = (Math.random() - 0.55) * 32;
  const y = (Math.random() - 0.5) * 11 + 1.0;
  const z = -(Math.random() * 32) - 2.5;

  FRAGMENTS.push({
    position: [x, y, z],
    initialRotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    ],
    scale: Math.random() * 0.6 + 0.3,
    type: Math.random() > 0.5 ? 'ring' : 'plane',
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeedY: 0.03 + Math.random() * 0.05,
    driftAmplY: 0.08 + Math.random() * 0.12,
    rotSpeedX: (Math.random() - 0.5) * 0.0006,
    rotSpeedY: (Math.random() - 0.5) * 0.0008,
    opacity: Math.random() * 0.04 + 0.04,
  });
}

export function FloatingGeometry() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({ length: FRAGMENT_COUNT }, () => null)
  );
  const baseYs = useRef<number[]>(FRAGMENTS.map(f => f.position[1]));

  const { reducedMotion } = useSceneStore();

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const elapsed = clock.getElapsedTime();

    FRAGMENTS.forEach((frag, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      mesh.position.y =
        baseYs.current[i] +
        Math.sin(elapsed * frag.driftSpeedY + frag.driftPhase) * frag.driftAmplY;

      mesh.rotation.x += frag.rotSpeedX;
      mesh.rotation.y += frag.rotSpeedY;
    });
  });

  return (
    <>
      {FRAGMENTS.map((frag, idx) =>
        frag.type === 'ring' ? (
          <mesh
            key={idx}
            ref={(el) => { meshRefs.current[idx] = el; }}
            position={frag.position}
            rotation={frag.initialRotation}
            scale={frag.scale}
          >
            <torusGeometry args={[1, 0.02, 10, 40]} />
            <meshStandardMaterial
              {...MATERIAL_PRESETS.ghost}
              transparent
              opacity={frag.opacity}
            />
          </mesh>
        ) : (
          <mesh
            key={idx}
            ref={(el) => { meshRefs.current[idx] = el; }}
            position={frag.position}
            rotation={frag.initialRotation}
            scale={frag.scale}
          >
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
              {...MATERIAL_PRESETS.titanium}
              transparent
              opacity={frag.opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        ),
      )}
    </>
  );
}
