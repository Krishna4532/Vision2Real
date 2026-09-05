import { AnimatedHeroCanvas } from './AnimatedHeroCanvas';

interface HeroParticlesProps {
  className?: string;
}

export function HeroParticles({ className = 'hero__particles' }: HeroParticlesProps) {
  return <AnimatedHeroCanvas className={className} />;
}
