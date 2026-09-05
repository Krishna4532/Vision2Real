/**
 * Vision2Real – PDF Report Generator Utility
 * Generates a branded, investor-ready PDF document containing cover page,
 * executive summary, detailed multi-specialist findings, advisory recommendations,
 * confidentiality notices, and page numbering.
 */

import type { ValidationReportPreviewData, ModuleRecommendation } from '@/types/validation';

export function generateReportPdf(
  report: ValidationReportPreviewData,
  recommendations: ModuleRecommendation[],
  ideaText: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your Vision2Real PDF validation report.');
    return;
  }

  const generatedDate = report.generatedAt || new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const reportId = report.id || `V2R-VAL-${Math.floor(100000 + Math.random() * 900000)}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vision2Real AI Validation Report - ${reportId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Manrope', -apple-system, sans-serif;
      color: #111111;
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 11pt;
    }

    .pdf-header {
      position: fixed;
      top: -15mm;
      left: 0;
      right: 0;
      height: 10mm;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #6B7280;
      font-family: 'JetBrains Mono', monospace;
    }

    .pdf-footer {
      position: fixed;
      bottom: -15mm;
      left: 0;
      right: 0;
      height: 10mm;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #6B7280;
      font-family: 'JetBrains Mono', monospace;
    }

    .page-break {
      page-break-before: always;
    }

    /* ---- COVER PAGE ---- */
    .cover-page {
      height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-top: 20mm;
    }

    .brand-mark {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      background: #6D5DF6;
      border-radius: 8px;
    }

    .brand-title {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #050505;
    }

    .cover-main {
      margin-block: auto;
    }

    .cover-tag {
      display: inline-block;
      padding: 4px 12px;
      background: #F3F0FF;
      color: #6D5DF6;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
    }

    .cover-heading {
      font-size: 32pt;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.04em;
      color: #050505;
      margin-bottom: 24px;
    }

    .cover-idea-box {
      background: #F9FAFB;
      border-left: 4px solid #6D5DF6;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 32px;
      font-size: 11pt;
      color: #374151;
      font-style: italic;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      border-top: 1px solid #E5E7EB;
      padding-top: 24px;
    }

    .meta-item-label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #9CA3AF;
      letter-spacing: 0.05em;
    }

    .meta-item-value {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
      margin-top: 4px;
    }

    .cover-notice {
      font-size: 8pt;
      color: #9CA3AF;
      border-top: 1px solid #F3F4F6;
      padding-top: 16px;
    }

    /* ---- REPORT CONTENT ---- */
    .section-title {
      font-size: 18pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #050505;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #6D5DF6;
    }

    .exec-summary-box {
      background: #F8F7FF;
      border: 1px solid #E9E5FF;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }

    .verdict-badge {
      display: inline-block;
      background: #6D5DF6;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 10pt;
      padding: 4px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .exec-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 16px;
    }

    .exec-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      padding: 14px 18px;
      border-radius: 8px;
    }

    .exec-card-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #6D5DF6;
      margin-bottom: 4px;
    }

    .exec-card-text {
      font-size: 10pt;
      font-weight: 600;
      color: #1F2937;
    }

    .report-block {
      margin-bottom: 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 20px;
    }

    .report-block-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .report-block-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #6D5DF6;
      background: #F3F0FF;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .report-block-title {
      font-size: 13pt;
      font-weight: 800;
      color: #111827;
    }

    .report-block-body {
      font-size: 10pt;
      color: #374151;
      white-space: pre-line;
      line-height: 1.65;
    }

    .rec-card {
      background: #FAF9FE;
      border: 1px solid #D8D2FC;
      padding: 18px;
      border-radius: 10px;
      margin-bottom: 16px;
    }

    .rec-card-title {
      font-size: 12pt;
      font-weight: 800;
      color: #6D5DF6;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>

  <!-- HEADER & FOOTER -->
  <div class="pdf-header">
    <span>Vision2Real Platform Validation Report</span>
    <span>ID: ${reportId}</span>
  </div>

  <div class="pdf-footer">
    <span>CONFIDENTIAL & PROPRIETARY — FOR FOUNDER USE ONLY</span>
    <span>Vision2Real AI Engine</span>
  </div>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="brand-mark">
      <div class="brand-logo"></div>
      <span class="brand-title">Vision2Real</span>
    </div>

    <div class="cover-main">
      <span class="cover-tag">Official AI Validation Dossier</span>
      <h1 class="cover-heading">Startup Validation &amp;<br>Execution Intelligence</h1>

      <div class="cover-idea-box">
        &ldquo;${ideaText}&rdquo;
      </div>

      <div class="cover-meta-grid">
        <div>
          <div class="meta-item-label">REPORT ID</div>
          <div class="meta-item-value">${reportId}</div>
        </div>
        <div>
          <div class="meta-item-label">DATE GENERATED</div>
          <div class="meta-item-value">${generatedDate}</div>
        </div>
        <div>
          <div class="meta-item-label">VALIDATION VERDICT</div>
          <div class="meta-item-value" style="color: #6D5DF6;">${report.overallVerdict}</div>
        </div>
        <div>
          <div class="meta-item-label">QUALITATIVE CONFIDENCE</div>
          <div class="meta-item-value">${report.confidence}</div>
        </div>
      </div>
    </div>

    <div class="cover-notice">
      CONFIDENTIALITY NOTICE: This document contains proprietary analysis generated by the Vision2Real AI Specialist System. Intended strictly for the founder, internal stakeholders, partners, and accredited advisors.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- EXECUTIVE SUMMARY -->
  <h2 class="section-title">Executive Summary</h2>

  <div class="exec-summary-box">
    <span class="verdict-badge">${report.overallVerdict}</span>
    <p style="font-size: 11pt; color: #1F2937; margin-bottom: 16px;">
      ${report.aiSummary}
    </p>

    <div class="exec-grid">
      <div class="exec-card">
        <div class="exec-card-title">Biggest Opportunity</div>
        <div class="exec-card-text">${report.biggestOpportunity}</div>
      </div>
      <div class="exec-card">
        <div class="exec-card-title" style="color: #DC2626;">Biggest Execution Risk</div>
        <div class="exec-card-text">${report.biggestRisk}</div>
      </div>
      <div class="exec-card">
        <div class="exec-card-title">Confidence Rating</div>
        <div class="exec-card-text">${report.confidence}</div>
      </div>
      <div class="exec-card">
        <div class="exec-card-title">Recommended Next Step</div>
        <div class="exec-card-text">${report.recommendedNextStep}</div>
      </div>
    </div>
  </div>

  <!-- DETAILED MULTI-SPECIALIST FINDINGS -->
  <h2 class="section-title">Detailed Multi-Specialist Validation</h2>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">01</span>
      <h3 class="report-block-title">Idea Structuring Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.ideaStructuring}</div>
  </div>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">02</span>
      <h3 class="report-block-title">Market Research Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.marketResearch}</div>
  </div>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">03</span>
      <h3 class="report-block-title">Competition Intelligence Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.competitionAnalysis}</div>
  </div>

  <div class="page-break"></div>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">04</span>
      <h3 class="report-block-title">Customer Research Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.customerAnalysis}</div>
  </div>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">05</span>
      <h3 class="report-block-title">Product &amp; Feasibility Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.productFeasibility}</div>
  </div>

  <div class="report-block" style="border-color: #FCA5A5;">
    <div class="report-block-header">
      <span class="report-block-num" style="background: #FEE2E2; color: #DC2626;">06</span>
      <h3 class="report-block-title" style="color: #DC2626;">Red Agent Adversarial Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.redAgentAnalysis}</div>
  </div>

  <div class="report-block">
    <div class="report-block-header">
      <span class="report-block-num">07</span>
      <h3 class="report-block-title">Validation Strategy Specialist</h3>
    </div>
    <div class="report-block-body">${report.detailedReport.validationStrategy}</div>
  </div>

  <!-- RECOMMENDATIONS -->
  <h2 class="section-title">Personalized Vision2Real Recommendations</h2>

  ${recommendations
    .map(
      (rec, idx) => `
    <div class="rec-card">
      <div class="rec-card-title">${rec.badgeText || `Recommendation #${idx + 1}`} — ${rec.title}</div>
      <p style="font-size: 10pt; color: #4B5563; margin-bottom: 8px;"><strong>Why Recommended:</strong> ${rec.reasoning}</p>
      <p style="font-size: 10pt; color: #4B5563;"><strong>Validation Evidence:</strong> ${rec.evidence}</p>
    </div>
  `
    )
    .join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
