// Polyfill for sockjs-client browser global
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
// Initialize Sentry if configured at build time via Vite env var `VITE_SENTRY_DSN`
if (import.meta.env && import.meta.env.VITE_SENTRY_DSN) {
  // Dynamic import to avoid adding Sentry when not configured
  import('@sentry/react').then(Sentry => {
    import('@sentry/tracing').then(() => {
      Sentry.init({
        dsn: String(import.meta.env.VITE_SENTRY_DSN),
        integrations: [new (Sentry as any).Integrations.BrowserTracing()],
        tracesSampleRate: 0.1,
      });
    });
  }).catch(() => {});
}

import Root from './Root';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
