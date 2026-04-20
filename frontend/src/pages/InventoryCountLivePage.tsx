import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getInventorySession,
  getInventorySessionItems,
  getInventoryZones,
  recordInventoryCount,
} from '../lib/api';
import type { InventorySessionResponse, InventoryCountItemResponse } from '../types/api';
import QRScannerOverlay from '../components/QRScannerOverlay';

export default function InventoryCountLivePage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const { t, lang } = useLang();
  const { role } = useAuth();
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  const [session, setSession] = useState<InventorySessionResponse | null>(null);
  const [items, setItems] = useState<InventoryCountItemResponse[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeZone, setActiveZone] = useState<string>('');
  const [showDiscrepanciesOnly, setShowDiscrepanciesOnly] = useState(false);
  const [showUncountedOnly, setShowUncountedOnly] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track local edits before submitting
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // QR / barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  // 'increment' = each scan adds +1 automatically; 'focus' = scan scrolls to product
  const [scanMode, setScanMode] = useState<'increment' | 'focus'>('increment');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState<number | null>(null); // productId briefly highlighted
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    try {
      const [s, z] = await Promise.all([
        getInventorySession(sessionId),
        getInventoryZones(),
      ]);
      setSession(s);
      setZones(z);
      const i = await getInventorySessionItems(sessionId, activeZone || undefined, search || undefined);
      setItems(i);
    } catch {
      setError(t.invLoadError || 'Failed to load count data.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, activeZone, search, t]);

  useEffect(() => { load(); }, [load]);

  // Focus qty input when editing starts
  useEffect(() => {
    if (editingId !== null && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (item: InventoryCountItemResponse) => {
    setEditingId(item.productId);
    setEditQty(item.countedQty != null ? String(item.countedQty) : '');
    setEditNotes(item.notes || '');
  };

  const handleSubmitCount = async (productId: number) => {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) return;
    setSaving(productId);
    try {
      const updated = await recordInventoryCount(sessionId, productId, qty, editNotes || undefined);
      // Update item in list
      setItems(prev => prev.map(i => i.productId === productId ? updated : i));
      setEditingId(null);
      setEditQty('');
      setEditNotes('');
      // Update session progress
      const s = await getInventorySession(sessionId);
      setSession(s);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save count.');
    } finally {
      setSaving(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitCount(productId);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleScan = useCallback(async (value: string) => {
    setLastScanned(value);
    // Find matching item by SKU or barcode
    const item = items.find(
      i => i.productSku?.toLowerCase() === value.toLowerCase() ||
           i.productBarcode === value
    );
    if (!item) return;

    // Flash the item card
    setScanFlash(item.productId);
    setTimeout(() => setScanFlash(prev => prev === item.productId ? null : prev), 1200);

    // Scroll to item
    itemRefs.current[item.productId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (scanMode === 'increment' && session?.status === 'IN_PROGRESS') {
      // +1 increment mode: auto-save without opening the edit form
      const newQty = ((item.countedQty as any) ?? 0) + 1;
      setSaving(item.productId);
      try {
        const updated = await recordInventoryCount(sessionId, item.productId, newQty, item.notes || undefined);
        setItems(prev => prev.map(i => i.productId === item.productId ? updated : i));
        const s = await getInventorySession(sessionId);
        setSession(s);
      } catch {
        setError('Failed to save scan count.');
      } finally {
        setSaving(null);
      }
    } else {
      // Focus mode: open the edit form
      handleStartEdit(item);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, scanMode, session, sessionId]);

  // Filtered items
  let displayed = items;
  if (showDiscrepanciesOnly) {
    displayed = displayed.filter(i => i.discrepancy != null && i.discrepancy !== 0);
  }
  if (showUncountedOnly) {
    displayed = displayed.filter(i => i.countedQty == null);
  }

  const basePath = role === 'TECH' ? '/tech' : role === 'WORKER' ? '/worker' : '/admin';

  const progress = session && session.totalItems > 0
    ? Math.round((session.countedItems / session.totalItems) * 100) : 0;

  const isReadonly = session?.status === 'COMPLETED' || session?.status === 'CANCELLED';

  const card = `rounded-xl border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const input = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-surface-800 border-surface-600 text-white placeholder-surface-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const btnPrimary = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`;
  const btnSecondary = `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-surface-700 hover:bg-surface-600 text-surface-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`;

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[50vh] ${isDark ? 'text-surface-300' : ''}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className={isDark ? 'text-surface-400' : 'text-slate-500'}>{t.invSessionNotFound || 'Session not found.'}</p>
        <Link to={`${basePath}/inventory`} className={`mt-4 inline-block ${btnPrimary}`}>{t.invBackToSessions || 'Back'}</Link>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Sticky header with progress */}
      <div className={`${card} p-4 sticky top-0 z-30`}>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`${basePath}/inventory`} className={`text-sm ${isDark ? 'text-surface-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                &larr;
              </Link>
              <h1 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{session.name}</h1>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1">
                <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-surface-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
                {session.countedItems}/{session.totalItems} ({progress}%)
              </span>
            </div>
          </div>
          {session.discrepancyCount > 0 && (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              {session.discrepancyCount} {t.invDiscrepancies || 'diff'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <input
          ref={searchInputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.invSearchCount || 'Search product name, SKU, or scan barcode...'}
          className={`${input} !text-base !py-3`}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {/* Zone filters */}
          <button
            onClick={() => setActiveZone('')}
            className={`${btnSecondary} ${!activeZone ? '!ring-2 !ring-brand-500' : ''}`}
          >
            {t.invAllZones || 'All Zones'}
          </button>
          {zones.map(z => (
            <button
              key={z}
              onClick={() => setActiveZone(z === activeZone ? '' : z)}
              className={`${btnSecondary} ${z === activeZone ? '!ring-2 !ring-brand-500' : ''}`}
            >
              {z}
            </button>
          ))}
          <div className={`w-px h-6 self-center ${isDark ? 'bg-surface-700' : 'bg-slate-200'}`} />
          <button
            onClick={() => { setShowUncountedOnly(!showUncountedOnly); setShowDiscrepanciesOnly(false); }}
            className={`${btnSecondary} ${showUncountedOnly ? '!ring-2 !ring-amber-500 !text-amber-500' : ''}`}
          >
            {t.invUncountedOnly || 'Uncounted'}
          </button>
          <button
            onClick={() => { setShowDiscrepanciesOnly(!showDiscrepanciesOnly); setShowUncountedOnly(false); }}
            className={`${btnSecondary} ${showDiscrepanciesOnly ? '!ring-2 !ring-red-500 !text-red-500' : ''}`}
          >
            {t.invDiscrepanciesOnly || 'Discrepancies'}
          </button>
          {!isReadonly && (
            <>
              <div className={`w-px h-6 self-center ${isDark ? 'bg-surface-700' : 'bg-slate-200'}`} />
              <button
                onClick={() => setScanMode(m => m === 'increment' ? 'focus' : 'increment')}
                title={scanMode === 'increment' ? (t.invScanModeIncrement || '+1 per scan') : (t.invScanModeFocus || 'Find & edit')}
                className={`${btnSecondary} min-w-[3.5rem] ${scanMode === 'increment' ? '!ring-2 !ring-emerald-500 !text-emerald-500' : ''}`}
              >
                {scanMode === 'increment' ? '+1' : '🔍'}
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="2" y="2" width="7" height="7" rx="1"/>
                  <rect x="15" y="2" width="7" height="7" rx="1"/>
                  <rect x="2" y="15" width="7" height="7" rx="1"/>
                  <path d="M15 15h2m0 4h2M17 17v2M21 15v2m0 2v2"/>
                </svg>
                {t.invScan || 'Scan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items list — optimized for fast counting */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className={`${card} p-8 text-center ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
            {t.invNoItemsMatch || 'No items match your filters.'}
          </div>
        ) : displayed.map(item => {
          const isCounting = editingId === item.productId;
          const isSaving = saving === item.productId;
          const counted = item.countedQty != null;
          const hasDiscrepancy = item.discrepancy != null && item.discrepancy !== 0;

          return (
            <div
              key={item.id}
              ref={el => { itemRefs.current[item.productId] = el; }}
              className={`${card} p-3 sm:p-4 transition-all ${
                isCounting ? (isDark ? '!border-brand-500 !bg-surface-800' : '!border-brand-400 !bg-brand-50/30') : ''
              } ${hasDiscrepancy && counted ? (isDark ? '!border-amber-500/50' : '!border-amber-300') : ''} ${
                scanFlash === item.productId ? (isDark ? '!border-emerald-500 !bg-emerald-500/10' : '!border-emerald-400 !bg-emerald-50') : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                  counted
                    ? (hasDiscrepancy ? 'bg-amber-500' : 'bg-emerald-500')
                    : (isDark ? 'bg-surface-600' : 'bg-slate-300')
                }`} />

                <div className="flex-1 min-w-0">
                  {/* Product info */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.productName}
                      </p>
                      <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
                        <span className="font-mono">{item.productSku}</span>
                        {item.zone && <span>{item.zone}</span>}
                        {item.productBarcode && <span>{item.productBarcode}</span>}
                      </div>
                    </div>

                    {/* Expected qty badge */}
                    <div className={`text-right flex-shrink-0`}>
                      <div className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{t.invExpected || 'Expected'}</div>
                      <div className={`text-base font-bold tabular-nums ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                        {item.expectedQty} <span className="text-xs font-normal">{item.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Counting area */}
                  {isCounting ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          ref={qtyInputRef}
                          type="number"
                          step="0.01"
                          min="0"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, item.productId)}
                          placeholder="0"
                          className={`flex-1 ${input} !text-lg !py-3 !text-center font-bold tabular-nums`}
                          inputMode="decimal"
                        />
                        <button
                          onClick={() => handleSubmitCount(item.productId)}
                          disabled={isSaving}
                          className={`${btnPrimary} !px-6 !py-3 ${isSaving ? 'opacity-50' : ''}`}
                        >
                          {isSaving ? '...' : '✓'}
                        </button>
                      </div>
                      <input
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, item.productId)}
                        placeholder={t.invCountNotes || 'Notes (optional)'}
                        className={input}
                      />
                      <button onClick={() => setEditingId(null)} className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
                        {t.cancel || 'Cancel'}
                      </button>
                    </div>
                  ) : counted ? (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold tabular-nums ${
                          hasDiscrepancy
                            ? (isDark ? 'text-amber-400' : 'text-amber-600')
                            : (isDark ? 'text-emerald-400' : 'text-emerald-600')
                        }`}>
                          {item.countedQty} <span className="text-xs font-normal">{item.unit}</span>
                        </span>
                        {hasDiscrepancy && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.discrepancy! > 0
                              ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                              : (isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700')
                          }`}>
                            {item.discrepancy! > 0 ? '+' : ''}{item.discrepancy}
                          </span>
                        )}
                      </div>
                      {!isReadonly && (
                        <button onClick={() => handleStartEdit(item)} className={`${btnSecondary} !text-xs`}>
                          {t.invRecount || 'Recount'}
                        </button>
                      )}
                    </div>
                  ) : !isReadonly ? (
                    <button
                      onClick={() => handleStartEdit(item)}
                      className={`mt-2 w-full py-2.5 rounded-lg border-2 border-dashed text-sm font-medium transition-colors ${
                        isDark
                          ? 'border-surface-600 text-surface-400 hover:border-brand-500 hover:text-brand-400'
                          : 'border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600'
                      }`}
                    >
                      {t.invTapToCount || 'Tap to count'}
                    </button>
                  ) : (
                    <p className={`mt-2 text-sm italic ${isDark ? 'text-surface-600' : 'text-slate-300'}`}>
                      {t.invNotCounted || 'Not counted'}
                    </p>
                  )}

                  {/* Notes display */}
                  {item.notes && !isCounting && (
                    <p className={`mt-1 text-xs italic ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom stats */}
      <div className={`text-xs text-center pb-8 ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
        {displayed.length} {t.invItemsShowing || 'items'} · {session.countedItems}/{session.totalItems} {t.invCounted || 'counted'}
        {session.discrepancyCount > 0 && ` · ${session.discrepancyCount} ${t.invDiscrepancies || 'discrepancies'}`}
      </div>

      {/* QR / barcode scanner overlay */}
      {showScanner && (
        <QRScannerOverlay
          onScan={handleScan}
          onClose={() => { setShowScanner(false); setLastScanned(null); }}
          isDark={isDark}
          lastScanned={lastScanned}
        />
      )}
    </div>
  );
}
