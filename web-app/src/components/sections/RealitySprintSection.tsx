/**
 * Vision2Real – Section 6: Reality Sprint
 * Presents the Reality Sprint as the bridge between validation and full product development.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, transitions } from '@/utils/motion';
import './sections.css';

export function RealitySprintSection() {
  return (
    <Section id="reality-sprint">
      <Container>
        <SectionHeading
          eyebrow="EXECUTION BRIDGE"
          title="The Bridge From Validation to Reality"
          subtitle="Once an idea is validated, Reality Sprint translates research specifications into deployed, production-grade software."
        />

        <motion.div
          className="v2r-sprint__box"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={transitions.smooth}
        >
          <p className="v2r-sprint__text">
            Traditional software development forces founders to choose between slow, expensive agency contracts or fragile low-code prototypes.
            <br /><br />
            <strong>Reality Sprint</strong> is our focused execution phase. It takes validated technical architecture, data schemas, and user flows, then orchestrates agent workflows to engineer a full-stack platform ready for real users.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>
            <span>Engineered Execution • Full Code Ownership • Production Quality</span>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
