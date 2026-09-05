import { useState, useEffect } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import '../styles/Auth.css';

export function ForgotPasswordPage() {
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsTransitioning(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <CinematicTransitionOverlay
        isVisible={isTransitioning}
        message="Entering Founder Workspace..."
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}
