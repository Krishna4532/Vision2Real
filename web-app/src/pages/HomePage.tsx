/**
 * Vision2Real – Homepage Experience Assembly
 * Exact 9-section structure:
 * 1. Cinematic Hero
 * 2. Two Experience Cards (Validate My Idea / Build My Product)
 * 3. What is Vision2Real?
 * 4. Idea → Reality Journey
 * 5. Validation World
 * 6. Reality Sprint
 * 7. Build My Product
 * 8. Why Vision2Real
 * 9. Final Vision → Reality
 */

import { Hero } from '@/components/hero/Hero';
import { ExperienceCards } from '@/components/sections/ExperienceCards';
import { WhatIsVision2Real } from '@/components/sections/WhatIsVision2Real';
import { IdeaRealityJourney } from '@/components/sections/IdeaRealityJourney';
import { ValidationWorld } from '@/components/sections/ValidationWorld';
import { RealitySprintSection } from '@/components/sections/RealitySprintSection';
import { BuildMyProductSection } from '@/components/sections/BuildMyProductSection';
import { WhyVision2Real } from '@/components/sections/WhyVision2Real';
import { ProductsWeBuilt } from '@/components/sections/ProductsWeBuilt';
import { FinalVisionReality } from '@/components/sections/FinalVisionReality';

export function HomePage() {
  return (
    <>
      <Hero />
      <ExperienceCards />
      <WhatIsVision2Real />
      <IdeaRealityJourney />
      <ValidationWorld />
      <RealitySprintSection />
      <BuildMyProductSection />
      <WhyVision2Real />
      <ProductsWeBuilt />
      <FinalVisionReality />
    </>
  );
}
