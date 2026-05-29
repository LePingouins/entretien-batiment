import { useEffect, useState } from 'react';
import { useLang } from '../context/LangContext';

export function PWAUpdatePrompt() {
  const { lang } = useLang();
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const cleanups: (() => void)[] = [];

    async function setup() {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      // Case 1: a new SW was already waiting when this page loaded
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingSW(reg.waiting);
      }

      // Case 2: a new SW installs while the page is open
      function onUpdateFound() {
        const installing = reg?.installing;
        if (!installing) return;
        function onStateChange() {
          if (installing!.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingSW(installing!);
          }
        }
        installing.addEventListener('statechange', onStateChange);
        cleanups.push(() => installing.removeEventListener('statechange', onStateChange));
      }
      reg.addEventListener('updatefound', onUpdateFound);
      cleanups.push(() => reg.removeEventListener('updatefound', onUpdateFound));

      // Periodic polling: check for a new SW every 60s while tab is visible
      const interval = setInterval(() => {
        if (!navigator.onLine || document.visibilityState !== 'visible') return;
        reg.update().catch(() => {});
      }, 60_000);
      cleanups.push(() => clearInterval(interval));
    }

    setup();
    return () => cleanups.forEach(fn => fn());
  }, []);

  if (!waitingSW) return null;

  const t = lang === 'fr'
    ? {
        title: 'Nouvelle version disponible',
        body: 'Cliquez pour installer la mise à jour.',
        update: 'Mettre à jour',
        updating: 'Mise à jour…',
        later: 'Plus tard',
      }
    : {
        title: 'New version available',
        body: 'Click to install the update.',
        update: 'Update app',
        updating: 'Updating…',
        later: 'Later',
      };

  const handleUpdate = () => {
    setUpdating(true);
    // Workbox's generated SW always listens for this message and calls skipWaiting()
    waitingSW.postMessage({ type: 'SKIP_WAITING' });
    // Once the new SW takes control, reload to serve fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,420px)] rounded-xl shadow-2xl border border-brand-500/40 bg-white dark:bg-surface-800 p-4 flex items-start gap-3"
    >
      <span className="text-xl leading-none mt-0.5">🔄</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-surface-900 dark:text-surface-100">
          {t.title}
        </div>
        <div className="text-xs text-surface-600 dark:text-surface-300 mt-0.5">
          {t.body}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {updating ? t.updating : t.update}
        </button>
        <button
          type="button"
          onClick={() => setWaitingSW(null)}
          disabled={updating}
          className="px-3 py-1 text-[11px] rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
        >
          {t.later}
        </button>
      </div>
    </div>
  );
}
