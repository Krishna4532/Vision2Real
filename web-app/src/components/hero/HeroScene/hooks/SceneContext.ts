/**
 * Vision2Real – Scene Context Constant
 * Sprint 2A: React Context definition.
 *
 * Separated to satisfy React fast-refresh rules.
 */

import { createContext } from 'react';
import type { SceneStore } from './sceneTypes';

export const SceneContext = createContext<SceneStore | null>(null);
