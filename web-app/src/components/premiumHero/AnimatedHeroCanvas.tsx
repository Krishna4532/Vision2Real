import { useEffect, useRef } from 'react';

interface AnimatedHeroCanvasProps {
  className?: string;
}

interface Particle {
  inbound: boolean;
  t: number;
  speed: number;
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  angle: number;
  lateralAmp: number;
  lateralFreq: number;
  phase: number;
  size: number;
  sprite: HTMLCanvasElement;
  baseAlpha: number;
  x?: number;
  y?: number;
  alpha?: number;
}

export function AnimatedHeroCanvas({ className = 'hero__particles' }: AnimatedHeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const isVisibleRef = useRef<boolean>(true);
  const isTabActiveRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const heroParent = canvas.parentElement || canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sprite pre-rendering
    const SPRITE_SIZE = 24;
    const makeSprite = (rgb: string): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = SPRITE_SIZE;
      c.height = SPRITE_SIZE;
      const g = c.getContext('2d');
      if (g) {
        const grad = g.createRadialGradient(
          SPRITE_SIZE / 2,
          SPRITE_SIZE / 2,
          0,
          SPRITE_SIZE / 2,
          SPRITE_SIZE / 2,
          SPRITE_SIZE / 2
        );
        grad.addColorStop(0, `rgba(${rgb},1)`);
        grad.addColorStop(0.4, `rgba(${rgb},0.55)`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      }
      return c;
    };

    const sprites = {
      white: makeSprite('240,240,246'),
      violet: makeSprite('150,132,238'),
      blue: makeSprite('120,150,190'),
    };
    const spriteKeys: Array<keyof typeof sprites> = ['white', 'white', 'white', 'violet', 'blue'];

    let W = 0;
    let H = 0;
    let DPR = 1;
    let cx = 0;
    let cy = 0;
    let particles: Particle[] = [];
    let lastTime: number | null = null;

    const particleCountForWidth = (w: number) => {
      if (w < 480) return 16;
      if (w < 900) return 30;
      if (w < 1600) return 46;
      return 58;
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const spawnEdgePoint = () => {
      const angle = rand(0, Math.PI * 2);
      const rx = W * 0.56;
      const ry = H * 0.56;
      return {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        angle,
      };
    };

    const resetOutbound = (p: Particle) => {
      const edge = spawnEdgePoint();
      p.inbound = false;
      p.t = 0;
      p.startX = cx;
      p.startY = cy;
      p.endX = edge.x;
      p.endY = edge.y;
      p.angle = edge.angle;
      p.phase = rand(0, Math.PI * 2);
    };

    const resetInbound = (p: Particle) => {
      const edge = spawnEdgePoint();
      p.inbound = true;
      p.t = 0;
      p.startX = edge.x;
      p.startY = edge.y;
      p.angle = edge.angle;
      p.phase = rand(0, Math.PI * 2);
    };

    const makeParticle = (): Particle => {
      const edge = spawnEdgePoint();
      const spriteKey = spriteKeys[Math.floor(Math.random() * spriteKeys.length)];
      return {
        inbound: true,
        t: 0,
        speed: rand(0.09, 0.16),
        startX: edge.x,
        startY: edge.y,
        angle: edge.angle,
        lateralAmp: rand(8, 26),
        lateralFreq: rand(1.2, 2.4),
        phase: rand(0, Math.PI * 2),
        size: rand(1.1, 2.6),
        sprite: sprites[spriteKey],
        baseAlpha: rand(0.35, 0.75),
      };
    };

    const initParticles = () => {
      const n = particleCountForWidth(W);
      particles = [];
      for (let i = 0; i < n; i++) {
        const p = makeParticle();
        p.t = Math.random();
        p.inbound = Math.random() > 0.4;
        if (!p.inbound) {
          p.endX = cx + rand(-40, 40);
          p.endY = cy + rand(-40, 40);
          resetOutbound(p);
          p.t = Math.random();
        }
        particles.push(p);
      }
    };

    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (p: Particle, dt: number) => {
      p.t += p.speed * dt;
      if (p.inbound) {
        if (p.t >= 1) {
          resetOutbound(p);
          return;
        }
        const e = ease(p.t);
        const lateral = Math.sin(p.t * p.lateralFreq * Math.PI * 2 + p.phase) * p.lateralAmp * (1 - p.t);
        const nx = -Math.sin(p.angle);
        const ny = Math.cos(p.angle);
        p.x = p.startX + (cx - p.startX) * e + nx * lateral;
        p.y = p.startY + (cy - p.startY) * e + ny * lateral;
        p.alpha = p.baseAlpha * (0.4 + 0.6 * p.t) * Math.min(1, p.t * 6);
      } else {
        if (p.t >= 1) {
          resetInbound(p);
          return;
        }
        const e2 = ease(p.t);
        const lateral2 = Math.sin(p.t * p.lateralFreq * Math.PI * 2 + p.phase) * p.lateralAmp * p.t;
        const nx2 = -Math.sin(p.angle);
        const ny2 = Math.cos(p.angle);
        const targetX = p.endX ?? cx;
        const targetY = p.endY ?? cy;
        p.x = p.startX + (targetX - p.startX) * e2 + nx2 * lateral2;
        p.y = p.startY + (targetY - p.startY) * e2 + ny2 * lateral2;
        p.alpha = p.baseAlpha * (1 - 0.75 * p.t) * Math.min(1, (1 - p.t) * 6 + 0.15);
      }
    };

    const resize = () => {
      const rect = heroParent.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;
      cx = W / 2;
      cy = H / 2;
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initParticles();
    };

    const renderLoop = (ts: number) => {
      if (!isRunningRef.current || !isVisibleRef.current || !isTabActiveRef.current) return;
      if (lastTime === null) lastTime = ts;
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        step(p, dt);
        if (p.x !== undefined && p.y !== undefined && p.alpha !== undefined && p.alpha > 0.01) {
          const s = p.size * 8;
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(renderLoop);
    };

    const startAnimation = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      lastTime = null;
      rafRef.current = requestAnimationFrame(renderLoop);
    };

    const stopAnimation = () => {
      isRunningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const renderStaticFrame = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const alpha = p.baseAlpha * 0.4;
        const x = p.inbound ? p.startX + (cx - p.startX) * p.t : p.startX + ((p.endX ?? cx) - p.startX) * p.t;
        const y = p.inbound ? p.startY + (cy - p.startY) * p.t : p.startY + ((p.endY ?? cy) - p.startY) * p.t;
        const s = p.size * 8;
        ctx.globalAlpha = alpha;
        ctx.drawImage(p.sprite, x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    const handleVisibilityChange = () => {
      isTabActiveRef.current = document.visibilityState === 'visible';
      if (!isTabActiveRef.current) {
        stopAnimation();
      } else if (isVisibleRef.current && !reduceMotion) {
        startAnimation();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting && isTabActiveRef.current && !reduceMotion) {
            startAnimation();
          } else {
            stopAnimation();
          }
        });
      },
      { threshold: 0.05 }
    );

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (reduceMotion) {
          renderStaticFrame();
        }
      }, 150);
    };

    resize();
    observer.observe(canvas);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (reduceMotion) {
      renderStaticFrame();
    } else {
      startAnimation();
    }

    return () => {
      stopAnimation();
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} id="particleCanvas" aria-hidden="true" />;
}
