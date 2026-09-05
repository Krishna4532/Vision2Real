import { useEffect, useRef } from 'react';

interface AnimatedHeroCanvasProps {
  className?: string;
}

export function AnimatedHeroCanvas({ className = 'v2r-about-hero__canvas' }: AnimatedHeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const isWindowActiveRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let W = canvas.offsetWidth || window.innerWidth;
    let H = canvas.offsetHeight || 500;
    canvas.width = W;
    canvas.height = H;

    const count = Math.min(60, Math.floor((W * H) / 12000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      if (isVisibleRef.current && isWindowActiveRef.current) {
        ctx.clearRect(0, 0, W, H);
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(109,93,246,${p.alpha})`;
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
        });
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      if (!canvas) return;
      W = canvas.offsetWidth || window.innerWidth;
      H = canvas.offsetHeight || 500;
      canvas.width = W;
      canvas.height = H;
    };

    const handleVisibilityChange = () => {
      isWindowActiveRef.current = document.visibilityState === 'visible';
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <canvas className={className} ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}
