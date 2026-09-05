/**
 * Vision2Real – Section 2: Two Experience Cards
 * Immediate entry portals after Hero:
 * Card 1: Validate My Idea
 * Card 2: Build My Product (slightly stronger visual emphasis)
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './sections.css';

export function ExperienceCards() {
  const navigate = useNavigate();

  const handleValidateClick = () => {
    navigate('/validate-idea');
  };

  return (
    <Section id="experience-cards" style={{ paddingTop: 'var(--space-2xl)' }}>
      <Container>
        <motion.div
          className="v2r-experience-cards__grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Card 1: Validate My Idea */}
          <motion.div
            id="validate-idea"
            className="v2r-portal-card"
            variants={fadeInUp}
            transition={transitions.smooth}
            onClick={handleValidateClick}
            role="button"
            tabIndex={0}
            aria-label="Validate My Idea – Enter the world of understanding your idea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleValidateClick();
              }
            }}
          >
            <div className="v2r-portal-card__bg-glow" aria-hidden="true" />
            <div className="v2r-portal-card__header">
              <span className="v2r-portal-card__tag">VALIDATION ENGINE</span>
              <h3 className="v2r-portal-card__title">Validate My Idea</h3>
              <p className="v2r-portal-card__description">
                Enter the world of understanding your idea. Discover market demand, target users,
                risks, and feasibility before writing code.
              </p>
            </div>
            <div className="v2r-portal-card__footer">
              <span>Enter Validation Portal</span>
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

          {/* Card 2: Build My Product (Stronger Visual Emphasis) */}
          <motion.div
            id="build-product"
            className="v2r-portal-card v2r-portal-card--emphasis"
            variants={fadeInUp}
            transition={transitions.smooth}
            onClick={() => navigate('/build-product')}
            role="button"
            tabIndex={0}
            aria-label="Build My Product – Enter the world of turning your idea into reality"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/build-product');
              }
            }}
          >
            <div className="v2r-portal-card__bg-glow" aria-hidden="true" />
            <div className="v2r-portal-card__header">
              <span className="v2r-portal-card__tag">REALITY SPRINT</span>
              <h3 className="v2r-portal-card__title">Build My Product</h3>
              <p className="v2r-portal-card__description">
                Enter the world of turning your idea into reality. Execute production-ready
                full-stack software, web apps, and platforms.
              </p>
            </div>
            <div className="v2r-portal-card__footer">
              <span>Enter Reality Portal</span>
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
      </Container>
    </Section>
  );
}
