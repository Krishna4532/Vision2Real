/**
 * Vision2Real – useSceneStore Hook
 * Sprint 2A: Accessor hook for shared scene state.
 *
 * Must be used inside a component wrapped by <SceneProvider>.
 * Separated to satisfy React fast-refresh rules.
 */

import { useContext } from 'react';
import { SceneContext } from './SceneContext';
import type { SceneStore } from './sceneTypes';

export function useSceneStore(): SceneStore {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error('useSceneStore must be used inside <SceneProvider>');
  }
  return ctx;
}
