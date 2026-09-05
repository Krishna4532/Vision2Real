interface HeroGlowProps {
  markSrc?: string;
}

export function HeroGlow({ markSrc }: HeroGlowProps) {
  return (
    <>
      <div className="hero__core-glow" aria-hidden="true" />
      <div className="hero__core-glow hero__core-glow--inner" aria-hidden="true" />

      <div className="hero__pulse" aria-hidden="true" />
      <div className="hero__pulse hero__pulse--b" aria-hidden="true" />

      {markSrc ? (
        <img className="hero__mark" src={markSrc} alt="" aria-hidden="true" />
      ) : (
        <div className="hero__mark" aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', opacity: 0.8 }}>
            <circle cx="50" cy="50" r="40" stroke="url(#lineGradient)" strokeWidth="4" />
            <path d="M35 50L45 60L65 40" stroke="#6c5ce7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className="hero__scrim" aria-hidden="true" />
    </>
  );
}
