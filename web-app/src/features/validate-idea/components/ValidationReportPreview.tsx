/**
 * Vision2Real – Expanded Validation Report Preview Component
 * Includes Executive Summary, Detailed Multi-Specialist Report (7 Sections),
 * Evidence-Based Recommendations, and PDF Report Export.
 */

import { Button } from '@/components/ui/Button';
import { generateReportPdf } from '@/utils/pdfGenerator';
import type { ValidationReportPreviewData, ModuleRecommendation } from '@/types/validation';

interface ValidationReportPreviewProps {
  report: ValidationReportPreviewData;
  recommendations: ModuleRecommendation[];
  ideaText: string;
}

export function ValidationReportPreview({
  report,
  recommendations,
  ideaText,
}: ValidationReportPreviewProps) {
  const getConfidenceClass = (confidence: string) => {
    if (confidence === 'High Confidence') return 'v2r-confidence-badge--high';
    if (confidence === 'Moderate Confidence') return 'v2r-confidence-badge--moderate';
    return 'v2r-confidence-badge--exploratory';
  };

  const handleDownloadPdf = () => {
    generateReportPdf(report, recommendations, ideaText);
  };

  const detailed = report.detailedReport || {
    ideaStructuring: report.currentAssessment,
    marketResearch: report.marketPotential,
    competitionAnalysis: report.competition,
    customerAnalysis: report.keyStrength,
    productFeasibility: report.currentAssessment,
    redAgentAnalysis: report.biggestRisk,
    validationStrategy: report.recommendedNextStep,
  };

  return (
    <div className="v2r-report-preview" id="report-preview">
      {/* Header & PDF Download Action */}
      <div className="v2r-report-header">
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-wider)' }}>
            AI MULTI-SPECIALIST DOSSIER
          </span>
          <h2 className="v2r-report-header__title">Validation Report &amp; Analysis</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div className={`v2r-confidence-badge ${getConfidenceClass(report.confidence)}`}>
            <span>● {report.confidence}</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download PDF Report</span>
          </Button>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-md)' }}>
          Executive Summary
        </h3>

        <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'inline-block', background: 'rgba(109, 93, 246, 0.12)', border: '1px solid rgba(109, 93, 246, 0.3)', color: 'var(--color-accent)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xs)', padding: 'var(--space-3xs) var(--space-sm)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-md)' }}>
            VERDICT: {report.overallVerdict || report.confidence}
          </div>

          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-lg)' }}>
            {report.aiSummary}
          </p>

          <div className="v2r-report-grid">
            <div className="v2r-report-card">
              <div className="v2r-report-card__label">Biggest Opportunity</div>
              <p className="v2r-report-card__content">{report.biggestOpportunity || report.keyStrength}</p>
            </div>

            <div className="v2r-report-card">
              <div className="v2r-report-card__label" style={{ color: 'var(--color-error)' }}>
                Biggest Execution Risk
              </div>
              <p className="v2r-report-card__content">{report.biggestRisk}</p>
            </div>

            <div className="v2r-report-card">
              <div className="v2r-report-card__label">Confidence Rating</div>
              <p className="v2r-report-card__content">{report.confidence}</p>
            </div>

            <div className="v2r-report-card">
              <div className="v2r-report-card__label">Recommended Next Step</div>
              <p className="v2r-report-card__content">{report.recommendedNextStep || 'Build Product'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DETAILED VALIDATION REPORT (MULTI-SPECIALIST FINDINGS) */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-md)' }}>
          Detailed Validation Report (Multi-Specialist Findings)
        </h3>

        <div className="v2r-report-grid">
          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">01 — Idea Structuring Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.ideaStructuring}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">02 — Market Research Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.marketResearch}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">03 — Competition Analysis Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.competitionAnalysis}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">04 — Customer Analysis Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.customerAnalysis}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">05 — Product &amp; Feasibility Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.productFeasibility}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <div className="v2r-report-card__label" style={{ color: 'var(--color-error)' }}>
              06 — Red Agent Adversarial Specialist
            </div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.redAgentAnalysis}</p>
          </div>

          <div className="v2r-report-card v2r-report-card--full">
            <div className="v2r-report-card__label">07 — Validation Strategy Specialist</div>
            <p className="v2r-report-card__content" style={{ whiteSpace: 'pre-line' }}>{detailed.validationStrategy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
