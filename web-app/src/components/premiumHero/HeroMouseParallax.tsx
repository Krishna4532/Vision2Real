import { useState, useEffect } from 'react';
import type { ReactNode, MouseEvent } from 'react';

interface HeroMouseParallaxProps {
  children: ReactNode;
  factor?: number;
  className?: string;
}

export function HeroMouseParallax({ children, factor = 0.02, className = '' }: HeroMouseParallaxProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isReduced) return;
    const { clientX, clientY } = e;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const x = (clientX - windowWidth / 2) * factor;
    const y = (clientY - windowHeight / 2) * factor;
    setOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={`hero__parallax-wrapper ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isReduced ? 'none' : `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
    >
      {children}
    </div>
  );
}
