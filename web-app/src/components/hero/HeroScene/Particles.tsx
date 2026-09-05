/**
 * Vision2Real – Particles Component
 * Sprint 2B Final: Atmospheric dust with subtle color tinting.
 *
 * Key fixes from Sprint 2B:
 *   1. Near-field particles had rotation (spun as a group) — changed to
 *      Y oscillation only (floating dust, not a spinning nebula)
 *   2. Particle colors were brightness-scaled white only — no atmosphere.
 *      Now: near = faint violet (Vision Purple wavelength),
 *           far  = cool ice-blue (spatial atmospheric depth)
 *   3. Reduced opacities: particles should almost disappear unless
 *      carefully observed. They support depth, never lead the eye.
 *
 * Two-layer system:
 *   Near field: larger, violet-tinted — creates immediate depth and warmth
 *   Far field:  tiny, ice-blue — creates atmospheric scale and coolness
 *
 * GPU efficient — single Points per layer, BufferGeometry.
 * All random data generated at module load time (outside component).
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';

// ─── Static Particle Data ─────────────────────────────────────────────────

const MAX_NEAR_PARTICLES = 600;
const MAX_FAR_PARTICLES  = 1800;

function generateParticleBuffer(
  count: number,
  rangeX: number,
  rangeY: number,
  rangeZ: number,
  zOffset: number,
): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * rangeX;
    positions[i * 3 + 1] = (Math.random() - 0.5) * rangeY;
    positions[i * 3 + 2] = (Math.random() - 0.5) * rangeZ + zOffset;
  }
  return positions;
}

function generateOpacityBuffer(count: number): Float32Array {
  const opacities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    opacities[i] = Math.random() * 0.5 + 0.1; // 0.1–0.6 range
  }
  return opacities;
}

const NEAR_POSITIONS = generateParticleBuffer(MAX_NEAR_PARTICLES, 14, 8, 8, 0);
const FAR_POSITIONS  = generateParticleBuffer(MAX_FAR_PARTICLES, 30, 20, 40, -15);
const NEAR_OPACITIES = generateOpacityBuffer(MAX_NEAR_PARTICLES);
const FAR_OPACITIES  = generateOpacityBuffer(MAX_FAR_PARTICLES);

// ─── Color Tints ──────────────────────────────────────────────────────────
// Near field: very faint Vision Purple — warms the immediate space
const NEAR_TINT = { r: 0.42, g: 0.38, b: 0.96 };
// Far field: cool ice-blue — creates atmospheric depth and coolness
const FAR_TINT  = { r: 0.78, g: 0.82, b: 1.00 };

// ─── Component ────────────────────────────────────────────────────────────

interface ParticlesProps {
  count?: number;
}

interface ParticleLayerProps {
  positions: Float32Array;
  opacities: Float32Array;
  tint: { r: number; g: number; b: number };
  size: number;
  baseOpacity: number;
  driftSpeed: number;
  /** 'float': Y oscillation (dust). 'rotate': X rotation (old behavior, avoid). */
  driftMode: 'float' | 'rotate';
  enabled: boolean;
}

function ParticleLayer({
  positions,
  opacities,
  tint,
  size,
  baseOpacity,
  driftSpeed,
  driftMode,
  enabled,
}: ParticleLayerProps) {
  const ref = useRef<THREE.Points>(null!);

  useFrame(({ clock }) => {
    if (!ref.current || !enabled) return;
    const elapsed = clock.getElapsedTime();

    if (driftMode === 'float') {
      // Y oscillation — feels like floating dust, not a spinning nebula
      ref.current.position.y = Math.sin(elapsed * driftSpeed) * 0.12;
    } else {
      // Far field: very slow global drift rotation on X — barely perceptible
      ref.current.rotation.x = Math.sin(elapsed * driftSpeed) * 0.025;
    }
  });

  // Tinted vertex colors: per-particle opacity × tint channels
  const colors = useMemo(() => {
    const c = new Float32Array(opacities.length * 3);
    for (let i = 0; i < opacities.length; i++) {
      const brightness = opacities[i] * baseOpacity;
      c[i * 3 + 0] = tint.r * brightness;
      c[i * 3 + 1] = tint.g * brightness;
      c[i * 3 + 2] = tint.b * brightness;
    }
    return c;
  }, [opacities, tint, baseOpacity]);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={baseOpacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function Particles({ count = 800 }: ParticlesProps) {
  const { reducedMotion } = useSceneStore();

  const nearCount = Math.min(Math.floor(count * 0.25), MAX_NEAR_PARTICLES);
  const farCount  = Math.min(Math.floor(count * 0.75), MAX_FAR_PARTICLES);

  const nearPositions = NEAR_POSITIONS.slice(0, nearCount * 3);
  const farPositions  = FAR_POSITIONS.slice(0, farCount * 3);
  const nearOps       = NEAR_OPACITIES.slice(0, nearCount);
  const farOps        = FAR_OPACITIES.slice(0, farCount);

  return (
    <>
      {/* Near field — violet-tinted, creates immediate depth and warmth */}
      <ParticleLayer
        positions={nearPositions}
        opacities={nearOps}
        tint={NEAR_TINT}
        size={0.032}
        baseOpacity={0.22}
        driftSpeed={0.06}
        driftMode="float"
        enabled={!reducedMotion}
      />
      {/* Far field — ice-blue, creates atmospheric scale and spatial depth */}
      <ParticleLayer
        positions={farPositions}
        opacities={farOps}
        tint={FAR_TINT}
        size={0.016}
        baseOpacity={0.10}
        driftSpeed={0.04}
        driftMode="rotate"
        enabled={!reducedMotion}
      />
    </>
  );
}
