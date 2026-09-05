import { useState, useEffect } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import '../styles/Auth.css';

export function ResetPasswordPage() {
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
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}
