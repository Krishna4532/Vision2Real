interface HeroBadgeProps {
  badge?: string;
  iconSrc?: string;
}

export function HeroBadge({ badge, iconSrc }: HeroBadgeProps) {
  return (
    <div className="hero__lockup">
      {iconSrc ? (
        <img src={iconSrc} alt="Vision2Real" />
      ) : (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ opacity: 0.92 }}
        >
          <rect width="24" height="24" rx="6" fill="url(#badgeGrad)" />
          <path
            d="M7 12L10.5 15.5L17 8.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="badgeGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6C5CE7" />
              <stop offset="1" stopColor="#3E5C8A" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {badge ? (
        <span>
          <b>{badge}</b>
        </span>
      ) : (
        <span>
          vision<b>2</b>real
        </span>
      )}
    </div>
  );
}
