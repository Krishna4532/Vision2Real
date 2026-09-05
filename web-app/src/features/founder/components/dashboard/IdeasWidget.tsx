import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import type { IdeaSummary } from '@/services/dashboard/types';

interface IdeasWidgetProps {
  idea: IdeaSummary | null;
}

export const IdeasWidget = memo(function IdeasWidget({ idea }: IdeasWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className="v2r-widget">
      <div className="v2r-widget__header">
        <h3 className="v2r-widget__title">My Ideas</h3>
        {idea && (
          <span className="v2r-widget__badge v2r-widget__badge--accent">
            {idea.status}
          </span>
        )}
      </div>

      {idea ? (
        <>
          <div className="v2r-widget__body">
            <div>
              <span className="v2r-widget__label">Latest Idea</span>
              <p className="v2r-widget__value">{idea.title}</p>
            </div>
            {idea.category && (
              <div>
                <span className="v2r-widget__label">Category</span>
                <p className="v2r-widget__value">{idea.category}</p>
              </div>
            )}
            <div>
              <span className="v2r-widget__label">Last Updated</span>
              <p className="v2r-widget__value">{idea.updated_at}</p>
            </div>
          </div>
          <div className="v2r-widget__footer">
            <Button variant="ghost" size="sm" onClick={() => navigate('/founder/validations')}>
              View All Ideas →
            </Button>
          </div>
        </>
      ) : (
        <div className="v2r-widget__empty">
          <div className="v2r-widget__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
            </svg>
          </div>
          <span className="v2r-widget__empty-text">No ideas yet. Start by validating your first startup idea.</span>
          <Button variant="primary" size="sm" onClick={() => navigate('/validate-idea')}>
            + Create First Idea
          </Button>
        </div>
      )}
    </div>
  );
});
