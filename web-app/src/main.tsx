import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';

/* Global & Component Styles */
import './index.css';
import './components/ui/ui.css';
import './components/navigation/Navbar.css';
import './components/hero/Hero.css';
import './components/sections/sections.css';
import './components/footer/Footer.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
