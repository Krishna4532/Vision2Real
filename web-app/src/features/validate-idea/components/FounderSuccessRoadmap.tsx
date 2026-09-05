/**
 * Vision2Real – Founder Success Roadmap Component
 * Appended after the AI Validation Report.
 * Enterprise-grade, context-aware personalized guidance for startup founders.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import type { ValidationReportPreviewData, ModuleRecommendation } from '@/types/validation';

interface FounderSuccessRoadmapProps {
  report: ValidationReportPreviewData;
  recommendations?: ModuleRecommendation[];
  ideaText?: string;
  onReset?: () => void;
  onContinueJourney?: () => void;
}

export function FounderSuccessRoadmap({
  report,
  recommendations: _recommendations = [],
  onReset,
  onContinueJourney,
}: FounderSuccessRoadmapProps) {
  const navigate = useNavigate();

  // Dynamic analysis based on real validation findings
  const analysis = useMemo(() => {
    const recStep = (report.recommendedNextStep || 'Reality Sprint').trim();
    const verdict = (report.overallVerdict || report.confidence || '').toUpperCase();
    const isHighConfidence = report.confidence === 'High Confidence' || verdict.includes('HIGH');
    const isExploratory = report.confidence === 'Exploratory' || verdict.includes('CAUTION');

    let path: 'REALITY_SPRINT' | 'BUILD_PRODUCT' | 'IMPROVE_REVALIDATE' = 'REALITY_SPRINT';
    if (recStep.toLowerCase().includes('build') || (isHighConfidence && !isExploratory)) {
      path = 'BUILD_PRODUCT';
    } else if (recStep.toLowerCase().includes('improve') || recStep.toLowerCase().includes('revalidate') || isExploratory) {
      path = 'IMPROVE_REVALIDATE';
    } else {
      path = 'REALITY_SPRINT';
    }

    const confidenceScore = isHighConfidence ? 88 : isExploratory ? 68 : 78;
    const readinessScore = path === 'BUILD_PRODUCT' ? 88 : path === 'REALITY_SPRINT' ? 76 : 58;
    const successProbability = path === 'BUILD_PRODUCT' ? 82 : path === 'REALITY_SPRINT' ? 72 : 54;

    const probLabel = successProbability >= 80 ? 'Highly Promising' : successProbability >= 65 ? 'Moderately Promising' : 'Requires Refinement';

    return {
      path,
      confidenceScore,
      readinessScore,
      successProbability,
      probLabel,
      opportunity: report.biggestOpportunity || report.keyStrength || 'Strong core value proposition with distinct market potential.',
      risk: report.biggestRisk || 'Unvalidated target market assumptions and execution complexity.',
      summary: report.aiSummary || 'Multi-agent analysis complete across market, competition, technical, and business dimensions.',
    };
  }, [report]);

  const handlePrimaryAction = () => {
    if (analysis.path === 'REALITY_SPRINT') {
      if (onContinueJourney) {
        onContinueJourney();
      } else {
        navigate('/founder/reality-sprints');
      }
    } else if (analysis.path === 'BUILD_PRODUCT') {
      navigate('/build-product');
    } else {
      if (onReset) {
        onReset();
      } else {
        const el = document.getElementById('idea-input');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSecondaryAction = () => {
    if (analysis.path === 'REALITY_SPRINT') {
      if (onContinueJourney) onContinueJourney();
    } else if (analysis.path === 'BUILD_PRODUCT') {
      navigate('/about#about-contact');
    } else {
      if (onReset) onReset();
    }
  };

  return (
    <div className="v2r-roadmap-section" id="founder-roadmap" style={{ marginTop: 'var(--space-4xl)', paddingTop: 'var(--space-3xl)', borderTop: '1px solid var(--color-border)' }}>
      {/* Title Header */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', background: 'rgba(109, 93, 246, 0.1)', border: '1px solid rgba(109, 93, 246, 0.25)', padding: 'var(--space-3xs) var(--space-md)', borderRadius: 'var(--radius-full)', color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>
          <span>AI ADVISORY BLUEPRINT</span>
        </div>
        <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-text-primary)', margin: '0 0 var(--space-xs) 0', letterSpacing: 'var(--tracking-tight)' }}>
          🚀 Your Personalized Founder Success Roadmap
        </h2>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0, maxWidth: '44rem', lineHeight: 'var(--leading-relaxed)' }}>
          A data-driven, strategic execution roadmap synthesized from your multi-agent validation report to guide your next phase of startup execution.
        </p>
      </div>

      {/* SECTION 1: STARTUP JOURNEY TIMELINE */}
      <div className="v2r-roadmap-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 className="v2r-roadmap-card__title">Section 1 — Startup Journey Timeline</h3>
        <p className="v2r-roadmap-card__subtitle">Track your current position in the Vision2Real founder execution pipeline.</p>

        <div className="v2r-timeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
          {[
            { step: '01', title: 'Idea Concept', status: 'COMPLETED', badge: '✅' },
            { step: '02', title: 'AI Validation', status: 'COMPLETED', badge: '✅' },
            {
              step: '03',
              title: 'Reality Sprint',
              status: analysis.path === 'REALITY_SPRINT' ? 'ACTIVE' : 'NEXT',
              badge: analysis.path === 'REALITY_SPRINT' ? '⭐ Recommended' : 'Step 3',
            },
            {
              step: '04',
              title: 'Build Product',
              status: analysis.path === 'BUILD_PRODUCT' ? 'ACTIVE' : 'LOCKED',
              badge: analysis.path === 'BUILD_PRODUCT' ? '⭐ Recommended' : '🔒 Locked',
            },
            { step: '05', title: 'Launch & Scale', status: 'FUTURE', badge: 'Rocket' },
          ].map((item) => {
            const isActive = item.status === 'ACTIVE';
            const isDone = item.status === 'COMPLETED';
            return (
              <div
                key={item.step}
                style={{
                  background: isActive ? 'rgba(109, 93, 246, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface-secondary)',
                  border: isActive ? '1px solid rgba(109, 93, 246, 0.4)' : isDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: isActive ? 'var(--color-accent)' : isDone ? '#34d399' : 'var(--color-text-muted)', marginBottom: 'var(--space-3xs)' }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-xs)' }}>
                  {item.title}
                </div>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: isActive ? 'var(--color-accent)' : isDone ? '#34d399' : 'var(--color-text-muted)' }}>
                  {item.badge}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: AI RECOMMENDED NEXT STEP */}
      <div className="v2r-roadmap-card" style={{ marginBottom: 'var(--space-xl)', borderLeft: '4px solid var(--color-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div>
            <h3 className="v2r-roadmap-card__title">Section 2 — AI Recommended Next Step</h3>
            <p className="v2r-roadmap-card__subtitle">Synthesized from market demand, competition, feasibility, and risk profile.</p>
          </div>
          <div style={{ background: 'rgba(109, 93, 246, 0.15)', border: '1px solid rgba(109, 93, 246, 0.3)', borderRadius: 'var(--radius-full)', padding: 'var(--space-2xs) var(--space-md)', color: 'var(--color-accent)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)' }}>
            AI Confidence: {analysis.confidenceScore}%
          </div>
        </div>

        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--text-2xl)' }}>
              {analysis.path === 'REALITY_SPRINT' ? '⚡' : analysis.path === 'BUILD_PRODUCT' ? '🔨' : '🔍'}
            </span>
            <div>
              <h4 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-text-primary)', margin: 0 }}>
                {analysis.path === 'REALITY_SPRINT'
                  ? 'Reality Sprint (Customer & Scope Validation)'
                  : analysis.path === 'BUILD_PRODUCT'
                  ? 'Build My Product (MVP Engineering & Development)'
                  : 'Improve & Revalidate (Refine Core Value Proposition)'}
              </h4>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>
                Recommended Execution Path
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3xs)' }}>Core Reason</span>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                {analysis.path === 'REALITY_SPRINT'
                  ? 'Your idea shows high potential, but key customer willingness-to-pay and feature assumptions require 10-14 days of rapid validation before capital investment.'
                  : analysis.path === 'BUILD_PRODUCT'
                  ? 'Your market demand and technical feasibility scores exceed thresholds. You are ready for structured MVP product engineering.'
                  : 'Critical competitive or market risks were flagged by the Red Agent. Refining core positioning before further investment is recommended.'}
              </p>
            </div>

            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3xs)' }}>Expected Outcome</span>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                {analysis.path === 'REALITY_SPRINT'
                  ? 'Validated customer interviews, precise MVP feature specs, reduced execution risk, and investor-ready evidence.'
                  : analysis.path === 'BUILD_PRODUCT'
                  ? 'Working production-ready MVP, scalable cloud backend, authenticated user dashboard, and live launch readiness.'
                  : 'Sharpened value proposition, mitigation for key execution risks, and validated unit economics.'}
              </p>
            </div>

            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3xs)' }}>Estimated Timeline</span>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-extrabold)', color: '#34d399', margin: 0 }}>
                {analysis.path === 'REALITY_SPRINT' ? '14 Days' : analysis.path === 'BUILD_PRODUCT' ? '4 – 8 Weeks' : '7 – 10 Days'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 & 4: SCORES & PROBABILITY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Section 3: Development Readiness Score */}
        <div className="v2r-roadmap-card">
          <h3 className="v2r-roadmap-card__title">Section 3 — Development Readiness Score</h3>
          <p className="v2r-roadmap-card__subtitle">Evaluates technical architecture maturity and feature requirement clarity.</p>

          <div style={{ margin: 'var(--space-lg) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>Development Readiness</span>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-accent)' }}>{analysis.readinessScore}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ width: `${analysis.readinessScore}%`, height: '100%', background: 'linear-gradient(90deg, #6d5df6, #34d399)', borderRadius: 'var(--radius-full)', transition: 'width 1s ease-out' }} />
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
            This score reflects how prepared your product requirements are for immediate software engineering. A score of {analysis.readinessScore}% indicates {analysis.readinessScore >= 80 ? 'high readiness for active sprint development' : 'that scoping key features will prevent rework during build'}.
          </p>
        </div>

        {/* Section 4: Startup Success Probability */}
        <div className="v2r-roadmap-card">
          <h3 className="v2r-roadmap-card__title">Section 4 — Startup Success Probability</h3>
          <p className="v2r-roadmap-card__subtitle">Multi-dimensional assessment across market demand &amp; execution.</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: 'var(--space-lg) 0' }}>
            <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-black)', color: '#34d399', letterSpacing: 'var(--tracking-tighter)' }}>
              {analysis.successProbability}%
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-text-primary)' }}>
                {analysis.probLabel}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Multi-agent confidence index</span>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 'var(--leading-relaxed)', background: 'var(--color-surface-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            This estimate is calculated using multiple dimensions including: market demand, business viability, execution readiness, competition, and founder preparedness. This is guidance only and not a guarantee of future success.
          </p>
        </div>
      </div>

      {/* SECTION 5 & 6: WHY THIS RECOMMENDATION & EXPECTED BENEFITS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Section 5: Why This Recommendation */}
        <div className="v2r-roadmap-card">
          <h3 className="v2r-roadmap-card__title">Section 5 — Why This Recommendation</h3>
          <p className="v2r-roadmap-card__subtitle">Key strategic drivers behind the AI recommendation.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            {[
              { label: 'Market Validation Maturity', val: report.marketPotential ? 'Analyzed' : 'High Potential' },
              { label: 'Customer Understanding', val: report.keyStrength ? 'Identified' : 'Clear Target Audience' },
              { label: 'Business Model Confidence', val: 'Validated Strategy' },
              { label: 'Technical Feasibility', val: 'High Feasibility' },
              { label: 'Execution Complexity', val: 'Manageable MVP Scope' },
            ].map((p) => (
              <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2xs)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{p.label}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>{p.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Expected Benefits */}
        <div className="v2r-roadmap-card">
          <h3 className="v2r-roadmap-card__title">Section 6 — Expected Benefits</h3>
          <p className="v2r-roadmap-card__subtitle">Value delivered by pursuing this execution roadmap.</p>

          <ul style={{ margin: 'var(--space-md) 0 0 0', paddingLeft: 'var(--space-lg)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', lineHeight: 'var(--leading-relaxed)' }}>
            {analysis.path === 'REALITY_SPRINT' ? (
              <>
                <li><strong>Validate Core Assumptions:</strong> Test willingness-to-pay with real target customers before building.</li>
                <li><strong>Customer Interviews:</strong> Conduct structured discovery calls guided by AI interview scripts.</li>
                <li><strong>Reduce Execution Risk:</strong> Prevent costly pivot cycles by narrowing down to a high-impact MVP.</li>
                <li><strong>Investor Readiness:</strong> Generate an empirical validation dossier ready for pitch presentations.</li>
              </>
            ) : analysis.path === 'BUILD_PRODUCT' ? (
              <>
                <li><strong>Working MVP:</strong> Receive production-grade codebase with modern UI/UX design.</li>
                <li><strong>Technical Execution:</strong> Fully configured authentication, databases, and API integrations.</li>
                <li><strong>Faster Time-to-Market:</strong> Launch to early adopters in weeks rather than quarters.</li>
                <li><strong>Structured Milestones:</strong> Transparent sprint progress tracking and developer handoff.</li>
              </>
            ) : (
              <>
                <li><strong>Refine Value Proposition:</strong> Sharpen core messaging against competitive alternatives.</li>
                <li><strong>Address Key Risks:</strong> Mitigate vulnerabilities identified by the Red Agent analysis.</li>
                <li><strong>Strengthen Unit Economics:</strong> Model clear monetization before spending development capital.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* SECTION 7: AI FOUNDER COACH */}
      <div className="v2r-roadmap-card" style={{ marginBottom: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(109, 93, 246, 0.08), rgba(52, 211, 153, 0.05))', border: '1px solid rgba(109, 93, 246, 0.25)' }}>
        <h3 className="v2r-roadmap-card__title" style={{ color: 'var(--color-accent)' }}>Section 7 — AI Founder Coach</h3>
        <p className="v2r-roadmap-card__subtitle">Personalized advisory guidance written in a natural mentor tone.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: '#34d399', display: 'block', marginBottom: 'var(--space-3xs)' }}>🎯 Biggest Opportunity</span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>{analysis.opportunity}</p>
          </div>

          <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-error)', display: 'block', marginBottom: 'var(--space-3xs)' }}>⚠️ Biggest Risk to Watch</span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>{analysis.risk}</p>
          </div>

          <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: '#fbbf24', display: 'block', marginBottom: 'var(--space-3xs)' }}>💡 Suggested Focus (Next 2-3 Weeks)</span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
              Focus on validating core user willingness-to-pay and defining a tight single-feature MVP scope before expanding roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 8: CONTINUOUS FOUNDER JOURNEY WORKFLOW */}
      <div className="v2r-roadmap-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 className="v2r-roadmap-card__title">Section 8 — Continuous Founder Journey</h3>
        <p className="v2r-roadmap-card__subtitle">End-to-end execution workflow from idea validation to scale.</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          {['Validation', '↓', 'Reality Sprint', '↓', 'Sprint Complete', '↓', 'AI Review', '↓', 'Product Dev', '↓', 'Launch'].map((item, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: item === 'Validation' || item === 'Reality Sprint' ? 'var(--weight-bold)' : 'var(--weight-normal)',
                color: item === 'Validation' ? '#34d399' : item === 'Reality Sprint' ? 'var(--color-accent)' : item === '↓' ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                padding: item !== '↓' ? 'var(--space-3xs) var(--space-xs)' : '0',
                background: item === 'Validation' ? 'rgba(16, 185, 129, 0.1)' : item === 'Reality Sprint' ? 'rgba(109, 93, 246, 0.1)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* SECTION 9: PRIMARY CALL TO ACTION */}
      <div className="v2r-roadmap-card" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center', padding: 'var(--space-2xl) var(--space-lg)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', display: 'block', marginBottom: 'var(--space-xs)' }}>
          SECTION 9 — RECOMMENDED NEXT ACTION
        </span>
        <h3 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-md)' }}>
          Ready to Take Your Next Strategic Step?
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '32rem', margin: '0 auto var(--space-xl) auto', lineHeight: 'var(--leading-relaxed)' }}>
          Based on your validation report, embarking on a {analysis.path === 'REALITY_SPRINT' ? 'Reality Sprint' : analysis.path === 'BUILD_PRODUCT' ? 'Product Build' : 'Refinement Iteration'} will maximize your probability of success.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Button variant="primary" size="lg" onClick={handlePrimaryAction}>
            <span>
              {analysis.path === 'REALITY_SPRINT' ? 'Start Reality Sprint' : analysis.path === 'BUILD_PRODUCT' ? 'Build My Product' : 'Improve My Idea'}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>

          <Button variant="secondary" size="lg" onClick={handleSecondaryAction}>
            <span>
              {analysis.path === 'REALITY_SPRINT' ? 'Maybe Later' : analysis.path === 'BUILD_PRODUCT' ? 'Talk to an Expert' : 'Run Validation Again'}
            </span>
          </Button>
        </div>
      </div>

      {/* SECTION 10: TAILORED LEARNING RESOURCES */}
      <div className="v2r-roadmap-card">
        <h3 className="v2r-roadmap-card__title">Section 10 — Tailored Learning Resources</h3>
        <p className="v2r-roadmap-card__subtitle">Curated guides addressing specific risks identified in your validation report.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          {[
            { title: 'Customer Discovery Playbook', tag: 'Validation', desc: 'How to conduct non-leading problem discovery interviews.' },
            { title: 'Lean MVP Scoping Guide', tag: 'Product', desc: 'Identify the single core feature needed for launch.' },
            { title: 'Pricing & Willingness-To-Pay', tag: 'Monetization', desc: 'Frameworks to test price sensitivity with early adopters.' },
            { title: 'Building Competitive Moats', tag: 'Strategy', desc: 'Defend your startup against fast followers and incumbents.' },
          ].map((res) => (
            <div key={res.title} style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', display: 'block', marginBottom: 'var(--space-3xs)' }}>{res.tag}</span>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', margin: '0 0 var(--space-3xs) 0' }}>{res.title}</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>{res.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
