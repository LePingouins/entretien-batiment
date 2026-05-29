import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLang } from '../context/LangContext';

// How often (ms) the running app pings the server for a new build.
// 60s is a good balance: users see updates quickly without hammering the
// server. Each check is a tiny conditional GET against the SW script.
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Mounts the PWA service-worker registration and shows a small banner when a
 * new version of the app has been deployed. Clicking the button activates the
 * waiting service worker and reloads the page — no manual cache clear needed.
 *
 * Why a banner instead of a silent reload:
 *   The previous implementation reloaded automatically as soon as a new SW
 *   took control. That works, but can interrupt a user filling out a long
 *   form. A one-click banner keeps the choice in the user's hands while
 *   still being trivial for non-technical users ("Mettre à jour" / "Update").
 *
 * Why the periodic check:
 *   `useRegisterSW` only checks for a new SW on initial page load. A PWA
 *   that stays open for hours/days would otherwise never discover a deploy.
 */
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
        // Only check when online and tab is visible — avoids waking the SW
        // unnecessarily on background tabs.
        if (!navigator.onLine) return;
        if (document.visibilityState !== 'visible') return;
        registration.update().catch(() => {
          /* network blip — try again next interval */
        });
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

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
    // `true` => reload the page once the new SW takes over.
    await updateServiceWorker(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,420px)] rounded-xl shadow-2xl border border-brand-500/40 bg-white dark:bg-surface-800 p-4 flex items-start gap-3"
    >
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
