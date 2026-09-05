import { motion, AnimatePresence } from 'motion/react';

interface CinematicTransitionOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function CinematicTransitionOverlay({ isVisible, message = 'Entering Vision2Real...' }: CinematicTransitionOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="v2r-build-transition-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: '#050505',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <motion.div
            className="v2r-build-transition-pulse"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #6D5DF6 0%, transparent 70%)',
              border: '2px solid #6D5DF6',
              boxShadow: '0 0 40px rgba(109, 93, 246, 0.6)',
            }}
          />
          <span style={{ color: '#8E8EA8', fontSize: '0.875rem', letterSpacing: '0.05em' }}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
