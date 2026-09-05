/**
 * Vision2Real – Spacing, Radius, Shadow, Motion & Z-Index Tokens
 */

export const spacing = {
  '4xs': '0.125rem',   /* 2px  */
  '3xs': '0.25rem',    /* 4px  */
  '2xs': '0.375rem',   /* 6px  */
  xs: '0.5rem',        /* 8px  */
  sm: '0.75rem',       /* 12px */
  md: '1rem',          /* 16px */
  lg: '1.5rem',        /* 24px */
  xl: '2rem',          /* 32px */
  '2xl': '3rem',       /* 48px */
  '3xl': '4rem',       /* 64px */
  '4xl': '6rem',       /* 96px */
  '5xl': '8rem',       /* 128px */
} as const;

export const radius = {
  none: '0',
  sm: '0.25rem',       /* 4px  */
  md: '0.5rem',        /* 8px  */
  lg: '0.75rem',       /* 12px */
  xl: '1rem',          /* 16px */
  '2xl': '1.5rem',     /* 24px */
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.25)',
  md: '0 4px 12px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.35)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.4)',
  glow: '0 0 20px rgba(109, 93, 246, 0.3)',
  glowStrong: '0 0 40px rgba(109, 93, 246, 0.5)',
} as const;

export const motion = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
} as const;

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  navbar: 300,
  overlay: 400,
  modal: 500,
  toast: 600,
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1200px',
} as const;
