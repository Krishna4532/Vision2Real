import type { ReactNode } from 'react';
import { HeroBackground } from './HeroBackground';
import { AnimatedHeroCanvas } from './AnimatedHeroCanvas';
import { HeroGlow } from './HeroGlow';
import { HeroGrid } from './HeroGrid';
import { HeroMouseParallax } from './HeroMouseParallax';
import { HeroContent } from './HeroContent';
import type { HeroAction } from './HeroButtons';
import './premiumHero.css';

export type { HeroAction as PremiumHeroAction };

export interface PremiumHeroProps {
  id?: string;
  badge?: string;
  badgeIconSrc?: string;
  heading: ReactNode;
  tagline?: ReactNode;
  description: ReactNode;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  markSrc?: string;
  children?: ReactNode;
  className?: string;
}

export function PremiumHero({
  id = 'hero',
  badge,
  badgeIconSrc,
  heading,
  tagline,
  description,
  primaryAction,
  secondaryAction,
  markSrc,
  children,
  className = '',
}: PremiumHeroProps) {
  return (
    <section className={`hero ${className}`.trim()} id={id}>
      <HeroBackground />
      <AnimatedHeroCanvas />
      <HeroGlow markSrc={markSrc} />

      <HeroGrid>
        <HeroMouseParallax>
          <HeroContent
            badge={badge}
            badgeIconSrc={badgeIconSrc}
            heading={heading}
            tagline={tagline}
            description={description}
            primaryAction={primaryAction}
            secondaryAction={secondaryAction}
          >
            {children}
          </HeroContent>
        </HeroMouseParallax>
      </HeroGrid>
    </section>
  );
}

export { AnimatedHeroCanvas } from './AnimatedHeroCanvas';
export { HeroBackground } from './HeroBackground';
export { HeroGlow } from './HeroGlow';
export { HeroParticles } from './HeroParticles';
export { HeroContent } from './HeroContent';
export { HeroBadge } from './HeroBadge';
export { HeroButtons } from './HeroButtons';
export { HeroGrid } from './HeroGrid';
export { HeroMouseParallax } from './HeroMouseParallax';
