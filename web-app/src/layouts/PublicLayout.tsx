/**
 * Vision2Real – Public Layout
 * Layout for all public marketing & landing pages.
 * Includes Navbar and Footer.
 */

import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/footer/Footer';
import { RouteSEOTracker } from '@/components/seo/SEO';

export function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <RouteSEOTracker />
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
