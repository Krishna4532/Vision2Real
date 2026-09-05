/**
 * Vision2Real – HeroOverlay Component
 * Phase 2 — Pass 2: Hero Typography + CTA + Visual Hierarchy
 *
 * Integrated directly into the Pass 1 3D architectural world:
 *   1. Primary Headline: "Your Vision Deserves to Become Reality." (Editorial Manifesto)
 *   2. Supporting Message: Concise founder-facing product explanation.
 *   3. Primary CTA: "Validate My Idea" (Direct no-signup entry path)
 *      Microcopy: "Test your idea before you build it."
 *   4. Secondary CTA: "Build My Product"
 *      Microcopy: "Turn your validated idea into a real product."
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { fadeInUp, transitions } from '@/utils/motion';

export function HeroOverlay() {
  const navigate = useNavigate();

  const handleValidateClick = () => {
    navigate('/validate-idea');
  };

  const handleBuildClick = () => {
    navigate('/build-product');
  };

  return (
    <div className="v2r-hero-overlay">
      <motion.div
        className="v2r-hero-overlay__content"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {/* Eyebrow */}
        <motion.span
          className="v2r-hero-overlay__eyebrow"
          variants={fadeInUp}
          transition={transitions.smooth}
        >
          VISION2REAL ECOSYSTEM
        </motion.span>

        {/* Headline — Manifesto Style with Intentional Line Breaks */}
        <motion.h1
          className="v2r-hero-overlay__headline"
          variants={fadeInUp}
          transition={transitions.smooth}
        >
          Your Vision Deserves <br className="v2r-hero-overlay__headline-br" />
          to Become Reality.
        </motion.h1>

        {/* Supporting Message — Concise & Confident */}
        <motion.p
          className="v2r-hero-overlay__copy"
          variants={fadeInUp}
          transition={transitions.smooth}
        >
          Turn your idea into clarity, validation, and a path to reality — powered by AI + Human Expertise built for ambitious founders.
        </motion.p>

        {/* Primary & Secondary Dual CTAs */}
        <motion.div
          className="v2r-hero-overlay__actions"
          variants={fadeInUp}
          transition={transitions.smooth}
        >
          {/* Primary Action: Validate My Idea */}
          <div className="v2r-hero-overlay__cta-item v2r-hero-overlay__cta-item--primary">
            <Button
              variant="primary"
              size="lg"
              onClick={handleValidateClick}
              className="v2r-hero-overlay__btn v2r-hero-overlay__btn--primary"
            >
              <span>Validate My Idea</span>
              <svg
                className="v2r-hero-overlay__btn-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
            <span className="v2r-hero-overlay__microcopy">
              Test your idea before you build it.
            </span>
          </div>

          {/* Secondary Action: Build My Product */}
          <div className="v2r-hero-overlay__cta-item v2r-hero-overlay__cta-item--secondary">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBuildClick}
              className="v2r-hero-overlay__btn v2r-hero-overlay__btn--secondary"
            >
              <span>Build My Product</span>
            </Button>
            <span className="v2r-hero-overlay__microcopy">
              Turn your validated idea into a real product.
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
