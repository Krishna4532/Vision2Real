/**
 * Vision2Real – About Vision2Real Cinematic Experience
 * A scroll-driven storytelling experience that introduces Vision2Real,
 * builds founder trust, explains the ecosystem, integrates Pricing and Contact,
 * and guides founders toward Validate My Idea and Build My Product.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { PremiumHero } from '@/components/premiumHero/PremiumHero';
import { CinematicTransitionOverlay } from '@/components/ui/CinematicTransitionOverlay';
import './About.css';

/* ─────────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────────── */

const NAV_SECTIONS = [
  { id: 'about-hero', label: 'Overview' },
  { id: 'about-problem', label: 'The Problem' },
  { id: 'about-philosophy', label: 'Philosophy' },
  { id: 'about-journey', label: 'Journey' },
  { id: 'about-services', label: 'Services' },
  { id: 'about-why-choose', label: 'Why Us' },
  { id: 'about-process', label: 'Process' },
  { id: 'about-commitment', label: 'Commitment' },
  { id: 'about-pricing', label: 'Pricing' },
  { id: 'about-faq', label: 'FAQ' },
  { id: 'about-contact', label: 'Contact' },
];

const PHILOSOPHY_CARDS = [
  {
    num: '01',
    title: 'Validation Before Building',
    desc: 'We believe no founder should spend months building a product only to discover no one wants it. Validate first. Build with confidence.',
  },
  {
    num: '02',
    title: 'AI-Assisted, Human-Guided',
    desc: 'Our AI specialists perform deep analysis, but real human expertise shapes every recommendation. Intelligence without wisdom is noise.',
  },
  {
    num: '03',
    title: 'Radical Transparency',
    desc: "We tell you the truth about your idea, even when it's hard. Honest insight today saves months of wasted effort tomorrow.",
  },
  {
    num: '04',
    title: 'Founder-First Design',
    desc: 'Every product decision is made to serve the founder experience. Speed, clarity, and depth — not bloated dashboards.',
  },
];

const JOURNEY_STEPS = [
  { label: 'Your Idea', desc: 'You arrive with a startup idea, a hypothesis, or a problem you want to solve.' },
  { label: 'Validate My Idea', desc: 'AI specialists analyze market size, competition, technical feasibility, and business viability.' },
  { label: 'Validation Report', desc: 'You receive a detailed, multi-specialist report with scores, risks, and recommendations.' },
  { label: 'Reality Sprint (Optional)', desc: 'Rapid product definition that bridges validation insight to a concrete build plan.' },
  { label: 'Build My Product', desc: 'Expert engineering and design team translates your vision into a production-ready product.' },
  { label: 'Founder Workspace', desc: 'Manage all your ideas, reports, sprints, and build requests in one place.' },
  { label: 'Launch', desc: 'Go to market with confidence, knowing your product is validated, designed, and built to last.' },
];

const SERVICES = [
  {
    badge: 'Core Product',
    title: 'Validate My Idea',
    desc: 'Submit your startup idea and receive a comprehensive AI-powered validation report from five specialist perspectives: Market, Technical, Financial, Competitive, and Legal.',
    meta: [
      { label: 'Turnaround', value: '< 3 minutes' },
      { label: 'Specialists', value: '5 AI Agents' },
      { label: 'Report Format', value: 'Detailed PDF + Preview' },
    ],
    tech: ['AI Analysis', 'Market Research', 'Competitive Intelligence'],
    cta: 'Validate My Idea',
    href: '/validate-idea',
    highlight: true,
  },
  {
    badge: 'Build Journey',
    title: 'Build My Product',
    desc: 'Work with our expert team to scope, design, and build your validated product. From wireframes to production deployment.',
    meta: [
      { label: 'Timeline', value: 'Custom' },
      { label: 'Engagement', value: 'Full-service' },
      { label: 'Stack', value: 'Modern & Scalable' },
    ],
    tech: ['React', 'TypeScript', 'FastAPI', 'Cloud-native'],
    cta: 'Start Building',
    href: '/build-product',
    highlight: false,
  },
  {
    badge: 'Fast Track',
    title: 'Reality Sprint',
    desc: 'An intensive, focused engagement that takes your validated idea and produces a detailed product spec, architecture, and prototype in weeks, not months.',
    meta: [
      { label: 'Duration', value: '2–4 Weeks' },
      { label: 'Deliverable', value: 'Product Blueprint' },
      { label: 'Outcome', value: 'Build-Ready Spec' },
    ],
    tech: ['Product Strategy', 'UX Design', 'Architecture'],
    cta: 'Explore Sprint',
    href: '/build-product',
    highlight: false,
  },
];

