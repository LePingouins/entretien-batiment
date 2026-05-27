import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getAdminRepTrips, getAdminRepTripsExportUrl,
  getPendingApprovalTrips, approveTrip, rejectTrip,
  getYtdTotals, getCraExportUrl,
} from '../lib/api';
import type { RepTrip, RepTripStop, RepTripStopReason } from '../types/api';
import PageHeader from '../components/PageHeader';
import TripDetailModal from '../components/TripDetailModal';
import api from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function stopIcon(reason: RepTripStopReason): string {
  const icons: Record<RepTripStopReason, string> = {
    CLIENT: '🤝', RESTAURANT: '🍽️', GAS: '⛽', OFFICE: '🏢', OTHER: '📍',
  };
  return icons[reason] ?? '📍';
}

// ─── AdminTripRow ─────────────────────────────────────────────────────────────

interface AdminTripRowProps {
  trip: RepTrip;
  isDark: boolean;
  t: Record<string, string>;
  onSelect: (trip: RepTrip) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  busy?: boolean;
}

const AdminTripRow: React.FC<AdminTripRowProps> = ({ trip, isDark, t, onSelect, onApprove, onReject, busy }) => {
  const [expanded, setExpanded] = useState(false);
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';
  const border = isDark ? 'border-surface-700' : 'border-slate-100';

  const approvalBadge = (() => {
    const m: Record<string, { l: string; c: string }> = {
      PENDING:       { l: '⏳ En attente',    c: isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800' },
      APPROVED:      { l: '✅ Approuvé',      c: isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800' },
      AUTO_APPROVED: { l: '✅ Auto',          c: isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700' },
      REJECTED:      { l: '⛔ Refusé',        c: isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800' },
    };
    const s = trip.approvalStatus ? m[trip.approvalStatus] : null;
    return s ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.c}`}>{s.l}</span> : null;
  })();

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-surface-700' : 'hover:bg-slate-50'}`}
        onClick={() => onSelect(trip)}
      >
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
          <div>{fmtDate(trip.date)}</div>
          <div className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
            {fmtTime(trip.createdAt)}
            {(() => {
              const endIso = trip.endedAt
                ?? (trip.durationMinutes != null ? new Date(new Date(trip.createdAt).getTime() + trip.durationMinutes * 60000).toISOString() : null);
              return endIso ? ` – ${fmtTime(endIso)}` : '';
            })()}
          </div>
        </td>
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.userEmail || `#${trip.userId}`}</td>
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.purpose || '—'}</td>
        <td className={`px-4 py-3 text-sm ${sub}`} title={trip.startAddress}>{truncate(trip.startAddress, 30)}</td>
        <td className={`px-4 py-3 text-sm ${sub}`} title={trip.endAddress}>{truncate(trip.endAddress, 30)}</td>
        <td className="px-4 py-3 text-sm font-semibold text-brand-500">
          {trip.totalKm != null ? `${trip.totalKm} km` : '—'}
        </td>
        <td className={`px-4 py-3 text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
          {trip.reimbursementCents != null ? `${(trip.reimbursementCents/100).toFixed(2)} $` : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1 items-start">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              trip.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {trip.status === 'IN_PROGRESS' ? t.repTripsStatusInProgress : t.repTripsStatusCompleted}
            </span>
            {approvalBadge}
          </div>
        </td>
        <td className={`px-4 py-3 text-sm text-center ${sub}`}>
          {trip.approvalStatus === 'PENDING' && onApprove && onReject ? (
            <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onApprove(trip.id)}
                disabled={busy}
                className="px-2 py-0.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                title="Approuver"
              >✓</button>
              <button
                onClick={() => {
                  const reason = window.prompt('Motif du refus :');
                  if (reason && reason.trim()) onReject(trip.id);
                }}
                disabled={busy}
                className="px-2 py-0.5 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                title="Refuser"
              >✕</button>
            </div>
          ) : trip.stops.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="underline"
            >
              {trip.stops.length} {expanded ? '▲' : '▼'}
            </button>
          ) : '—'}
        </td>
      </tr>
      {expanded && trip.stops.length > 0 && (
        <tr className={`border-t ${border}`}>
          <td colSpan={9} className={`px-6 py-3 ${isDark ? 'bg-surface-850' : 'bg-slate-50'}`}>
            <div className="space-y-1.5">
              {trip.stops.map((s) => (
                <div key={s.id} className={`flex items-center gap-3 text-sm ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
                  <span>{stopIcon(s.reason as RepTripStopReason)}</span>
                  <span className="font-medium">{s.address || t.repTripsNoAddress}</span>
                  <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{fmtTime(s.stoppedAt)}</span>
                  {s.notes && <span className={`text-xs italic ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>— {s.notes}</span>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

function truncate(s?: string, len = 40): string {
  if (!s) return '—';
  return s.length > len ? s.slice(0, len) + '…' : s;
}

// ─── AdminTripsPage ───────────────────────────────────────────────────────────

const AdminTripsPage: React.FC = () => {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  const [trips, setTrips] = useState<RepTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<RepTrip | null>(null);

  // V38: tabs (all vs pending approval)
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [approving, setApproving] = useState<number | null>(null);

  // V38: YTD totals
  const [ytd, setYtd] = useState<{ totalKm: number; reimbursementCents: number } | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<Array<{ id: number; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [exporting, setExporting] = useState(false);
  const [exportingCra, setExportingCra] = useState(false);

  // Load users for filter dropdown
  useEffect(() => {
    api.get('/api/admin/users').then((res) => {
      setUsers(res.data.map((u: any) => ({ id: u.id, email: u.email })));
    }).catch(() => {});
  }, []);

  // YTD widget (refreshes when user filter changes)
  useEffect(() => {
    getYtdTotals(selectedUserId).then(setYtd).catch(() => setYtd(null));
  }, [selectedUserId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = tab === 'pending'
        ? await getPendingApprovalTrips()
        : await getAdminRepTrips({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            userId: selectedUserId,
          });
      setTrips(data);
    } catch {
      setError(t.repTripsLoadError);
    } finally {
      setLoading(false);
    }
  }, [t, startDate, endDate, selectedUserId, tab]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = useCallback(async (id: number) => {
    setApproving(id);
    try {
      const updated = await approveTrip(id);
      setTrips(prev => tab === 'pending'
        ? prev.filter(t => t.id !== id)
        : prev.map(t => t.id === id ? updated : t));
    } catch {
      window.alert('Erreur lors de l\'approbation');
    } finally { setApproving(null); }
  }, [tab]);

  const handleReject = useCallback(async (id: number) => {
    const reason = window.prompt('Motif du refus :');
    if (!reason || !reason.trim()) return;
    setApproving(id);
    try {
      const updated = await rejectTrip(id, reason.trim());
      setTrips(prev => tab === 'pending'
        ? prev.filter(t => t.id !== id)
        : prev.map(t => t.id === id ? updated : t));
    } catch {
      window.alert('Erreur lors du refus');
    } finally { setApproving(null); }
  }, [tab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/api/rep-trips/admin/export', {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          userId: selectedUserId,
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kilométrage-représentants.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCra = async () => {
    setExportingCra(true);
    try {
      const url = getCraExportUrl({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedUserId,
      });
      const res = await api.get(url.replace(import.meta.env.VITE_API_URL || '', ''), { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'rapport-cra-kilometrage.csv';
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setExportingCra(false);
    }
  };

  // Stats
  const totalKm = trips.reduce((acc, t) => acc + (t.totalKm ?? 0), 0);
  const completedCount = trips.filter((t) => t.status === 'COMPLETED').length;
  const pendingCount = trips.filter((t) => t.approvalStatus === 'PENDING').length;

  const bg = isDark ? 'bg-surface-950' : 'bg-slate-50';
  const card = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const inp = isDark
    ? 'bg-surface-700 border-surface-600 text-white placeholder-surface-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const label = isDark ? 'text-surface-300' : 'text-slate-600';
  const th = isDark ? 'bg-surface-900 text-surface-400' : 'bg-slate-50 text-slate-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title={t.repTripsAdminTitle}
          subtitle={t.repTripsAdminSubtitle}
        />

        {/* V38: YTD widget */}
        {ytd && (
          <div className={`rounded-xl border p-4 ${card} flex flex-wrap items-baseline justify-between gap-3`}>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                Cumul depuis le {new Date(ytd && (ytd as any).fromDate || new Date().getFullYear() + '-01-01').toLocaleDateString('fr-CA')}
                {selectedUserId ? ' · utilisateur sélectionné' : ' · tous les utilisateurs'}
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {ytd.totalKm.toFixed(1)} km
                <span className={`ml-3 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {(ytd.reimbursementCents / 100).toFixed(2)} $
                </span>
              </p>
            </div>
          </div>
        )}

        {/* V38: Tabs (all / pending approval) */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'all'
              ? 'bg-brand-500 text-white'
              : isDark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >Tous les trajets</button>
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'pending'
              ? 'bg-amber-500 text-white'
              : isDark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            ⏳ À approuver
            {tab !== 'pending' && pendingCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{pendingCount}</span>
            )}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t.repTripsTotalKm, value: `${Math.round(totalKm * 10) / 10} km`, icon: '🛣️' },
            { label: t.repTripsStatusCompleted, value: String(completedCount), icon: '✅' },
            { label: t.repTripsStops, value: String(trips.reduce((acc, t) => acc + t.stops.length, 0)), icon: '📍' },
            { label: t.repTripsUser, value: String(new Set(trips.map((t) => t.userId)).size), icon: '👤' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
              <p className={`text-xs ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`rounded-xl border p-4 flex flex-wrap items-end gap-4 ${card}`}>
          <div>
            <label className={`block text-xs font-medium mb-1 ${label}`}>{t.repTripsFilterStart}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${label}`}>{t.repTripsFilterEnd}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${label}`}>{t.repTripsFilterUser}</label>
            <select
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            >
              <option value="">{t.repTripsAllUsers}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || trips.length === 0}
            className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exporting ? t.loading : t.repTripsExportCsv}
          </button>
          <button
            onClick={handleExportCra}
            disabled={exportingCra || trips.length === 0}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            title="Export pour comptable / impôt (Catégorie, Véhicule, Taux, Remboursement)"
          >
            📊 {exportingCra ? '…' : 'Export CRA'}
          </button>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Table */}
        {!loading && trips.length === 0 && (
          <p className={`text-center py-12 ${isDark ? 'text-surface-400' : 'text-slate-400'}`}>{t.repTripsNoTrips}</p>
        )}

        {!loading && trips.length > 0 && (
          <div className={`rounded-xl border overflow-hidden ${card}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${th}`}>
                    <th className="px-4 py-3 text-left">{t.repTripsDate}</th>
                    <th className="px-4 py-3 text-left">{t.repTripsUser}</th>
                    <th className="px-4 py-3 text-left">{t.repTripsPurpose}</th>
                    <th className="px-4 py-3 text-left">{t.repTripsFrom}</th>
                    <th className="px-4 py-3 text-left">{t.repTripsTo}</th>
                    <th className="px-4 py-3 text-left">{t.repTripsTotalKm}</th>
                    <th className="px-4 py-3 text-left">$ Remb.</th>
                    <th className="px-4 py-3 text-left">{t.repTripsStatus}</th>
                    <th className="px-4 py-3 text-center">{tab === 'pending' ? 'Action' : t.repTripsStops}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-surface-700' : 'divide-slate-100'}`}>
                  {trips.map((trip) => (
                    <AdminTripRow
                      key={trip.id}
                      trip={trip}
                      isDark={isDark}
                      t={t as unknown as Record<string, string>}
                      onSelect={setSelectedTrip}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      busy={approving === trip.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          isDark={isDark}
          onClose={() => setSelectedTrip(null)}
          onUpdate={(updated) => {
            setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelectedTrip(updated);
          }}
        />
      )}
    </div>
  );
};

export default AdminTripsPage;
