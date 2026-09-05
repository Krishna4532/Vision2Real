/**
 * Vision2Real – Section Heading Component
 * Consistent eyebrow + title + subtitle for homepage sections.
 */

import { motion } from 'motion/react';
import { fadeInUp, transitions } from '@/utils/motion';

interface SectionHeadingProps {
  eyebrow?: string;
  tag?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export function SectionHeading({ eyebrow, tag, title, subtitle, align = 'center' }: SectionHeadingProps) {
  const label = eyebrow || tag;
  return (
    <motion.div
      className="v2r-section-heading"
      style={{ textAlign: align }}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={transitions.smooth}
    >
      {label && <span className="v2r-section-heading__eyebrow">{label}</span>}
      <h2 className="v2r-section-heading__title">{title}</h2>
      {subtitle && (
        <p
          className="v2r-section-heading__subtitle"
          style={{ marginInline: align === 'left' ? 0 : 'auto' }}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
