import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FounderSidebar } from '@/features/founder/components/FounderSidebar';
import { FounderHeader } from '@/features/founder/components/FounderHeader';
import '@/features/founder/components/FounderLayout.css';

export function FounderLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Keyboard support: Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        closeMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Focus management on drawer open
  useEffect(() => {
    if (isMobileOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isMobileOpen]);

  return (
    <div className="v2r-workspace-shell">
      {/* Desktop Sidebar */}
      <div className="v2r-sidebar--desktop">
        <FounderSidebar />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="v2r-sidebar-mobile-wrapper">
            {/* Backdrop Overlay */}
            <motion.div
              className="v2r-sidebar-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeMobile}
              aria-hidden="true"
            />

            {/* Slide-in Drawer */}
            <motion.div
              ref={drawerRef}
              className="v2r-sidebar-mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Founder Navigation Drawer"
              tabIndex={-1}
            >
              <FounderSidebar onCloseMobile={closeMobile} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="v2r-workspace-main">
        <FounderHeader onOpenMobileMenu={() => setIsMobileOpen(true)} isMobileOpen={isMobileOpen} />
        <div className="v2r-workspace-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