const WHY_FEATURES = [
  { icon: '⚡', title: 'Speed Without Sacrifice', desc: 'Validation in minutes, not weeks. We use AI to compress timelines without sacrificing depth.' },
  { icon: '🎯', title: 'Multi-Specialist Depth', desc: 'Five AI agents, each an expert in their domain, analyze your idea from every angle.' },
  { icon: '🔍', title: 'Honest Insights', desc: "We don't sugarcoat. If your idea has serious risks, we'll tell you — and show you how to de-risk." },
  { icon: '🏗️', title: 'End-to-End Ecosystem', desc: 'From first idea to launch, one platform handles everything — no fragmented tools.' },
  { icon: '🔒', title: 'Founder-First Privacy', desc: 'Your ideas stay yours. We never share, sell, or train on your submitted ideas.' },
  { icon: '🌐', title: 'Modern Tech Stack', desc: 'Built with React, TypeScript, FastAPI, and cloud-native infrastructure for scale.' },
  { icon: '📊', title: 'Actionable Reports', desc: 'Not just scores — but recommendations, risk maps, and next steps you can act on immediately.' },
  { icon: '🤝', title: 'Human Accountability', desc: 'AI performs the analysis, but a real team stands behind every recommendation.' },
];

const PROCESS_NODES = [
  'Idea Ingestion & Parsing',
  'Market Size Analysis',
  'Competitive Landscape Mapping',
  'Technical Feasibility Assessment',
  'Financial Viability Scoring',
  'Legal & Regulatory Review',
  'Risk Synthesis & Recommendations',
  'Report Generation & Delivery',
];

const APPROACH_STEPS = [
  { icon: '📝', title: 'Submit', desc: 'Describe your idea in plain language. No templates, no jargon.' },
  { icon: '🔬', title: 'Analyze', desc: 'Five AI specialists execute parallel deep analysis pipelines.' },
  { icon: '📊', title: 'Synthesize', desc: 'Findings are cross-referenced and weighted for accuracy.' },
  { icon: '📄', title: 'Report', desc: 'A detailed, structured report is generated with clear verdicts.' },
  { icon: '🚀', title: 'Act', desc: 'You receive concrete next steps — validate, pivot, or build.' },
];

const COMMITMENTS = [
  { strong: 'We will never build for the sake of building.', rest: ' Every engagement starts with a validated foundation.' },
  { strong: 'We will always be honest about risks.', rest: " Even if it's not what you want to hear." },
  { strong: 'We will keep your ideas confidential.', rest: ' Your intellectual property is yours, always.' },
  { strong: 'We will respect your time.', rest: ' Validation in minutes. Builds scoped before they start.' },
  { strong: 'We will stay current.', rest: ' Our AI models and market data are continuously updated.' },
  { strong: 'We will grow with you.', rest: ' From first idea to funded startup, Vision2Real scales with your journey.' },
];

