/**
 * Vision2Real – Camera Component
 * Phase 2 Final — Masterpiece Polish: Human Observation Breathing & Drift.
 *
 * Principles:
 *   - Camera feels like a human quietly observing a monumental world.
 *   - Lower height: position Y = 0.8
 *   - Subtle upward viewing angle: lookAt Y = 1.10
 *   - Ultra-slow breathing and drift (speed = 0.12)
 */

import { useRef, useEffect } from 'react';
import { PerspectiveCamera } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from './hooks/useSceneStore';

const CAMERA_CONFIG = {
  fov: 45,
  near: 0.1,
  far: 240,
  position: [0, 0.8, 7.5] as [number, number, number],
} as const;

/** Cinematic human observation idle — ultra-slow float */
const IDLE_CONFIG = {
  driftX: 0.14,
  driftY: 0.05,
  driftZ: 0.08,
  speed: 0.12,        // Ultra-slow speed
  lerpPos: 0.015,     // Smooth position lerp
  lerpLook: 0.010,    // Gaze lags behind position
  lookDriftX: 0.20,
  lookDriftY: 0.10,
  lookSpeed: 0.07,
} as const;

interface CameraProps {
  position?: [number, number, number];
}

export function Camera({ position = CAMERA_CONFIG.position }: CameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const { size } = useThree();
  const { reducedMotion } = useSceneStore();

  const lookTarget = useRef(new THREE.Vector3(0, 1.10, 0));

  useEffect(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;

    if (size.width < 768) {
      camera.fov = 55;
    } else if (size.width < 1280) {
      camera.fov = 50;
    } else {
      camera.fov = CAMERA_CONFIG.fov;
    }

    camera.updateProjectionMatrix();
  }, [size.width]);

  useFrame(({ clock, camera }) => {
    if (reducedMotion) return;

    const elapsed = clock.getElapsedTime();
    const t = elapsed * IDLE_CONFIG.speed;
    const lt = elapsed * IDLE_CONFIG.lookSpeed;

    // Position drift
    const targetX = position[0] + Math.sin(t * 0.6) * IDLE_CONFIG.driftX;
    const targetY = position[1] + Math.sin(t * 0.4) * IDLE_CONFIG.driftY;
    const targetZ = position[2] + Math.cos(t * 0.3) * IDLE_CONFIG.driftZ;

    camera.position.x += (targetX - camera.position.x) * IDLE_CONFIG.lerpPos;
    camera.position.y += (targetY - camera.position.y) * IDLE_CONFIG.lerpPos;
    camera.position.z += (targetZ - camera.position.z) * IDLE_CONFIG.lerpPos;

    // Look-at target drift (subtle upward angle)
    const desiredLookX = Math.sin(lt * 1.1) * IDLE_CONFIG.lookDriftX;
    const desiredLookY = 1.10 + Math.sin(lt * 0.7) * IDLE_CONFIG.lookDriftY;
    const desiredLookZ = -1.2;

    lookTarget.current.x += (desiredLookX - lookTarget.current.x) * IDLE_CONFIG.lerpLook;
    lookTarget.current.y += (desiredLookY - lookTarget.current.y) * IDLE_CONFIG.lerpLook;
    lookTarget.current.z += (desiredLookZ - lookTarget.current.z) * IDLE_CONFIG.lerpLook;

    camera.lookAt(lookTarget.current);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={CAMERA_CONFIG.fov}
      near={CAMERA_CONFIG.near}
      far={CAMERA_CONFIG.far}
      position={position}
    />
  );
}
