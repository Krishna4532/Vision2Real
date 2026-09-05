import { motion } from 'motion/react';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.pass).length;

  const getStrengthInfo = () => {
    if (password.length === 0) return { label: '', color: 'transparent', percent: 0 };
    if (passedCount <= 1) return { label: 'Very Weak', color: 'var(--color-error)', percent: 20 };
    if (passedCount === 2) return { label: 'Weak', color: '#F97316', percent: 40 };
    if (passedCount === 3) return { label: 'Medium', color: 'var(--color-warning)', percent: 60 };
    if (passedCount === 4) return { label: 'Strong', color: '#3B82F6', percent: 80 };
    return { label: 'Very Strong', color: 'var(--color-success)', percent: 100 };
  };

  const { label, color, percent } = getStrengthInfo();

  return (
    <div className="v2r-password-strength" aria-live="polite">
      <div className="v2r-password-strength__header">
        <span className="v2r-password-strength__title">Password Strength</span>
        <span className="v2r-password-strength__label" style={{ color }}>
          {label}
        </span>
      </div>

      <div className="v2r-password-strength__bar-track">
        <motion.div
          className="v2r-password-strength__bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%`, backgroundColor: color }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <ul className="v2r-password-strength__checklist">
        {checks.map((item) => (
          <li
            key={item.label}
            className={`v2r-password-strength__check-item ${
              item.pass ? 'v2r-password-strength__check-item--pass' : ''
            }`}
          >
            <span className="v2r-password-strength__check-icon" aria-hidden="true">
              {item.pass ? '✓' : '•'}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