const PRICING_CARDS = [
  {
    title: 'Validate My Idea',
    price: 'Free',
    priceSuffix: '',
    desc: "Validate your startup idea using Vision2Real's multi-specialist AI validation engine. Receive a comprehensive validation report with AI insights, strengths, risks, and recommended next steps.",
    badge: '',
    features: [
      'Full 5-specialist AI analysis',
      'Instant validation report',
      'Strengths & risk assessment',
      'Recommended next steps',
    ],
    cta: 'Validate My Idea',
    href: '/validate-idea',
    highlight: false,
    additionalText: '',
  },
  {
    title: 'Reality Sprint',
    price: 'Starts from ₹5,000',
    priceSuffix: '',
    desc: 'Validate one critical user journey before investing in full product development. Perfect for testing assumptions, reducing risk, and gaining early founder or investor confidence.',
    badge: '2–3 Day Delivery',
    features: [
      'Single critical journey focus',
      'Test key product assumptions',
      'Reduce build risk dramatically',
      'Early investor/founder confidence',
    ],
    cta: 'Start Reality Sprint',
    href: '/build-product',
    highlight: true,
    additionalText: '',
  },
  {
    title: 'Build My Product',
    price: 'Custom Proposal',
    priceSuffix: '',
    desc: 'End-to-end product design and development tailored to your requirements. Pricing depends on project scope, complexity, and features and is discussed after understanding your product vision.',
    badge: '',
    features: [
      'Full-stack engineering & UI/UX',
      'Tailored scope & architecture',
      'Cloud deployment & scaling',
      'Dedicated partner team',
    ],
    cta: 'Build My Product',
    href: '/build-product',
    highlight: false,
    additionalText: 'Negotiable based on your project requirements.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How is Vision2Real different from other AI tools?',
    a: "Most AI tools give you generic answers. Vision2Real uses five purpose-built specialist agents — each trained on domain-specific knowledge — to give you a multi-dimensional, actionable validation report. We also connect validation to building, creating a complete end-to-end founder journey.",
  },
  {
    q: 'Is my idea secure when I submit it?',
    a: "Absolutely. Your idea is never shared with third parties, used to train AI models, or stored beyond your session without your consent. Your intellectual property remains yours at all times.",
  },
  {
    q: 'How long does validation take?',
    a: "Most validation reports are generated in under 3 minutes. Complex ideas with multiple dimensions may take slightly longer, but you'll always see live progress as each specialist completes their analysis.",
  },
  {
    q: 'What if my idea gets a low score?',
    a: "A low score is valuable signal, not a dead end. Our reports include specific risk factors and improvement recommendations. Many successful products emerged from initial ideas that were significantly refined based on honest validation.",
  },
  {
    q: 'Can I validate multiple ideas?',
    a: "Yes. Each validation report is a separate purchase. You can validate as many ideas as you need, and all reports are stored in your Founder Workspace for easy reference.",
  },
  {
    q: 'What happens after the Reality Sprint?',
    a: "You receive a complete product blueprint that is ready to hand off to any development team — including ours. The sprint deliverables are designed to be implementation-ready, not just theoretical.",
  },
  {
    q: 'Do you work with non-technical founders?',
    a: "We were built for non-technical founders. You don't need to understand technology to use Vision2Real. Our tools speak plain language, and our team handles all technical complexity on your behalf.",
  },
];

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */



function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <motion.div
      className="v2r-scroll-progress"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

