/**
 * Vision2Real – Build My Product & Reality Sprint Flagship Page
 * Entry portal for founders ready to build or validate their product.
 * Features 1-second Build World transition on mount, journey selection entry point,
 * completely decoupled Build Request and Reality Sprint briefing flows, summary review, and confirmation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Container } from '@/components/ui/Container';
import { BuildHeroSection } from './components/BuildHeroSection';
import { ChooseJourneySection } from './components/ChooseJourneySection';
import { BuildRequestForm } from './components/BuildRequestForm';
import { RealitySprintForm } from './components/RealitySprintForm';
import { BuildRequestSummary } from './components/BuildRequestSummary';
import { BuildConfirmation } from './components/BuildConfirmation';
import { BuildContextProvider, useBuildContext } from './context/BuildContext';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import './BuildProduct.css';

function BuildProductContent() {
  const navigate = useNavigate();
  const {
    selectedPath,
    isBuildSubmitted,
    isSprintSubmitted,
    submitRequest,
    resetBuildRequest,
    resetSprintRequest,
  } = useBuildContext();

  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isReviewingSummary, setIsReviewingSummary] = useState(false);

  /* 1-second Build World Transition Effect on Mount */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const isCurrentPathSubmitted =
    (selectedPath === 'build_product' && isBuildSubmitted) ||
    (selectedPath === 'reality_sprint' && isSprintSubmitted);

  const handleSelectBuildProduct = () => {
    setIsReviewingSummary(false);
    setTimeout(() => {
      const el = document.getElementById('build-request-form');
      if (el) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }, 100);
  };

  const handleSelectRealitySprint = () => {
    setIsReviewingSummary(false);
    setTimeout(() => {
      const el = document.getElementById('reality-sprint-form');
      if (el) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }, 100);
  };

  const handleProceedToSummary = () => {
    setIsReviewingSummary(true);
    setTimeout(() => {
      const el = document.getElementById('build-request-summary');
      if (el) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }, 100);
  };

  const handleBackToEdit = () => {
    setIsReviewingSummary(false);
    setTimeout(() => {
      const targetId = selectedPath === 'reality_sprint' ? 'reality-sprint-form' : 'build-request-form';
      const el = document.getElementById(targetId);
      if (el) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }, 100);
  };

  const handleSubmitFinal = async () => {
    const result = await submitRequest();

    if (result.requiresAuth) {
      toast.info('Please sign in or create an account to submit your request.');
      navigate('/login', {
        state: {
          from: { pathname: '/build-product' },
          resumeRealitySprint: selectedPath === 'reality_sprint',
          resumeBuildRequest: selectedPath === 'build_product',
        },
      });
      return;
    }

    if (result.success) {
      setIsReviewingSummary(false);
      setTimeout(() => {
        const el = document.getElementById('build-confirmation');
        if (el) {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      }, 100);
    }
  };

  const handleResetCurrent = () => {
    setIsReviewingSummary(false);
    if (selectedPath === 'reality_sprint') {
      resetSprintRequest();
    } else {
      resetBuildRequest();
    }
  };

  return (
    <div className="v2r-build-page">
      <CinematicTransitionOverlay isVisible={isTransitioning} message="Entering Vision2Real…" />

      <div className="v2r-build-page__glow" aria-hidden="true" />

      <Container>
        {/* HERO SECTION */}
        <BuildHeroSection />

        {/* JOURNEY SELECTION ENTRY POINT */}
        <ChooseJourneySection
          onSelectBuildProduct={handleSelectBuildProduct}
          onSelectRealitySprint={handleSelectRealitySprint}
        />

        {/* INDEPENDENT FLOW 1: BUILD MY PRODUCT */}
        {selectedPath === 'build_product' && !isBuildSubmitted && !isReviewingSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <BuildRequestForm onProceedToSummary={handleProceedToSummary} />
          </motion.div>
        )}

        {/* INDEPENDENT FLOW 2: REALITY SPRINT */}
        {selectedPath === 'reality_sprint' && !isSprintSubmitted && !isReviewingSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RealitySprintForm onProceedToSummary={handleProceedToSummary} />
          </motion.div>
        )}

        {/* SUMMARY REVIEW FOR ACTIVE JOURNEY */}
        {selectedPath !== null && !isCurrentPathSubmitted && isReviewingSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <BuildRequestSummary
              onBackToEdit={handleBackToEdit}
              onSubmitFinal={handleSubmitFinal}
            />
          </motion.div>
        )}

        {/* CONFIRMATION FOR ACTIVE JOURNEY */}
        {isCurrentPathSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <BuildConfirmation onReset={handleResetCurrent} />
          </motion.div>
        )}
      </Container>
    </div>
  );
}

export function BuildProductPage() {
  return (
    <BuildContextProvider>
      <BuildProductContent />
    </BuildContextProvider>
  );
}

export default BuildProductPage;
