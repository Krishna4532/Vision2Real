/**
 * Vision2Real – Continue Your Journey Auth Handoff Component
 * Framed as continuing the founder journey (not a generic login form).
 * Automatically transfers guest validation data, metadata, report preview, and history to founder account.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

interface AuthHandoffProps {
  onTransfer: (userData: { name: string; email: string }) => Promise<{ success: boolean }>;
}

export function AuthHandoff({ onTransfer }: AuthHandoffProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      const res = await onTransfer({ name: name || 'Founder', email });
      if (res.success) {
        navigate('/founder');
      }
    } catch (err) {
      console.error('Failed to transfer validation session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="v2r-auth-handoff" id="auth-handoff">
      <span className="v2r-section-heading__eyebrow">FOUNDER WORKSPACE HANDOFF</span>
      <h2 className="v2r-auth-handoff__title">Continue Your Journey</h2>
      <p className="v2r-auth-handoff__subtitle">
        Create your free account to attach this validation, unlock the complete interactive report,
        and start building in your Founder Workspace.
      </p>

      <div className="v2r-auth-benefits">
        <div className="v2r-auth-benefit-item">
          <svg className="v2r-auth-benefit-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="v2r-auth-benefit-item__text">Save your validation & session history</span>
        </div>

        <div className="v2r-auth-benefit-item">
          <svg className="v2r-auth-benefit-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="v2r-auth-benefit-item__text">Unlock the complete deep-dive AI report</span>
        </div>

        <div className="v2r-auth-benefit-item">
          <svg className="v2r-auth-benefit-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="v2r-auth-benefit-item__text">Continue building your startup in Reality Sprint</span>
        </div>

        <div className="v2r-auth-benefit-item">
          <svg className="v2r-auth-benefit-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="v2r-auth-benefit-item__text">Access your personal Founder Workspace</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="v2r-auth-form">
        <div className="v2r-auth-form__group">
          <label htmlFor="auth-name" className="v2r-auth-form__label">
            FULL NAME (OPTIONAL)
          </label>
          <input
            id="auth-name"
            type="text"
            className="v2r-auth-form__input"
            placeholder="Alex Vance"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="v2r-auth-form__group">
          <label htmlFor="auth-email" className="v2r-auth-form__label">
            WORK EMAIL
          </label>
          <input
            id="auth-email"
            type="email"
            className="v2r-auth-form__input"
            placeholder="alex@startup.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="v2r-auth-form__group">
          <label htmlFor="auth-password" className="v2r-auth-form__label">
            PASSWORD
          </label>
          <input
            id="auth-password"
            type="password"
            className="v2r-auth-form__input"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          style={{ width: '100%', marginTop: 'var(--space-sm)' }}
        >
          {isSubmitting ? 'Transferring Session...' : 'Create Free Account & Open Workspace'}
        </Button>
      </form>
    </div>
  );
}
