/**
 * Vision2Real – Material Presets
 * Phase 2 Final — Masterpiece Polish: Elevated Architectural Finishes.
 *
 * Target finishes:
 *   - Obsidian: deep matte black, absorbs light, zero gloss
 *   - Matte Carbon: ultra-dark non-reflective architectural finish
 *   - Graphite: dark textured grey, zero glare
 *   - Brushed Titanium: structured metallic, high roughness
 *   - Dark Glass: deep transparent surface with minimal depth sheen
 *
 * Palette strictly enforces Vision2Real design tokens (#050505 layered blacks).
 */

export interface MaterialPreset {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness: number;
  roughness: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
  envMapIntensity?: number;
}

// ─── Vision2Real Material Presets ─────────────────────────────────────────

export const MATERIAL_DARK_METALLIC: MaterialPreset = {
  color: '#0F0F12',
  emissive: '#050505',
  emissiveIntensity: 0.02,
  metalness: 0.80,
  roughness: 0.45,
};

/** Vision Purple — whisper quiet edge accent, never brightest element */
export const MATERIAL_ACCENT_GLOW: MaterialPreset = {
  color: '#6D5DF6',
  emissive: '#4A3EC8',
  emissiveIntensity: 0.22, // Whisper quiet
  metalness: 0.1,
  roughness: 0.6,
};

export const MATERIAL_SURFACE: MaterialPreset = {
  color: '#121214',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.5,
  roughness: 0.65,
};

export const MATERIAL_GRID_WIREFRAME: MaterialPreset = {
  color: '#202020',
  metalness: 0,
  roughness: 1,
  wireframe: true,
  transparent: true,
  opacity: 0.15,
};

export const MATERIAL_GHOST: MaterialPreset = {
  color: '#FFFFFF',
  metalness: 0,
  roughness: 0.9,
  transparent: true,
  opacity: 0.03,
};

export const MATERIAL_REALITY_GREEN: MaterialPreset = {
  color: '#22C55E',
  emissive: '#22C55E',
  emissiveIntensity: 0.2,
  metalness: 0.2,
  roughness: 0.6,
};

// ─── Masterpiece Architectural Finishes ───────────────────────────────────

export const MATERIAL_GRAPHITE: MaterialPreset = {
  color: '#0A0A0C',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.30,
  roughness: 0.92,
};

export const MATERIAL_DARK_GLASS: MaterialPreset = {
  color: '#06060C',
  emissive: '#030306',
  emissiveIntensity: 0.01,
  metalness: 0.80,
  roughness: 0.20,
  transparent: true,
  opacity: 0.38,
  envMapIntensity: 0.5,
};

export const MATERIAL_TITANIUM: MaterialPreset = {
  color: '#16161B',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.85,
  roughness: 0.50,
};

export const MATERIAL_SOFT_GLOW: MaterialPreset = {
  color: '#6D5DF6',
  emissive: '#3D2F8F',
  emissiveIntensity: 0.18,
  metalness: 0.0,
  roughness: 1.0,
  transparent: true,
  opacity: 0.08,
};

export const MATERIAL_ENERGY: MaterialPreset = {
  color: '#6D5DF6',
  emissive: '#4A3EC8',
  emissiveIntensity: 0.40,
  metalness: 0.05,
  roughness: 0.5,
  transparent: true,
  opacity: 0.60,
};

export const MATERIAL_OBSIDIAN: MaterialPreset = {
  color: '#050505',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.04,
  roughness: 0.99,
};

export const MATERIAL_MATTE_CARBON: MaterialPreset = {
  color: '#040406',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.10,
  roughness: 0.98,
};

export const MATERIAL_VISION_HAZE: MaterialPreset = {
  color: '#6D5DF6',
  emissive: '#3D2F8F',
  emissiveIntensity: 0.25,
  metalness: 0.0,
  roughness: 1.0,
  transparent: true,
  opacity: 0.04,
};

export const MATERIAL_PRESETS = {
  darkMetallic: MATERIAL_DARK_METALLIC,
  accentGlow: MATERIAL_ACCENT_GLOW,
  surface: MATERIAL_SURFACE,
  gridWireframe: MATERIAL_GRID_WIREFRAME,
  ghost: MATERIAL_GHOST,
  realityGreen: MATERIAL_REALITY_GREEN,
  graphite: MATERIAL_GRAPHITE,
  darkGlass: MATERIAL_DARK_GLASS,
  titanium: MATERIAL_TITANIUM,
  softGlow: MATERIAL_SOFT_GLOW,
  energy: MATERIAL_ENERGY,
  obsidian: MATERIAL_OBSIDIAN,
  matteCarbon: MATERIAL_MATTE_CARBON,
  visionHaze: MATERIAL_VISION_HAZE,
} as const;

export type MaterialPresetName = keyof typeof MATERIAL_PRESETS;
