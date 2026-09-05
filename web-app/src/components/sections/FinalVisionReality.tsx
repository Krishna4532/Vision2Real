/**
 * Vision2Real – Section 9: Final Vision → Reality
 * Narrative closure returning to the opening story & re-presenting the two destination portals.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './sections.css';

export function FinalVisionReality() {
  const handleCardClick = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Section id="final-vision">
      <Container>
        <motion.div
          className="v2r-final__container"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          transition={transitions.smooth}
        >
          <span className="v2r-section-heading__eyebrow">DESTINATION</span>
          <h2 className="v2r-final__title">
            From Vision to Reality
          </h2>
          <p className="v2r-final__quote">
            &ldquo;The idea that comes to your mind deserves validation.
            <br />
            The idea that doesn&apos;t let you sleep deserves a chance to become real.&rdquo;
          </p>

          <motion.div
            className="v2r-experience-cards__grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            style={{ textAlign: 'left' }}
          >
            {/* Destination Card 1: Validate My Idea */}
            <motion.div
              className="v2r-portal-card"
              variants={fadeInUp}
              transition={transitions.smooth}
              onClick={() => handleCardClick('validation-world')}
              role="button"
              tabIndex={0}
              aria-label="Validate My Idea"
            >
              <div className="v2r-portal-card__bg-glow" aria-hidden="true" />
              <div className="v2r-portal-card__header">
                <span className="v2r-portal-card__tag">STEP 1</span>
                <h3 className="v2r-portal-card__title">Validate My Idea</h3>
                <p className="v2r-portal-card__description">
                  Understand your market, test demand, and receive a complete validation report.
                </p>
              </div>
              <div className="v2r-portal-card__footer">
                <span>Start Idea Validation</span>
                <svg
                  className="v2r-portal-card__arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>

            {/* Destination Card 2: Build My Product */}
            <motion.div
              className="v2r-portal-card v2r-portal-card--emphasis"
              variants={fadeInUp}
              transition={transitions.smooth}
              onClick={() => handleCardClick('build-types')}
              role="button"
              tabIndex={0}
              aria-label="Build My Product"
            >
              <div className="v2r-portal-card__bg-glow" aria-hidden="true" />
              <div className="v2r-portal-card__header">
                <span className="v2r-portal-card__tag">STEP 2</span>
                <h3 className="v2r-portal-card__title">Build My Product</h3>
                <p className="v2r-portal-card__description">
                  Execute production-ready full-stack software through our 14-day reality sprint.
                </p>
              </div>
              <div className="v2r-portal-card__footer">
                <span>Begin Reality Sprint</span>
                <svg
                  className="v2r-portal-card__arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
