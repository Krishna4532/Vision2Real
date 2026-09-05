import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Idea } from '@/services/ideas/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { motion } from 'motion/react';

interface IdeaCardProps {
  idea: Idea;
  index: number;
  onEdit: (idea: Idea) => void;
  onArchiveToggle: (idea: Idea) => void;
}

export const IdeaCard = memo(function IdeaCard({
  idea,
  index,
  onEdit,
  onArchiveToggle,
}: IdeaCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/founder/ideas/${idea.slug || idea.id}`);
  };

  return (
    <motion.div
      className="v2r-idea-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 1, 0.5, 1] }}
      onClick={handleCardClick}
    >
      <div className="v2r-idea-card__header">
        <h3 className="v2r-idea-card__title">{idea.title}</h3>
        <StatusBadge status={idea.current_stage} />
      </div>

      <p className="v2r-idea-card__problem">
        {idea.problem_statement}
      </p>

      <div className="v2r-idea-card__meta">
        <span className="v2r-idea-card__tag">{idea.industry}</span>
        <span className="v2r-idea-card__tag" style={{ color: 'var(--color-text-secondary)' }}>
          {idea.target_market}
        </span>
      </div>

      <div className="v2r-idea-card__footer">
        <span>Updated {new Date(idea.updated_at).toLocaleDateString()}</span>

        <div
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              minHeight: '36px',
              padding: '0 6px',
            }}
            onClick={() => onEdit(idea)}
            aria-label={`Edit ${idea.title}`}
          >
            Edit
          </button>

          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: idea.is_archived ? 'var(--color-accent)' : 'rgba(239, 68, 68, 0.8)',
              fontSize: '12px',
              cursor: 'pointer',
              minHeight: '36px',
              padding: '0 6px',
            }}
            onClick={() => onArchiveToggle(idea)}
            aria-label={idea.is_archived ? `Restore ${idea.title}` : `Archive ${idea.title}`}
          >
            {idea.is_archived ? 'Restore' : 'Archive'}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
