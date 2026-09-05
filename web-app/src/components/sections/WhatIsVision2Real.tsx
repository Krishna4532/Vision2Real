/**
 * Vision2Real – Section 3: What is Vision2Real?
 * Explains the core founder problem and why Vision2Real exists.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, transitions } from '@/utils/motion';
import './sections.css';

const QUESTIONS = [
  'Is this concept actually worth building?',
  'Who needs this product and will they pay for it?',
  'What existing solutions or competitors already exist?',
  'How should this idea be validated rigorously?',
  'What is the technical architecture required?',
  'Should this even be built right now?',
] as const;

export function WhatIsVision2Real() {
  return (
    <Section id="what-is">
      <Container>
        <SectionHeading
          eyebrow="FOUNDER CLARITY"
          title="Ideas are easy to have. Knowing what to do with them isn't."
          subtitle="Every founder starts with something—an idea, a customer problem, raw research, a pitch deck, or simply a persistent thought."
        />

        <motion.div
          className="v2r-what-is__content"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={transitions.smooth}
        >
          <p className="v2r-what-is__lead">
            Yet most founders get stuck in uncertainty before they ever write a line of code or launch to real users. Vision2Real exists to answer the critical questions:
          </p>

          <div className="v2r-what-is__questions">
            {QUESTIONS.map((question) => (
              <div key={question} className="v2r-question-chip">
                <span className="v2r-question-chip__dot" aria-hidden="true" />
                <span>{question}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
