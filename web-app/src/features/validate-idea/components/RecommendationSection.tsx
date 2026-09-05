/**
 * Vision2Real – Personalized AI Recommendation Component
 * Renders evidence-based module recommendations (single or multiple ranked)
 * with explicit evidence, reasoning, primary "Continue Your Journey" CTA,
 * and secondary "Validate Another Idea" restart CTA.
 */

import { Button } from '@/components/ui/Button';
import type { ModuleRecommendation } from '@/types/validation';

interface RecommendationSectionProps {
  recommendations: ModuleRecommendation[];
  onContinueJourney: () => void;
  onValidateAnother: () => void;
}

export function RecommendationSection({
  recommendations,
  onContinueJourney,
  onValidateAnother,
}: RecommendationSectionProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="v2r-recs-section" id="recommendation-section">
      <div className="v2r-recs-header">
        <span className="v2r-recs-header__eyebrow">AI ADVISORY RECOMMENDATION</span>
        <h2 className="v2r-recs-header__title">Recommended Next Step</h2>
      </div>

      <div className="v2r-recs-list">
        {recommendations.map((rec, index) => (
          <div
            key={rec.id || index}
            className={`v2r-rec-card ${rec.isPrimary ? 'v2r-rec-card--primary' : ''}`}
          >
            <div className="v2r-rec-card__top">
              <span className="v2r-rec-card__badge">{rec.badgeText || `Rank #${rec.rank || index + 1}`}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Module: {rec.recommendedModule}
              </span>
            </div>

            <div className="v2r-rec-card__module">{rec.title}</div>

            <div className="v2r-rec-card__block">
              <div className="v2r-rec-card__block-label">Validation Evidence</div>
              <p className="v2r-rec-card__block-text">{rec.evidence}</p>
            </div>

            <div className="v2r-rec-card__block">
              <div className="v2r-rec-card__block-label">AI Reasoning & Next Steps</div>
              <p className="v2r-rec-card__block-text">{rec.reasoning}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="v2r-recs-actions">
        <Button variant="primary" size="lg" onClick={onContinueJourney}>
          <span>Continue Your Journey</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Button>

        <Button variant="outline" size="md" onClick={onValidateAnother}>
          <span>Validate Another Idea</span>
        </Button>
      </div>
    </div>
  );
}