function BackToTopButton({ visible }: { visible: boolean }) {
  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="v2r-back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <svg
            className="v2r-back-to-top__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function StickySubNav({ activeSection }: { activeSection: string }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="v2r-sticky-subnav" role="navigation" aria-label="Page sections">
      <div className="v2r-sticky-subnav__inner">
        <div className="v2r-sticky-subnav__list">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`v2r-sticky-subnav__link ${activeSection === s.id ? 'v2r-sticky-subnav__link--active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ badge, title, sub }: { badge?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 0 }}>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 'var(--space-3xs) var(--space-md)',
            background: 'rgba(109,93,246,0.08)',
            border: '1px solid rgba(109,93,246,0.25)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-accent)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-md)',
          }}
        >
          {badge}
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.05 }}
        style={{
          fontSize: 'clamp(var(--text-2xl), 4vw, var(--text-4xl))',
          fontWeight: 'var(--weight-extrabold)',
          lineHeight: 'var(--leading-tight)',
          letterSpacing: 'var(--tracking-tighter)',
          color: 'var(--color-text-primary)',
          marginBottom: sub ? 'var(--space-md)' : 0,
        }}
      >
        {title}
      </motion.h2>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: 'clamp(var(--text-sm), 2vw, var(--text-base))',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: '40rem',
            margin: '0 auto',
          }}
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.style.maxHeight = open ? `${panelRef.current.scrollHeight}px` : '0';
    }
  }, [open]);

  return (
    <div className={`v2r-faq-item ${open ? 'v2r-faq-item--open' : ''}`}>
      <button
        className="v2r-faq-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <svg
          className="v2r-faq-trigger__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div className="v2r-faq-panel" ref={panelRef}>
        <div className="v2r-faq-panel__content">{a}</div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim() || form.message.trim().length < 20) e.message = 'Please write at least 20 characters';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="v2r-form-success">
        <div className="v2r-form-success__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="v2r-form-success__title">Message Sent!</div>
        <p className="v2r-form-success__text">
          Thank you for reaching out. We'll get back to you within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form className="v2r-contact-form" onSubmit={handleSubmit} noValidate>
      <div className="v2r-form-group">
        <label className="v2r-form-group__label" htmlFor="contact-name">Full Name</label>
        <input
          id="contact-name"
          className="v2r-form-input"
          type="text"
          placeholder="Jane Doe"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoComplete="name"
        />
        {errors.name && <span className="v2r-form-error">{errors.name}</span>}
      </div>
      <div className="v2r-form-group">
        <label className="v2r-form-group__label" htmlFor="contact-email">Email Address</label>
        <input
          id="contact-email"
          className="v2r-form-input"
          type="email"
          placeholder="jane@startup.io"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
        />
        {errors.email && <span className="v2r-form-error">{errors.email}</span>}
      </div>
      <div className="v2r-form-group">
        <label className="v2r-form-group__label" htmlFor="contact-subject">Subject</label>
        <input
          id="contact-subject"
          className="v2r-form-input"
          type="text"
          placeholder="I'd like to learn more about..."
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        {errors.subject && <span className="v2r-form-error">{errors.subject}</span>}
      </div>
      <div className="v2r-form-group">
        <label className="v2r-form-group__label" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          className="v2r-form-textarea"
          placeholder="Tell us about your idea, your question, or how we can help..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        {errors.message && <span className="v2r-form-error">{errors.message}</span>}
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        className="v2r-contact-form__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  );
}

function AnimatedProcessPipeline() {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((n) => (n + 1) % PROCESS_NODES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="v2r-process-visual">
      <div className="v2r-process-nodes-container">
        {PROCESS_NODES.map((node, i) => (
          <div
            key={node}
            className={`v2r-process-pipe-node ${i === activeNode ? 'v2r-process-pipe-node--active' : ''}`}
          >
            <div className="v2r-process-pipe-indicator" />
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

function JourneyTimeline() {
  const [activeStep, setActiveStep] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let step = 0;
          const interval = setInterval(() => {
            setActiveStep(step);
            if (lineRef.current) {
              lineRef.current.style.height = `${((step + 1) / JOURNEY_STEPS.length) * 100}%`;
            }
            step++;
            if (step >= JOURNEY_STEPS.length) clearInterval(interval);
          }, 350);
        }
      },
      { threshold: 0.2 }
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="v2r-journey-timeline-wrapper" ref={wrapperRef}>
      <div className="v2r-journey-line">
        <div className="v2r-journey-line-fill" ref={lineRef} style={{ height: '0%' }} />
      </div>
      {JOURNEY_STEPS.map((step, i) => (
        <motion.div
          key={step.label}
          className={`v2r-journey-node ${i <= activeStep ? 'v2r-journey-node--active' : ''}`}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.07 }}
        >
          <div className={`v2r-journey-dot ${i <= activeStep ? 'v2r-journey-dot--active' : ''}`}>
            <div className="v2r-journey-dot__inner" />
          </div>
          <div className="v2r-journey-node-content">
            <div className="v2r-journey-node__title">{step.label}</div>
            <div className="v2r-journey-node__desc">{step.desc}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */

export function AboutPage() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState('about-hero');

  /* Cinematic page transition on mount */
  useEffect(() => {
    const timer = setTimeout(() => setIsTransitioning(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  /* Back to top visibility */
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Active section tracking via IntersectionObserver */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [isTransitioning]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }, []);

  return (
    <div className="v2r-about-page">
      {/* ── Cinematic Transition Overlay ── */}
      <CinematicTransitionOverlay isVisible={isTransitioning} message="Entering Vision2Real…" />

      {/* ── Scroll Progress Bar ── */}
      <ScrollProgressBar />

      {/* ── Background Glows ── */}
      <div className="v2r-about-page__glow v2r-about-page__glow--1" aria-hidden="true" />
      <div className="v2r-about-page__glow v2r-about-page__glow--2" aria-hidden="true" />
      <div className="v2r-about-page__glow v2r-about-page__glow--3" aria-hidden="true" />

      {/* ── Back To Top ── */}
      <BackToTopButton visible={showBackToTop} />

      {/* ═══════════════════════════════════════════════════
          S1: Cinematic Hero
      ═══════════════════════════════════════════════════ */}
      <PremiumHero
        id="about-hero"
        badge="ABOUT VISION2REAL"
        heading={
          <>
            We Turn Visions{' '}
            <span style={{ color: 'var(--v2r-violet)' }}>Into Reality</span>
          </>
        }
        description="Vision2Real is an AI + Human Expertise-powered platform that helps founders validate startup ideas, plan with clarity, and build products that people actually want. From first insight to production launch — one coherent ecosystem."
        primaryAction={{
          label: 'Validate My Idea',
          onClick: () => navigate('/validate'),
        }}
        secondaryAction={{
          label: 'Explore the Journey',
          onClick: () => scrollTo('about-journey'),
        }}
      />

      {/* ── Sticky Sub-Navigation ── */}
      <StickySubNav activeSection={activeSection} />

      {/* ═══════════════════════════════════════════════════
          S2: The Problem We Solve
      ═══════════════════════════════════════════════════ */}
      <section id="about-problem" className="v2r-about-problem">
        <Container>
          <SectionHeading badge="The Problem" title="Why Most Startups Fail Before They Launch" />

          <div className="v2r-about-problem__flow" aria-hidden="true">
            {['You have an idea', 'You build for months', 'You launch', 'No one comes'].map((node, i) => (
              <motion.div
                key={node}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className={`v2r-problem-node ${i === 3 ? 'v2r-problem-node--highlight' : ''}`}>
                  {node}
                </div>
                {i < 3 && (
                  <svg className="v2r-problem-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                )}
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="v2r-problem-punchline"
          >
            42% of startups fail because there's no market need.
            <span>We exist to change that statistic.</span>
          </motion.p>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S3: Why Vision2Real Exists
      ═══════════════════════════════════════════════════ */}
      <section id="about-why-exists" className="v2r-about-why-exists">
        <Container>
          <SectionHeading badge="Our Mission" title="Built for Founders Who Think Before They Build" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="v2r-why-exists-card"
            style={{ marginTop: 'var(--space-3xl)' }}
          >
            <p className="v2r-why-exists-card__text">
              Vision2Real was founded on a simple belief:{' '}
              <span className="v2r-why-exists-card__strong">
                founders deserve the truth before investing months building products.
              </span>{' '}
              We're not replacing founders — we're giving them superpowers. Our AI specialist team
              performs the kind of deep, multi-dimensional market research that used to require weeks
              of consulting fees and insider networks. Now it takes minutes.
            </p>
            <p className="v2r-why-exists-card__text" style={{ marginBottom: 0 }}>
              We believe in{' '}
              <span className="v2r-why-exists-card__strong">building with evidence, not assumption.</span>{' '}
              Every product on this platform — Validate My Idea, Reality Sprint, Build My Product — 
              exists to give founders the clarity and confidence to make great decisions.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S4: Philosophy
      ═══════════════════════════════════════════════════ */}
      <section id="about-philosophy" className="v2r-about-philosophy">
        <Container>
          <SectionHeading
            badge="Our Philosophy"
            title="Four Principles That Drive Everything We Build"
            sub="These aren't values on a wall. They're product decisions, design choices, and business constraints we live by every day."
          />
          <div className="v2r-philosophy-grid">
            {PHILOSOPHY_CARDS.map((card, i) => (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="v2r-philosophy-card"
              >
                <span className="v2r-philosophy-card__num">{card.num}</span>
                <h3 className="v2r-philosophy-card__title">{card.title}</h3>
                <p className="v2r-philosophy-card__desc">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S5: The Founder Journey
      ═══════════════════════════════════════════════════ */}
      <section id="about-journey" className="v2r-about-journey">
        <Container>
          <SectionHeading
            badge="The Journey"
            title="From Idea to Launch — One Coherent Path"
            sub="Vision2Real is designed as a complete ecosystem. Every step connects to the next."
          />
          <JourneyTimeline />
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S6: What We Offer (Services)
      ═══════════════════════════════════════════════════ */}
      <section id="about-services" className="v2r-about-services">
        <Container>
          <SectionHeading
            badge="Our Products"
            title="Three Ways We Help Founders Win"
            sub="Each product is designed to serve a specific stage of your founder journey — and all three connect seamlessly."
          />
          <div className="v2r-services-grid">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`v2r-service-card ${service.highlight ? 'v2r-service-card--highlight' : ''}`}
              >
                <div className="v2r-service-card__badge">{service.badge}</div>
                <h3 className="v2r-service-card__title">{service.title}</h3>
                <p className="v2r-service-card__desc">{service.desc}</p>
                <div className="v2r-service-card__meta">
                  {service.meta.map((m) => (
                    <div key={m.label} className="v2r-service-card__meta-item">
                      {m.label}: <span>{m.value}</span>
                    </div>
                  ))}
                </div>
                <div className="v2r-service-tech">
                  {service.tech.map((t) => (
                    <span key={t} className="v2r-service-tech-pill">{t}</span>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    variant={service.highlight ? 'primary' : 'outline'}
                    size="sm"
                    className="v2r-service-card__cta"
                    onClick={() => navigate(service.href)}
                  >
                    {service.cta}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S7: Why Choose Us
      ═══════════════════════════════════════════════════ */}
      <section id="about-why-choose" className="v2r-about-why-choose">
        <Container>
          <SectionHeading
            badge="Why Vision2Real"
            title="What Makes Us Different"
            sub="We don't just validate ideas. We help you make better decisions, faster, with more confidence."
          />
          <div className="v2r-features-grid">
            {WHY_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="v2r-feature-card"
              >
                <div className="v2r-feature-card__icon-wrap" aria-hidden="true">
                  <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                </div>
                <h3 className="v2r-feature-card__title">{f.title}</h3>
                <p className="v2r-feature-card__desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S8: Behind the Recommendation (Process)
      ═══════════════════════════════════════════════════ */}
      <section id="about-process" className="v2r-about-process">
        <Container>
          <SectionHeading
            badge="Under the Hood"
            title="What Happens When You Submit an Idea"
            sub="Our AI pipeline doesn't just generate text. It runs structured, specialist-level analysis across eight distinct research dimensions."
          />
          <div className="v2r-process-pipeline">
            <AnimatedProcessPipeline />
            <div className="v2r-process-narrative">
              <p className="v2r-process-paragraph">
                When you submit your idea, it flows through our{' '}
                <strong>eight-stage analysis pipeline</strong>. Each stage is handled by a purpose-built
                AI agent with access to real-time market data, competitive intelligence, and domain-specific
                research corpora.
              </p>
              <p className="v2r-process-paragraph">
                The agents don't run sequentially — they operate in <strong>parallel with synthesis checkpoints</strong>,
                so your report reflects a coherent, cross-referenced view of your idea, not just five
                independent opinions.
              </p>
              <p className="v2r-process-paragraph">
                The final output is a <strong>structured validation report</strong> with clear verdicts,
                confidence scores, risk maps, and actionable next steps — formatted for founders, not data scientists.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S9: Our Approach (5 Steps)
      ═══════════════════════════════════════════════════ */}
      <section id="about-approach" className="v2r-about-approach">
        <Container>
          <SectionHeading
            badge="Our Approach"
            title="Simple to Start. Powerful in Depth."
            sub="Five steps from idea to insight. No setup. No learning curve. Just answers."
          />
          <div className="v2r-approach-steps">
            {APPROACH_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="v2r-approach-step"
              >
                <div className="v2r-approach-step__icon-wrap" aria-hidden="true">
                  <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                </div>
                <h3 className="v2r-approach-step__title">{step.title}</h3>
                <p className="v2r-approach-step__desc">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S10: Our Commitment
      ═══════════════════════════════════════════════════ */}
      <section id="about-commitment" className="v2r-about-commitment">
        <Container>
          <SectionHeading
            badge="Our Commitment"
            title="Promises We Make to Every Founder"
            sub="These commitments are built into how we operate — not just written in a policy doc."
          />
          <div className="v2r-commitment-list">
            {COMMITMENTS.map((c, i) => (
              <motion.div
                key={c.strong}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="v2r-commitment-item"
              >
                <svg
                  className="v2r-commitment-item__bullet"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="v2r-commitment-item__text">
                  <strong>{c.strong}</strong>
                  {c.rest}
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S11: Pricing
      ═══════════════════════════════════════════════════ */}
      <section id="about-pricing" className="v2r-about-pricing">
        <Container>
          <SectionHeading
            badge="Pricing"
            title="Transparent Pricing. No Surprises."
            sub="Pay for what you use. Every product is scoped before you commit."
          />
          <div className="v2r-pricing-grid">
            {PRICING_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`v2r-pricing-card ${card.highlight ? 'v2r-pricing-card--highlight' : ''}`}
              >
                {card.badge && (
                  <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', background: 'rgba(109,93,246,0.15)', border: '1px solid rgba(109,93,246,0.3)', color: '#6D5DF6', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    {card.badge}
                  </div>
                )}
                <h3 className="v2r-pricing-card__title">{card.title}</h3>
                <div className="v2r-pricing-card__price-wrap">
                  <span className="v2r-pricing-card__price">
                    <span>{card.price}</span>
                  </span>
                  {card.priceSuffix && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-3xs)' }}>
                      {card.priceSuffix}
                    </span>
                  )}
                </div>
                <p className="v2r-pricing-card__desc">{card.desc}</p>
                <div className="v2r-pricing-card__features">
                  {card.features.map((feat) => (
                    <div key={feat} className="v2r-pricing-card__feature-item">
                      <svg
                        className="v2r-pricing-card__feature-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feat}
                    </div>
                  ))}
                </div>
                {card.additionalText && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                    {card.additionalText}
                  </p>
                )}
                <Button
                  variant={card.highlight ? 'primary' : 'outline'}
                  size="sm"
                  className="v2r-pricing-card__cta"
                  onClick={() => navigate(card.href)}
                >
                  {card.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S12: FAQ
      ═══════════════════════════════════════════════════ */}
      <section id="about-faq" className="v2r-about-faq">
        <Container>
          <SectionHeading
            badge="FAQ"
            title="Questions Founders Ask Us"
            sub="Honest answers to the things founders want to know before they commit."
          />
          <div className="v2r-faq-list">
            {FAQ_ITEMS.map((item) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <FAQItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S13: Contact
      ═══════════════════════════════════════════════════ */}
      <section id="about-contact" className="v2r-about-contact">
        <Container>
          <SectionHeading
            badge="Contact"
            title="Get In Touch"
            sub="Have a question, partnership inquiry, or just want to say hello? We read every message."
          />
          <div className="v2r-contact-grid">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="v2r-contact-info"
            >
              <div className="v2r-contact-card">
                <div className="v2r-contact-card__icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <div className="v2r-contact-card__title">Email</div>
                  <div className="v2r-contact-card__detail">
                    <a href="mailto:hello@vision2real.io" className="v2r-contact-card__link">
                      hello@vision2real.io
                    </a>
                  </div>
                </div>
              </div>
              <div className="v2r-contact-card">
                <div className="v2r-contact-card__icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div>
                  <div className="v2r-contact-card__title">Social</div>
                  <div className="v2r-contact-card__detail">
                    <a href="https://twitter.com/vision2real" target="_blank" rel="noopener noreferrer" className="v2r-contact-card__link">
                      @vision2real on X
                    </a>
                  </div>
                </div>
              </div>
              <div className="v2r-contact-card">
                <div className="v2r-contact-card__icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <div className="v2r-contact-card__title">Response Time</div>
                  <div className="v2r-contact-card__detail">Within 1–2 business days</div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="v2r-contact-form-wrap"
            >
              <ContactForm />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════════════════════════════════
          S14: Final CTA
      ═══════════════════════════════════════════════════ */}
      <section id="about-cta" className="v2r-about-cta">
        <div className="v2r-about-cta__glow" aria-hidden="true" />
        <Container>
          <div className="v2r-about-cta__content">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="v2r-about-cta__headline"
            >
              Ready to Turn Your Vision Into Reality?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="v2r-about-cta__subheadline"
            >
              Start with a validation. No credit card required to begin. No commitment until you're confident.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="v2r-about-cta__buttons"
            >
              <Button variant="primary" size="lg" onClick={() => navigate('/validate-idea')}>
                Validate My Idea
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/build-product')}>
                Build My Product
              </Button>
            </motion.div>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default AboutPage;
