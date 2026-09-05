/**
 * Vision2Real – Section 8: Why Vision2Real
 * Trust principles: challenging ideas, intelligence + execution, moving from uncertainty to action.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './sections.css';

const TRUST_PRINCIPLES = [
  {
    title: 'We Challenge Ideas First',
    description:
      'We never blindly build unvalidated concepts. We test assumptions, red-team market risk, and prove demand before commitment.',
  },
  {
    title: 'Intelligence + Execution',
    description:
      'Most platforms stop at AI advice or pitch deck feedback. Vision2Real combines deep AI research with full-stack software development.',
  },
  {
    title: 'Beyond Recommendations',
    description:
      'You receive tangible software, typed codebases, deployed APIs, and total repository ownership—not static slide decks.',
  },
  {
    title: 'Uncertainty to Action',
    description:
      'We convert founder anxiety and ambiguity into clear, evidence-driven decisions and real product velocity.',
  },
] as const;

export function WhyVision2Real() {
  return (
    <Section id="why-vision2real">
      <Container>
        <SectionHeading
          eyebrow="FOUNDER TRUST"
          title="Why Serious Founders Choose Vision2Real"
          subtitle="Built on radical transparency, rigorous validation, and production engineering quality."
        />

        <motion.div
          className="v2r-why-trust__grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {TRUST_PRINCIPLES.map((item) => (
            <motion.div
              key={item.title}
              className="v2r-trust-card"
              variants={fadeInUp}
              transition={transitions.smooth}
            >
              <h3 className="v2r-trust-card__title">{item.title}</h3>
              <p className="v2r-trust-card__description">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
