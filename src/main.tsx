import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/animations.css';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);