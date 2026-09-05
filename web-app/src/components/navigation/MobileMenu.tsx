/**
 * Vision2Real – Mobile Menu Component
 * Fullscreen dark luxury mobile navigation.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { toast } from 'sonner';
import logoSvg from '@/assets/brand/logo.svg';

interface NavLinkItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLinkItem[];
  activeHash: string;
  onNavigate: (href: string) => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  links,
  activeHash,
  onNavigate,
}: MobileMenuProps) {
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="mobile-menu"
          className="v2r-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="v2r-mobile-menu__header">
            <a
              href="#hero"
              className="v2r-navbar__brand"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('#hero');
              }}
            >
              <img src={logoSvg} alt="Vision2Real Logo" className="v2r-navbar__logo-img" />
              <span className="v2r-navbar__brand-text">Vision2Real</span>
            </a>
            <button
              className="v2r-mobile-menu__close"
              onClick={onClose}
              aria-label="Close menu"
            >
              <svg
                className="v2r-mobile-menu__close-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className="v2r-mobile-menu__nav" aria-label="Mobile Navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`v2r-mobile-menu__link ${
                  activeHash === link.href ? 'v2r-mobile-menu__link--active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.href);
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="v2r-mobile-menu__actions">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={() => onNavigate('/founder')}
                >
                  Founder Workspace
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    await logout();
                    toast.success('Logged out successfully');
                    onNavigate('/');
                  }}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={activeHash === '/login' ? 'primary' : 'ghost'}
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={() => onNavigate('/login')}
                >
                  Log In
                </Button>
                {activeHash === '/signup' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    style={{ width: '100%' }}
                    onClick={() => onNavigate('/signup')}
                  >
                    Sign Up
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    style={{ width: '100%' }}
                    onClick={() => onNavigate('/validate-idea')}
                  >
                    Get Started
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
