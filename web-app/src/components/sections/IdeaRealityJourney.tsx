/**
 * Vision2Real – Section 4: Idea → Reality Journey
 * Sequential 8-phase progression pipeline from raw idea to launch reality.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './sections.css';

const PHASES = [
  { step: '01', name: 'IDEA', desc: 'Raw concept formulation' },
  { step: '02', name: 'UNDERSTAND', desc: 'Problem space mapping' },
  { step: '03', name: 'RESEARCH', desc: 'Automated evidence gathering' },
  { step: '04', name: 'CHALLENGE', desc: 'Red-team assumption testing' },
  { step: '05', name: 'VALIDATE', desc: 'Market demand scoring' },
  { step: '06', name: 'DECIDE', desc: 'Clear build/pivot direction' },
  { step: '07', name: 'BUILD', desc: '14-day reality sprint' },
  { step: '08', name: 'REALITY', desc: 'Production software launch' },
] as const;

export function IdeaRealityJourney() {
  return (
    <Section id="journey">
      <Container>
        <SectionHeading
          eyebrow="PIPELINE"
          title="The Idea → Reality Journey"
          subtitle="A systematic progression that guides your concept from initial spark to deployed software."
        />

        <motion.div
          className="v2r-journey__container"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <div className="v2r-journey__grid">
            {PHASES.map((phase) => (
              <motion.div
                key={phase.name}
                className="v2r-journey-step"
                variants={fadeInUp}
                transition={transitions.smooth}
              >
                <span className="v2r-journey-step__num">PHASE {phase.step}</span>
                <div className="v2r-journey-step__name">{phase.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4xs)' }}>
                  {phase.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
