/**
 * Vision2Real – Environment Component
 * Phase 2 Final — Masterpiece Polish: Smooth Atmospheric Falloff & Layered Fog.
 *
 * Atmospheric perspective:
 *   - Background matches CSS #050505
 *   - Fog near=18, far=85 (smooth dissolution into deep black)
 */

interface EnvironmentProps {
  highFidelity?: boolean;
}

export function Environment({ highFidelity: _highFidelity = true }: EnvironmentProps) {
  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 18, 85]} />
    </>
  );
}
