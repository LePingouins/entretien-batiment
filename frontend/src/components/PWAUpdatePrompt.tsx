import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // When the new service worker takes control, reload automatically.
  // This means updates are completely invisible to the user — the app
  // just refreshes itself in the background after a new deploy.
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handler = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
  }, []);

  return null;
}
