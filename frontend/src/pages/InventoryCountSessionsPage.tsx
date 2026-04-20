import { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getInventorySessions,
  createInventorySession,
  startInventorySession,
  completeInventorySession,
  cancelInventorySession,
  deleteInventorySession,
  getInventoryExportUrl,
} from '../lib/api';
import type { InventorySessionResponse, InventorySessionStatus } from '../types/api';
import { getStoredAccessToken } from '../lib/authStorage';

const statusColors: Record<InventorySessionStatus, { dark: string; light: string }> = {
  DRAFT: { dark: 'bg-surface-700 text-surface-300', light: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { dark: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25', light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  COMPLETED: { dark: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25', light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  CANCELLED: { dark: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25', light: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
};

export default function InventoryCountSessionsPage() {
  const { t, lang } = useLang();
  const { role } = useAuth();
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<InventorySessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await getInventorySessions());
    } catch {
      setError(t.invSessionLoadError || 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const session = await createInventorySession(newName.trim(), newNotes.trim() || undefined);
      setShowCreate(false);
      setNewName('');
      setNewNotes('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create session.');
    }
  };

  const handleStart = async (id: number) => {
    await startInventorySession(id);
    await load();
  };

  const handleComplete = async (id: number) => {
    if (!confirm(t.invCompleteConfirm || 'Mark this count as completed? This cannot be undone.')) return;
    await completeInventorySession(id);
    await load();
  };

  const handleCancel = async (id: number) => {
    if (!confirm(t.invCancelConfirm || 'Cancel this session?')) return;
    await cancelInventorySession(id);
    await load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.invDeleteSessionConfirm || 'Delete this session permanently?')) return;
    await deleteInventorySession(id);
    await load();
  };

  const handleExport = (id: number) => {
    const url = getInventoryExportUrl(id);
    const token = getStoredAccessToken();
    // Open in new tab with auth
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    // Use fetch + blob to include auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `inventory-count-${id}.csv`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  const basePath = role === 'TECH' ? '/tech' : role === 'WORKER' ? '/worker' : '/admin';

  const card = `rounded-xl border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const input = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-surface-800 border-surface-600 text-white placeholder-surface-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const btnPrimary = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`;
  const btnSecondary = `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-surface-700 hover:bg-surface-600 text-surface-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`;

  const statusLabel = (s: InventorySessionStatus) => {
    const labels: Record<InventorySessionStatus, string> = {
      DRAFT: t.invStatusDraft || 'Draft',
      IN_PROGRESS: t.invStatusInProgress || 'In Progress',
      COMPLETED: t.invStatusCompleted || 'Completed',
      CANCELLED: t.invStatusCancelled || 'Cancelled',
    };
    return labels[s];
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[50vh] ${isDark ? 'text-surface-300' : ''}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.invSessionsTitle || 'Inventory Counts'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
            {t.invSessionsSubtitle || 'Create and manage physical inventory count sessions.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`${basePath}/inventory/products`} className={`${btnSecondary} flex items-center gap-1`}>
            {t.invProductsNav || 'Products'}
          </Link>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            + {t.invNewSession || 'New Count'}
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className={`${card} p-6 w-full max-w-md space-y-4`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.invNewSession || 'New Inventory Count'}</h2>
            <p className={`text-xs ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
              {t.invNewSessionHint || 'This will create a snapshot of all products for counting.'}
            </p>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invSessionName || 'Session Name'} *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.invSessionNamePlaceholder || 'e.g. Q1 2026 Count'} className={input} />
            </div>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invNotes || 'Notes'}</label>
              <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} className={input} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className={btnSecondary}>{t.cancel || 'Cancel'}</button>
              <button onClick={handleCreate} className={btnPrimary}>{t.create || 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <p className={`text-lg ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{t.invNoSessions || 'No inventory counts yet.'}</p>
          <p className={`text-sm mt-2 ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{t.invNoSessionsHint || 'Create your first count to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(s => {
            const progress = s.totalItems > 0 ? Math.round((s.countedItems / s.totalItems) * 100) : 0;
            const sc = statusColors[s.status];
            return (
              <div key={s.id} className={`${card} p-5 space-y-3`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? sc.dark : sc.light}`}>{statusLabel(s.status)}</span>
                    </div>
                    {s.notes && <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{s.notes}</p>}
                    <div className={`flex flex-wrap gap-4 mt-2 text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
                      <span>{t.createdAt || 'Created'}: {formatDate(s.createdAt)}</span>
                      {s.createdByName && <span>{t.createdBy || 'By'}: {s.createdByName}</span>}
                      {s.startedAt && <span>{t.invStarted || 'Started'}: {formatDate(s.startedAt)}</span>}
                      {s.completedAt && <span>{t.completed || 'Completed'}: {formatDate(s.completedAt)}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {s.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handleStart(s.id)} className={`${btnSecondary} !bg-amber-500/20 !text-amber-600 hover:!bg-amber-500/30`}>{t.invStart || 'Start'}</button>
                        <button onClick={() => handleDelete(s.id)} className={`${btnSecondary} !text-red-500 hover:!bg-red-500/10`}>{t.delete || 'Delete'}</button>
                      </>
                    )}
                    {s.status === 'IN_PROGRESS' && (
                      <>
                        <Link to={`${basePath}/inventory/count/${s.id}`} className={`${btnPrimary} inline-flex items-center gap-1`}>
                          {t.invCountNow || 'Count Now'}
                        </Link>
                        <button onClick={() => handleComplete(s.id)} className={`${btnSecondary} !bg-emerald-500/20 !text-emerald-600 hover:!bg-emerald-500/30`}>{t.invFinish || 'Finish'}</button>
                        <button onClick={() => handleCancel(s.id)} className={`${btnSecondary} !text-red-500 hover:!bg-red-500/10`}>{t.cancel || 'Cancel'}</button>
                      </>
                    )}
                    {s.status === 'COMPLETED' && (
                      <>
                        <Link to={`${basePath}/inventory/count/${s.id}`} className={btnSecondary}>
                          {t.invViewResults || 'View Results'}
                        </Link>
                        <button onClick={() => handleExport(s.id)} className={btnSecondary}>CSV</button>
                      </>
                    )}
                    {s.status === 'CANCELLED' && (
                      <button onClick={() => handleDelete(s.id)} className={`${btnSecondary} !text-red-500 hover:!bg-red-500/10`}>{t.delete || 'Delete'}</button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isDark ? 'text-surface-400' : 'text-slate-500'}>
                      {s.countedItems}/{s.totalItems} {t.invCounted || 'counted'}
                    </span>
                    <span className={isDark ? 'text-surface-400' : 'text-slate-500'}>{progress}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-surface-700' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {s.discrepancyCount > 0 && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      {s.discrepancyCount} {t.invDiscrepancies || 'discrepancies found'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
