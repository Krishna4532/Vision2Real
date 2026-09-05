/**
 * Vision2Real – Scene State Types
 * Sprint 2A: Shared type definitions for scene state.
 * Pure types — no runtime code. Importable from any hook or component.
 */

export type ScenePhase = 'idle' | 'entering' | 'active' | 'transitioning';

export interface SceneState {
  phase: ScenePhase;
  sceneReady: boolean;
  reducedMotion: boolean;
}

export interface SceneActions {
  setPhase: (phase: ScenePhase) => void;
  markReady: () => void;
}

export type SceneStore = SceneState & SceneActions;
