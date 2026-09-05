/**
 * Vision2Real – Analysis Overview Component
 * Informational grid displaying the 9 dimensions analyzed by Vision2Real AI specialists.
 */

import { SectionHeading } from '@/components/ui/SectionHeading';

const ANALYSIS_DIMENSIONS = [
  {
    title: 'Problem Analysis',
    description: 'Deconstructs the core pain point, urgency, severity, and market need validation.',
    icon: '🎯',
  },
  {
    title: 'Market Opportunity',
    description: 'Evaluates target TAM/SAM sizing, industry macro trends, and demand momentum.',
    icon: '📊',
  },
  {
    title: 'Competition',
    description: 'Maps direct/indirect existing solutions, positioning gaps, and moat defensibility.',
    icon: '⚔️',
  },
  {
    title: 'Customer Analysis',
    description: 'Examines target ICP demographics, buying habits, and willingness-to-pay signals.',
    icon: '👥',
  },
  {
    title: 'Product Scope',
    description: 'Synthesizes core value prop, feature priorities, and user journey optimization.',
    icon: '💡',
  },
  {
    title: 'Technical Feasibility',
    description: 'Assesses tech stack requirements, architectural risks, data models, and API integrations.',
    icon: '⚙️',
  },
  {
    title: 'Risk Assessment',
    description: 'Identifies adoption barriers, regulatory hurdles, churn risks, and execution pitfalls.',
    icon: '🛡️',
  },
  {
    title: 'Opportunity Analysis',
    description: 'Uncovers expansion avenues, partnership hooks, and strategic growth drivers.',
    icon: '🚀',
  },
  {
    title: 'Strategy & Roadmap',
    description: 'Transforms validated findings into clear decisions and concrete next steps.',
    icon: '🧭',
  },
];

export function AnalysisOverview() {
  return (
    <div id="analysis-overview" style={{ marginTop: 'var(--space-4xl)' }}>
      <SectionHeading
        eyebrow="AI SPECIALIST COVERAGE"
        title="What Vision2Real Will Analyze"
        subtitle="Our multi-agent AI engine thoroughly evaluates your startup across all 9 critical business dimensions."
      />

      <div className="v2r-overview-grid">
        {ANALYSIS_DIMENSIONS.map((item) => (
          <div key={item.title} className="v2r-overview-card">
            <div className="v2r-overview-card__header">
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <h3 className="v2r-overview-card__title">{item.title}</h3>
            </div>
            <p className="v2r-overview-card__description">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
