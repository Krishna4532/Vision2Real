/**
 * Vision2Real – SceneProvider Component
 * Sprint 2A: React context provider for shared scene state.
 *
 * Only exports a single component (SceneProvider) — fast-refresh compliant.
 */

import { useState, useMemo, type ReactNode } from 'react';
import { SceneContext } from './SceneContext';
import type { SceneStore, ScenePhase } from './sceneTypes';

interface SceneProviderProps {
  children: ReactNode;
}

export function SceneProvider({ children }: SceneProviderProps) {
  const [phase, setPhase] = useState<ScenePhase>('idle');
  const [sceneReady, setSceneReady] = useState(false);

  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const store = useMemo<SceneStore>(
    () => ({
      phase,
      sceneReady,
      reducedMotion,
      setPhase,
      markReady: () => setSceneReady(true),
    }),
    [phase, sceneReady, reducedMotion]
  );

  return <SceneContext.Provider value={store}>{children}</SceneContext.Provider>;
}
