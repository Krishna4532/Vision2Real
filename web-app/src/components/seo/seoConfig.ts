/**
 * Production SEO Configuration for Vision2Real
 * Base URL: https://www.vision2real.in
 */

export interface RouteSEOData {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
}

export const SITE_CONFIG = {
  name: 'Vision2Real',
  siteUrl: 'https://www.vision2real.in',
  defaultTitle: 'Vision2Real | Transform Ideas into Products',
  defaultDescription:
    'Vision2Real validates your startup idea with multi-agent AI analysis, executes Reality Sprints, and builds production-ready products with AI + human experts.',
  defaultOgImage: 'https://www.vision2real.in/og-image.png',
  logoUrl: 'https://www.vision2real.in/logo.svg',
  twitterHandle: '@vision2real',
};

export const ROUTE_SEO: Record<string, RouteSEOData> = {
  '/': {
    title: 'Vision2Real | Transform Ideas into Products',
    description:
      'Vision2Real validates your startup idea with multi-agent AI analysis, executes Reality Sprints, and builds production-ready products with AI + human experts.',
    canonical: 'https://www.vision2real.in/',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
  },
  '/validate': {
    title: 'Validate Your Startup Idea | Vision2Real',
    description:
      'Validate your startup idea with our 8-agent AI specialist engine. Get deep market analysis, competitor insights, and feasibility scoring before building.',
    canonical: 'https://www.vision2real.in/validate',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
  },
  '/build-product': {
    title: 'Build Your Product & Reality Sprints | Vision2Real',
    description:
      'Turn your vision into a real product. Partner with Vision2Real for 7-day Reality Sprints and full-cycle production software development from concept to launch.',
    canonical: 'https://www.vision2real.in/build-product',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
  },
  '/about': {
    title: 'About | Vision2Real',
    description:
      'Learn about Vision2Real, our founder-first philosophy, AI + human team, flexible pricing tiers, and the mission to turn high-conviction ideas into reality.',
    canonical: 'https://www.vision2real.in/about',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
  },
  '/login': {
    title: 'Login | Vision2Real',
    description:
      'Sign in to your Vision2Real Founder Workspace to access your AI validation reports, monitor active Reality Sprints, and manage your product build roadmap.',
    canonical: 'https://www.vision2real.in/login',
    robots: 'index, follow',
    ogType: 'website',
  },
  '/signup': {
    title: 'Create Account | Vision2Real',
    description:
      'Create your Vision2Real account today. Validate your startup concepts, collaborate with AI specialists, and build production applications with confidence.',
    canonical: 'https://www.vision2real.in/signup',
    robots: 'index, follow',
    ogType: 'website',
  },
  '/forgot-password': {
    title: 'Forgot Password | Vision2Real',
    description:
      'Reset your Vision2Real password securely. Enter your account email to receive recovery instructions and regain instant access to your founder workspace.',
    canonical: 'https://www.vision2real.in/forgot-password',
    robots: 'index, follow',
    ogType: 'website',
  },
  '/reset-password': {
    title: 'Reset Password | Vision2Real',
    description:
      'Set a new secure password for your Vision2Real account. Secure your founder dashboard, startup validation reports, and private product roadmap projects.',
    canonical: 'https://www.vision2real.in/reset-password',
    robots: 'noindex, nofollow',
    ogType: 'website',
  },
};
