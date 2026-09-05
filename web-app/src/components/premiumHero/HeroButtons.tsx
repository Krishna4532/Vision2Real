export interface HeroAction {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

interface HeroButtonsProps {
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  children?: React.ReactNode;
}

export function HeroButtons({ primaryAction, secondaryAction, children }: HeroButtonsProps) {
  if (children) {
    return <div className="hero__ctas">{children}</div>;
  }

  return (
    <div className="hero__ctas">
      {primaryAction && (
        <button
          type={primaryAction.type || 'button'}
          className={`btn btn--primary ${primaryAction.className || ''}`.trim()}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </button>
      )}

      {secondaryAction && (
        <button
          type={secondaryAction.type || 'button'}
          className={`btn btn--secondary ${secondaryAction.className || ''}`.trim()}
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
