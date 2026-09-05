import { type ReactNode } from 'react';
import { motion } from 'motion/react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <motion.div
      className="v2r-auth-card"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="v2r-auth-card__header">
        <h1 className="v2r-auth-card__title">{title}</h1>
        <p className="v2r-auth-card__subtitle">{subtitle}</p>
      </div>
      <div className="v2r-auth-card__body">{children}</div>
    </motion.div>
  );
}
