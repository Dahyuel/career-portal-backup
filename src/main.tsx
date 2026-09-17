import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/animations.css';
import { getLandingContent, loadActiveEvent, loadLandingPage } from './lib/currentEvent';
import { mergeLanding } from './lib/landingContent';
import { applyTheme } from './lib/theme';

// Framer Motion 12 dev-only warning: "div: `ref` is not a prop"
// Fires from FM's internal PopChild inside AnimatePresence.
// Harmless; suppressed here to keep the console readable.
if (import.meta.env.DEV) {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === 'string' &&
      first.includes('`ref` is not a prop')
    ) {
      return;
    }
    origError(...args);
  };
}

// Load the active event and its landing page before the first render, so every page
// uses the same event and the colours are in place before anything is painted.
Promise.all([loadActiveEvent(), loadLandingPage()]).finally(() => {
  const landing = mergeLanding(getLandingContent());
  const title = landing.seo_title.trim();
  if (title) document.title = title;
  applyTheme(landing.theme);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});