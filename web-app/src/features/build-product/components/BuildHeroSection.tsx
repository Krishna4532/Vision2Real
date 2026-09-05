import { PremiumHero } from '@/components/premiumHero/PremiumHero';

export function BuildHeroSection() {
  const handleScrollToJourney = () => {
    const el = document.getElementById('choose-journey');
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <PremiumHero
      id="hero"
      badge="FOUNDER PRODUCT PARTNERSHIP"
      heading="Turn your vision into a real product."
      description="Share your product vision with Vision2Real. Whether you're building a startup, SaaS platform, AI application, automation system, or internal business software, we partner with founders to transform ideas into production-ready products."
      primaryAction={{
        label: 'Choose Your Build Journey',
        onClick: handleScrollToJourney,
      }}
    />
  );
}
