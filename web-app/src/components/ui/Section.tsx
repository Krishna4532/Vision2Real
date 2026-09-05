/**
 * Vision2Real – Section Component
 * Semantic <section> wrapper with consistent vertical spacing.
 */

import { type HTMLAttributes, type ReactNode } from 'react';

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Section({ className = '', children, id, ...props }: SectionProps) {
  const classes = ['v2r-section', className].filter(Boolean).join(' ');
  return (
    <section className={classes} id={id} {...props}>
      {children}
    </section>
  );
}
