import type { ReactNode } from 'react';
import { HeroBadge } from './HeroBadge';
import { HeroButtons } from './HeroButtons';
import type { HeroAction } from './HeroButtons';

interface HeroContentProps {
  badge?: string;
  badgeIconSrc?: string;
  heading: ReactNode;
  tagline?: ReactNode;
  description: ReactNode;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  children?: ReactNode;
  className?: string;
}

export function HeroContent({
  badge,
  badgeIconSrc,
  heading,
  tagline,
  description,
  primaryAction,
  secondaryAction,
  children,
  className = '',
}: HeroContentProps) {
  return (
    <div className={`hero__content ${className}`.trim()}>
      <HeroBadge badge={badge} iconSrc={badgeIconSrc} />

      <h1 className="hero__headline">{heading}</h1>

      {tagline && <h2 className="hero__promise">{tagline}</h2>}

      <p className="hero__sub">{description}</p>

      {children ? (
        children
      ) : (
        <HeroButtons primaryAction={primaryAction} secondaryAction={secondaryAction} />
      )}
    </div>
  );
}
