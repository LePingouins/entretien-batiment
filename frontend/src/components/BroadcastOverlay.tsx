import React, { useEffect } from 'react';
import { useBroadcast } from '../context/BroadcastContext';
import { useLang } from '../context/LangContext';

export default function BroadcastOverlay() {
  const { broadcast, dismissBroadcastForThisUser } = useBroadcast();
  const { t } = useLang();

  useEffect(() => {
    if (!broadcast) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissBroadcastForThisUser();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [broadcast, dismissBroadcastForThisUser]);

  if (!broadcast) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
      <div className="w-full max-w-3xl mt-6 pointer-events-auto px-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl shadow-lg p-4 flex items-start gap-4 animate-slide-down">
          <div className="flex-1">
            <div className="font-semibold">{t.filterBroadcast}</div>
            <div className="mt-1 text-sm leading-relaxed">{broadcast.message}</div>
            <div className="mt-2 text-xs text-slate-500">{new Date(broadcast.createdAt).toLocaleString()}</div>
          </div>
          <div className="ml-4 flex items-start">
            <button onClick={dismissBroadcastForThisUser} className="text-amber-700 hover:text-amber-900 px-2 py-1 rounded-md bg-amber-100">×</button>
          </div>
        </div>
      </div>
    </div>
  );
}
