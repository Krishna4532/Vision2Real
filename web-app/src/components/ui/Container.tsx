/**
 * Vision2Real – Container Component
 * Centers content with consistent max-width.
 */

import { type HTMLAttributes, type ReactNode } from 'react';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Container({ className = '', children, ...props }: ContainerProps) {
  const classes = ['v2r-container', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
