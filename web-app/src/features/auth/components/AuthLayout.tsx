import { type ReactNode } from 'react';
import { AuthHero } from './AuthHero';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="v2r-auth-layout">
      {/* Left Hero Panel */}
      <div className="v2r-auth-layout__left">
        <AuthHero />
      </div>

      {/* Right Form Container */}
      <div className="v2r-auth-layout__right">
        <div className="v2r-auth-layout__right-inner">{children}</div>
      </div>
    </div>
  );
}
