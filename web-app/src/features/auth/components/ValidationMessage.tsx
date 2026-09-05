import { motion } from 'motion/react';

interface ValidationMessageProps {
  message?: string;
  id?: string;
  type?: 'error' | 'success' | 'info';
}

export function ValidationMessage({ message, id, type = 'error' }: ValidationMessageProps) {
  if (!message) return null;

  return (
    <motion.span
      id={id}
      role="alert"
      className={`v2r-auth-form__error v2r-auth-form__error--${type}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {message}
    </motion.span>
  );
}
