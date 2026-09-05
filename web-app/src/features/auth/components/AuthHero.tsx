import { motion } from 'motion/react';
import { AnimatedHeroCanvas } from '@/components/hero/AnimatedHeroCanvas';

const HIGHLIGHTS = [
  'Validation Reports',
  'Build Requests',
  'Reality Sprint',
  'Founder Workspace',
];

export function AuthHero() {
  return (
    <div className="v2r-auth-hero">
      <AnimatedHeroCanvas className="v2r-auth-hero__canvas" />
      <div className="v2r-auth-hero__glow" aria-hidden="true" />
      
      <div className="v2r-auth-hero__content">
        <motion.div
          className="v2r-auth-hero__badge"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Vision2Real Ecosystem
        </motion.div>

        <motion.h2
          className="v2r-auth-hero__headline"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Welcome to your <br />
          <span className="v2r-auth-hero__headline-accent">Founder Workspace</span>
        </motion.h2>

        <motion.p
          className="v2r-auth-hero__copy"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Everything you've validated, built, and created lives here.
        </motion.p>

        <ul className="v2r-auth-hero__highlights">
          {HIGHLIGHTS.map((item, index) => (
            <motion.li
              key={item}
              className="v2r-auth-hero__highlight-item"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + index * 0.08 }}
            >
              <span className="v2r-auth-hero__check-icon" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
