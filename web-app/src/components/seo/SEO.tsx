import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_SEO, SITE_CONFIG, type RouteSEOData } from './seoConfig';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
}

function updateMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Apply SEO metadata dynamically to the document head
 */
export function applySEO(seo: Partial<RouteSEOData>) {
  const title = seo.title || SITE_CONFIG.defaultTitle;
  const description = seo.description || SITE_CONFIG.defaultDescription;
  const canonical = seo.canonical || `${SITE_CONFIG.siteUrl}/`;
  const robots = seo.robots || 'index, follow';
  const ogType = seo.ogType || 'website';
  const ogImage = seo.ogImage || SITE_CONFIG.defaultOgImage;

  // Title
  document.title = title;

  // Canonical
  updateCanonical(canonical);

  // Standard Meta Tags
  updateMeta('name', 'description', description);
  updateMeta('name', 'robots', robots);

  // Open Graph
  updateMeta('property', 'og:site_name', SITE_CONFIG.name);
  updateMeta('property', 'og:type', ogType);
  updateMeta('property', 'og:url', canonical);
  updateMeta('property', 'og:title', title);
  updateMeta('property', 'og:description', description);
  updateMeta('property', 'og:image', ogImage);
  updateMeta('property', 'og:image:width', '1200');
  updateMeta('property', 'og:image:height', '630');
  updateMeta('property', 'og:image:alt', title);

  // Twitter Cards
  updateMeta('name', 'twitter:card', 'summary_large_image');
  updateMeta('name', 'twitter:title', title);
  updateMeta('name', 'twitter:description', description);
  updateMeta('name', 'twitter:image', ogImage);
  updateMeta('name', 'twitter:image:alt', title);
}

/**
 * Hook to manually override SEO for a specific page/view
 */
export function useSEO(props: SEOProps) {
  useEffect(() => {
    applySEO(props);
  }, [props.title, props.description, props.canonical, props.robots, props.ogType, props.ogImage]);
}

/**
 * Hook to automatically synchronize SEO with the current router path
 */
export function useRouteSEO() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '') || '/';

    // 1. Direct match in public routes
    if (ROUTE_SEO[path]) {
      applySEO(ROUTE_SEO[path]);
      return;
    }

    // 2. Founder Workspace routes
    if (path.startsWith('/founder')) {
      let founderTitle = 'Dashboard | Vision2Real';
      if (path.includes('/validations')) {
        founderTitle = 'Validation Reports | Vision2Real';
      } else if (path.includes('/reality-sprints') || path.includes('/sprint')) {
        founderTitle = 'Reality Sprints | Vision2Real';
      } else if (path.includes('/build-requests') || path.includes('/requests')) {
        founderTitle = 'Build Requests | Vision2Real';
      } else if (path.includes('/notifications')) {
        founderTitle = 'Notifications | Vision2Real';
      } else if (path.includes('/settings')) {
        founderTitle = 'Settings | Vision2Real';
      }

      applySEO({
        title: founderTitle,
        description: 'Manage your startup validations, Reality Sprints, and product roadmap in your Vision2Real Founder Workspace.',
        canonical: `${SITE_CONFIG.siteUrl}${path}`,
        robots: 'noindex, nofollow',
      });
      return;
    }

    // 3. Admin routes
    if (path.startsWith('/admin')) {
      const adminTitle = path.includes('/dashboard') ? 'Admin Dashboard | Vision2Real' : 'Admin Login | Vision2Real';
      applySEO({
        title: adminTitle,
        description: 'Vision2Real Administration Control Center.',
        canonical: `${SITE_CONFIG.siteUrl}${path}`,
        robots: 'noindex, nofollow',
      });
      return;
    }

    // 4. Default 404 / unknown route
    applySEO({
      title: '404 Not Found | Vision2Real',
      description: 'The requested page could not be found on Vision2Real.',
      canonical: `${SITE_CONFIG.siteUrl}${path}`,
      robots: 'noindex, nofollow',
    });
  }, [location.pathname]);
}

/**
 * Self-contained Route Tracker Component
 */
export function RouteSEOTracker() {
  useRouteSEO();
  return null;
}
