import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLang } from '../context/LangContext';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

export function PWAUpdatePrompt() {
  const { lang } = useLang();
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (!navigator.onLine) return;
        if (document.visibilityState !== 'visible') return;
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  // Small v5 test
  // Detect a SW that was already waiting when the page loaded.
  // useRegisterSW only fires onNeedRefresh for SWs that transition to
  // "waiting" while the page is open. If the user reloaded AFTER a deploy
  // (so the new SW was already waiting), we catch it here.
  useEffect(() => {
    navigator.serviceWorker?.getRegistration().then(reg => {
      if (reg?.waiting) setNeedRefresh(true);
    });
  }, [setNeedRefresh]);

  if (!needRefresh) return null;

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

  const handleUpdate = async () => {
    setUpdating(true);
    await updateServiceWorker(true);
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
          onClick={() => setNeedRefresh(false)}
          disabled={updating}
          className="px-3 py-1 text-[11px] rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
        >
          {t.later}
        </button>
      </div>
    </div>
  );
}
