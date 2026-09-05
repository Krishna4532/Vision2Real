/**
 * Vision2Real – Choose Your Build Journey Component
 * Decision portals presenting Build My Product (Primary) and Reality Sprint (Secondary)
 * with locked copy and decision helper guide.
 */

import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useBuildContext } from '../context/BuildContext';

const BEST_FOR_BUILD = [
  'Startup Products',
  'SaaS Platforms',
  'AI Applications',
  'Web Applications',
  'Mobile Applications',
  'Business Automation',
  'Internal Tools',
  'Enterprise Solutions',
  'Product Redesigns',
  'Scaling Existing Products',
];

const BEST_FOR_SPRINT = [
  'Prototype Validation',
  'Feature Validation',
  'UX Testing',
  'Early Founder Feedback',
  'Investor Demonstrations',
  'Product Experiments',
];

interface ChooseJourneySectionProps {
  onSelectBuildProduct: () => void;
  onSelectRealitySprint: () => void;
}

export function ChooseJourneySection({
  onSelectBuildProduct,
  onSelectRealitySprint,
}: ChooseJourneySectionProps) {
  const { selectJourneyPath, selectedPath } = useBuildContext();

  const handleSelectBuild = () => {
    selectJourneyPath('build_product');
    onSelectBuildProduct();
  };

  const handleSelectSprint = () => {
    selectJourneyPath('reality_sprint');
    onSelectRealitySprint();
  };

  return (
    <section className="v2r-choose-journey" id="choose-journey">
      <SectionHeading
        eyebrow="TAILORED EXECUTION PATHS"
        title="Choose Your Build Journey"
        subtitle="Every founder is at a different stage. Choose the path that best matches where you are today."
      />

      <div className="v2r-journey-grid">
        {/* CARD 1 — BUILD MY PRODUCT (PRIMARY) */}
        <div
          className={`v2r-journey-card v2r-journey-card--primary ${
            selectedPath === 'build_product' ? 'v2r-journey-card--selected' : ''
          }`}
        >
          <div>
            <span className="v2r-journey-card__tag">RECOMMENDED PRIMARY JOURNEY</span>
            <h3 className="v2r-journey-card__title">Build My Product</h3>
            <p className="v2r-journey-card__desc">
              Turn your vision into a real product. You've validated your idea—or you're already confident in it—and you're ready to build.
              {'\n\n'}
              Whether it's a web application, mobile app, SaaS platform, AI product, automation system, or internal business software, Vision2Real partners with you from planning through delivery to create a production-ready product.
            </p>

            <div className="v2r-journey-card__section-label">BEST FOR</div>
            <div className="v2r-journey-card__pills">
              {BEST_FOR_BUILD.map((item) => (
                <span key={item} className="v2r-journey-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="v2r-journey-card__pricing">
              <div className="v2r-journey-card__price-val">Custom Pricing</div>
              <div className="v2r-journey-card__price-sub">
                Based on your product requirements. Fully negotiable after understanding your project.
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSelectBuild}
              style={{ width: '100%' }}
            >
              <span>Build My Product</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* CARD 2 — REALITY SPRINT (SECONDARY) */}
        <div
          className={`v2r-journey-card v2r-journey-card--secondary ${
            selectedPath === 'reality_sprint' ? 'v2r-journey-card--selected' : ''
          }`}
        >
          <div>
            <span className="v2r-journey-card__tag" style={{ color: 'var(--color-text-muted)' }}>
              VALIDATION SPRINT
            </span>
            <h3 className="v2r-journey-card__title">Reality Sprint</h3>
            <p className="v2r-journey-card__desc">
              Validate before you invest. Reality Sprint is designed for founders who want to validate one critical user journey before committing to full product development.
              {'\n\n'}
              Perfect for reducing risk, testing assumptions, and building confidence before making a larger investment.
            </p>

            <div className="v2r-journey-card__section-label">BEST FOR</div>
            <div className="v2r-journey-card__pills">
              {BEST_FOR_SPRINT.map((item) => (
                <span key={item} className="v2r-journey-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="v2r-journey-card__pricing">
              <div className="v2r-journey-card__price-val">Starts from ₹5,000</div>
              <div className="v2r-journey-card__price-sub">
                Single critical journey prototype &amp; rapid risk validation sprint.
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={handleSelectSprint}
              style={{ width: '100%' }}
            >
              <span>Start Reality Sprint</span>
            </Button>
          </div>
        </div>
      </div>

      {/* DECISION HELPER GUIDE */}
      <div className="v2r-decision-helper">
        <h4 className="v2r-decision-helper__title">Not sure which path is right for you?</h4>
        <p className="v2r-decision-helper__text">
          Start with Build My Product. Our team will review your requirements and recommend the most suitable approach if a Reality Sprint would better fit your goals.
        </p>
      </div>
    </section>
  );
}
