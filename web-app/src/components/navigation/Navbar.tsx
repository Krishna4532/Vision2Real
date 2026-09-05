/**
 * Vision2Real – Navbar Component
 * Minimal, dark luxury navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MobileMenu } from './MobileMenu';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { toast } from 'sonner';
import logoSvg from '@/assets/brand/logo.svg';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Validate My Idea', href: '/validate-idea' },
  { label: 'Build My Product', href: '/build-product' },
  { label: 'About', href: '/about' },
] as const;


export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('/');
  const navigate = useNavigate();
  const location = useLocation();

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 30);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  /* Active path/hash indicator */
  useEffect(() => {
    setActiveHash(location.pathname);
  }, [location]);

  const handleNavClick = (href: string) => {
    setIsMobileOpen(false);
    if (href.startsWith('/')) {
      navigate(href);
    } else {
      const id = href.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav
        className={`v2r-navbar ${isScrolled ? 'v2r-navbar--scrolled' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="v2r-navbar__inner">
          {/* Left: Logo & Links */}
          <div className="v2r-navbar__left">
            <a
              href="/"
              className="v2r-navbar__brand"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('/');
              }}
              aria-label="Vision2Real – Home"
            >
              <img src={logoSvg} alt="Vision2Real Logo" className="v2r-navbar__logo-img" />
              <span className="v2r-navbar__brand-text">Vision2Real</span>
            </a>

            <div className="v2r-navbar__links" role="menubar">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`v2r-navbar__link ${
                    activeHash === link.href ? 'v2r-navbar__link--active' : ''
                  }`}
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="v2r-navbar__actions">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/founder')}
                >
                  Founder Workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    toast.success('Logged out successfully');
                    navigate('/');
                  }}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={location.pathname === '/login' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Log In
                </Button>
                {location.pathname === '/signup' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleNavClick('/validate-idea')}
                  >
                    Get Started
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="v2r-navbar__hamburger"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="v2r-navbar__hamburger-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        links={NAV_LINKS as unknown as Array<{ label: string; href: string }>}
        activeHash={activeHash}
        onNavigate={handleNavClick}
      />
    </>
  );
}
