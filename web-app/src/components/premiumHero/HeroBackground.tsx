interface HeroBackgroundProps {
  className?: string;
}

export function HeroBackground({ className = '' }: HeroBackgroundProps) {
  return (
    <>
      <div className={`hero__wash ${className}`.trim()} aria-hidden="true" />
      <svg
        className="hero__lines"
        id="flowLines"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0" />
            <stop offset="50%" stopColor="#a99bf5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3e5c8a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M 4,10  Q 28,22 50,48" />
        <path d="M 96,8  Q 70,24 50,48" />
        <path d="M 2,52  Q 26,50 50,48" />
        <path d="M 98,58 Q 74,52 50,48" />
        <path d="M 12,94 Q 32,70 50,48" />
        <path d="M 90,92 Q 68,70 50,48" />
        <path d="M 50,-2 Q 50,20 50,48" />
        <path d="M 50,100 Q 50,76 50,48" />
      </svg>
    </>
  );
}
