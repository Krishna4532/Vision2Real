/**
 * Vision2Real – Footer Component
 * Display logo, tagline ("From Vision to Reality."), and secondary site navigation.
 */

import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { env } from '@/config/env';
import logoSvg from '@/assets/brand/logo.svg';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const handleNavClick = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="v2r-footer" role="contentinfo">
      <Container>
        <div className="v2r-footer__grid">
          {/* Brand Column */}
          <div className="v2r-footer__brand">
            <a
              href="#hero"
              className="v2r-footer__logo-wrap"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('#hero');
              }}
              aria-label="Vision2Real – Home"
            >
              <img src={logoSvg} alt="Vision2Real Logo" className="v2r-footer__logo" />
              <span className="v2r-footer__brand-title">Vision2Real</span>
            </a>
            <p className="v2r-footer__tagline">
              From Vision to Reality.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="v2r-footer__col-title">Platform</h4>
            <div className="v2r-footer__links">
              <a
                href="#validate-idea"
                className="v2r-footer__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('validate-idea');
                }}
              >
                Validate My Idea
              </a>
              <a
                href="#build-product"
                className="v2r-footer__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('build-product');
                }}
              >
                Build My Product
              </a>
              <a
                href="#journey"
                className="v2r-footer__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('journey');
                }}
              >
                Idea → Reality Journey
              </a>
              <a
                href="#reality-sprint"
                className="v2r-footer__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('reality-sprint');
                }}
              >
                Reality Sprint
              </a>
            </div>
          </div>

          {/* Company & Product */}
          <div>
            <h4 className="v2r-footer__col-title">Company</h4>
            <div className="v2r-footer__links">
              <a
                href="#why-vision2real"
                className="v2r-footer__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('why-vision2real');
                }}
              >
                Why Vision2Real
              </a>
              <button className="v2r-footer__link" onClick={() => { navigate('/about'); window.scrollTo(0, 0); }}>
                Pricing
              </button>
              <button className="v2r-footer__link" onClick={() => { navigate('/about'); window.scrollTo(0, 0); }}>
                Services
              </button>
              <button className="v2r-footer__link" onClick={() => { navigate('/about'); window.scrollTo(0, 0); }}>
                About
              </button>
            </div>
          </div>

          {/* Resources & Contact */}
          <div>
            <h4 className="v2r-footer__col-title">Resources</h4>
            <div className="v2r-footer__links">
              <a href="#hero" className="v2r-footer__link">
                Blog
              </a>
              <a href="#hero" className="v2r-footer__link">
                Resources
              </a>
              <button className="v2r-footer__link" onClick={() => { navigate('/about'); window.scrollTo(0, 0); setTimeout(() => { document.getElementById('about-contact')?.scrollIntoView({ behavior: 'smooth' }); }, 400); }}>
                Contact
              </button>

              <a href="#hero" className="v2r-footer__link">
                Terms &amp; Privacy
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="v2r-footer__bottom">
          <div>© {currentYear} Vision2Real. All rights reserved.</div>
          <div className="v2r-footer__env-badge">
            <span>{env.appName}</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
