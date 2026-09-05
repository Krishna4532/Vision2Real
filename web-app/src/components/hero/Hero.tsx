import { useNavigate } from 'react-router-dom';
import { PremiumHero } from '@/components/premiumHero/PremiumHero';

export function Hero() {
  const navigate = useNavigate();

  return (
    <PremiumHero
      id="hero"
      badge="AI STARTUP OPERATING SYSTEM"
      heading="No Startup Idea Should Ever Be Wasted."
      tagline="You Bring the Vision. We Turn It Into Reality."
      description="Vision2Real is your AI + Human Expertise-powered startup execution platform. We validate your idea through our multi-agent AI system, uncover opportunities, create a personalized founder roadmap, execute Reality Sprints, and build your product—guiding you from vision to reality with the least possible risk."
      primaryAction={{
        label: 'Validate My Idea',
        onClick: () => navigate('/validate'),
      }}
      secondaryAction={{
        label: 'Build My Product',
        onClick: () => navigate('/build-product'),
      }}
    />
  );
}
