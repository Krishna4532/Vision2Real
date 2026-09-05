import type { ReactNode } from 'react';

interface HeroGridProps {
  children: ReactNode;
  className?: string;
}

export function HeroGrid({ children, className = '' }: HeroGridProps) {
  return <div className={`hero__grid ${className}`.trim()}>{children}</div>;
}
