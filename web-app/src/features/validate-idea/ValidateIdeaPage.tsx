/**
 * Vision2Real – Validate My Idea Page
 * Operational workspace interface where AI specialists evaluate startup ideas,
 * stream live status messages, present qualitative report previews, offer recommendations,
 * and seamlessly hand off validation data to founder accounts.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Container } from '@/components/ui/Container';
import { HeroSection } from './components/HeroSection';
import { IdeaInput } from './components/IdeaInput';
import { AnalysisOverview } from './components/AnalysisOverview';
import { ValidationProgress } from './components/ValidationProgress';
import { ValidationReportPreview } from './components/ValidationReportPreview';
import { FounderSuccessRoadmap } from './components/FounderSuccessRoadmap';
import { RecommendationSection } from './components/RecommendationSection';
import { AuthHandoff } from './components/AuthHandoff';
import { ValidationSessionProvider, useValidationSession } from './context/ValidationSessionContext';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import type { UploadedFileContext } from '@/types/validation';
import './ValidateIdea.css';

function ValidateIdeaContent() {
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const {
    session,
    isValidating,
    isCompleted,
    startValidation,
    transferSessionToAccount,
    resetValidation,
  } = useValidationSession();

  const handleStartValidation = async (ideaText: string, files: UploadedFileContext[] = []) => {
    await startValidation(ideaText, files);
    // Smooth scroll to validation progress section automatically
    setTimeout(() => {
      const el = document.getElementById('validation-progress');
      if (el) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }, 100);
  };

  const handleContinueJourney = () => {
    const el = document.getElementById('auth-handoff');
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <motion.div
      className="v2r-validate-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <CinematicTransitionOverlay isVisible={isTransitioning} message="Entering Vision2Real…" />
      <div className="v2r-validate-page__glow" aria-hidden="true" />

      <HeroSection />

      <Container>

        {/* Phase 1: Idea Input & Overview (Visible before submission or when reset) */}
        {!session && (
          <>
            <IdeaInput onSubmit={handleStartValidation} isLoading={isValidating} />
            <AnalysisOverview />
          </>
        )}

        {/* Phase 2: Live AI Validation Progress */}
        {session && (
          <ValidationProgress
            stages={session.stages}
            isTakingLonger={session.isTakingLonger}
          />
        )}

        {/* Phase 3: Detailed Multi-Specialist Report & PDF Export */}
        {isCompleted && session?.reportPreview && (
          <>
            <ValidationReportPreview
              report={session.reportPreview}
              recommendations={session.recommendations || []}
              ideaText={session.ideaText}
            />

            {/* Personalized Founder Success Roadmap Appended Below Report */}
            <FounderSuccessRoadmap
              report={session.reportPreview}
              recommendations={session.recommendations || []}
              ideaText={session.ideaText}
              onReset={resetValidation}
              onContinueJourney={handleContinueJourney}
            />
          </>
        )}

        {/* Phase 4: Personalized AI Recommendations */}
        {isCompleted && session?.recommendations && session.recommendations.length > 0 && (
          <RecommendationSection
            recommendations={session.recommendations}
            onContinueJourney={handleContinueJourney}
            onValidateAnother={resetValidation}
          />
        )}

        {/* Phase 5: Continue Your Journey Auth Handoff */}
        {isCompleted && session && (
          <AuthHandoff onTransfer={transferSessionToAccount} />
        )}
      </Container>
    </motion.div>
  );
}

export function ValidateIdeaPage() {
  return (
    <ValidationSessionProvider>
      <ValidateIdeaContent />
    </ValidationSessionProvider>
  );
}

export default ValidateIdeaPage;
