/**
 * Vision2Real – HeroScene Module Barrel Export
 * Phase 2 Final / Pass 1: Public API for the HeroScene module directory.
 */

export { Scene } from './Scene';
export { Camera } from './Camera';
export { Lighting } from './Lighting';
export { Environment } from './Environment';
export { Particles } from './Particles';
export { ArchitecturalFrame } from './ArchitecturalFrame';
export { VisionCore } from './VisionCore';
export { TransformationBridge } from './TransformationBridge';
export { RealityHorizon } from './RealityHorizon';
export { FloatingGeometry } from './FloatingGeometry';
export { MATERIAL_PRESETS } from './Materials';
export type { MaterialPreset, MaterialPresetName } from './Materials';

// Scene state — Provider, Context, and hook
export { SceneProvider } from './hooks/SceneProvider';
export { SceneContext } from './hooks/SceneContext';
export type { ScenePhase, SceneStore } from './hooks/sceneTypes';
export { useSceneStore } from './hooks/useSceneStore';

// Adaptive rendering
export { useAdaptiveRendering } from './hooks/useAdaptiveRendering';
export type { AdaptiveRenderingConfig } from './hooks/useAdaptiveRendering';
