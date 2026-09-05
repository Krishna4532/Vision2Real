/**
 * Vision2Real – Section 7: Build My Product
 * Shows software execution capabilities (not agency services).
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './sections.css';

const BUILD_TYPES = [
  'Websites',
  'Web Apps',
  'Mobile Apps',
  'AI Products',
  'SaaS Platforms',
  'AI Agents',
  'Dashboards',
  'Automations',
  'Internal Tools',
  'APIs & Backends',
  'Integrations',
  'Custom Software',
] as const;

export function BuildMyProductSection() {
  return (
    <Section id="build-types">
      <Container>
        <SectionHeading
          eyebrow="SOFTWARE CAPABILITIES"
          title="What Vision2Real Builds"
          subtitle="Direct software execution powered by AI + Human Expertise, automated architecture, and production-grade engineering standards."
        />

        <motion.div
          className="v2r-build-types__grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {BUILD_TYPES.map((item) => (
            <motion.div
              key={item}
              className="v2r-build-type-card"
              variants={fadeInUp}
              transition={transitions.smooth}
            >
              <span className="v2r-build-type-card__dot" aria-hidden="true" />
              <span>{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
