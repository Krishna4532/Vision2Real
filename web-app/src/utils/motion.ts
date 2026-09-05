/**
 * Vision2Real – Motion Utilities
 * Reusable animation variants for the `motion` library.
 * Every animation has purpose: it explains, guides, or communicates.
 */

import type { Transition, Variants } from 'motion/react';

/** Standard transition presets */
export const transitions = {
  spring: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
  smooth: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as Transition,
  fast: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } as Transition,
  slow: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as Transition,
} as const;

/** Fade in from bottom – content entering the viewport */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/** Fade in from left */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0 },
};

/** Fade in from right */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
};

/** Simple fade */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Scale in – for emphasis elements */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

/** Stagger children container */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/** Stagger with larger delay for section-level content */
export const staggerSection: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};
