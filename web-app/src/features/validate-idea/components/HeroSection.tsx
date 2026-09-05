import { PremiumHero } from '@/components/premiumHero/PremiumHero';

export function HeroSection() {
  const handleStartValidation = () => {
    const el = document.getElementById('idea-input') || document.querySelector('.v2r-idea-input-section');
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const handleLearnHowItWorks = () => {
    const el = document.getElementById('analysis-overview') || document.querySelector('.v2r-overview-grid');
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <PremiumHero
      id="hero"
      badge="AI MULTI-AGENT SPECIALIST ENGINE"
      heading={
        <>
          Validate Your Startup Idea Through<br />Our Multi-Agent AI System
        </>
      }
      description="Receive an enterprise-grade startup assessment powered by our coordinated Multi-Agent AI System. Specialized AI agents independently analyze your market opportunity, competition, technical feasibility, business model, execution readiness, risks, and growth potential."
      primaryAction={{
        label: 'Start AI Validation',
        onClick: handleStartValidation,
      }}
      secondaryAction={{
        label: 'Learn How It Works',
        onClick: handleLearnHowItWorks,
      }}
    />
  );
}
