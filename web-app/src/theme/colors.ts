/**
 * Vision2Real – Color Design Tokens
 * Layered black dark luxury palette. All colors are consumed as CSS custom properties.
 */

export const colors = {
  /** Core backgrounds & surfaces */
  background: '#050505',
  surfacePrimary: '#0A0A0A',
  surfaceSecondary: '#111111',
  surfaceElevated: '#171717',
  border: '#242424',

  /** Text hierarchy */
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A8A8',

  /** Accent color – used ONLY for CTAs, active nav, highlights, selected interactions */
  accent: '#6D5DF6',
  accentHover: '#7E70FF',

  /** Semantic feedback */
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export type ColorToken = keyof typeof colors;
