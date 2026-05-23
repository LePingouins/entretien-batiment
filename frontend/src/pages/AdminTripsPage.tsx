import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { getAdminRepTrips, getAdminRepTripsExportUrl } from '../lib/api';
import type { RepTrip, RepTripStop, RepTripStopReason } from '../types/api';
import PageHeader from '../components/PageHeader';
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
}

const AdminTripRow: React.FC<AdminTripRowProps> = ({ trip, isDark, t }) => {
  const [expanded, setExpanded] = useState(false);
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';
  const border = isDark ? 'border-surface-700' : 'border-slate-100';

  return (
    <>
      <tr
        className={`cursor-pointer hover:${isDark ? 'bg-surface-750' : 'bg-slate-50'} transition-colors`}
        onClick={() => setExpanded((e) => !e)}
      >
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{fmtDate(trip.date)}</td>
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.userEmail || `#${trip.userId}`}</td>
        <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.purpose || '—'}</td>
        <td className={`px-4 py-3 text-sm ${sub}`} title={trip.startAddress}>{truncate(trip.startAddress, 30)}</td>
        <td className={`px-4 py-3 text-sm ${sub}`} title={trip.endAddress}>{truncate(trip.endAddress, 30)}</td>
        <td className="px-4 py-3 text-sm font-semibold text-brand-500">
          {trip.totalKm != null ? `${trip.totalKm} km` : '—'}
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            trip.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {trip.status === 'IN_PROGRESS' ? t.repTripsStatusInProgress : t.repTripsStatusCompleted}
          </span>
        </td>
        <td className={`px-4 py-3 text-sm text-center ${sub}`}>
          {trip.stops.length > 0 ? (
            <span className="underline">{trip.stops.length} {expanded ? '▲' : '▼'}</span>
          ) : '—'}
        </td>
      </tr>
      {expanded && trip.stops.length > 0 && (
        <tr className={`border-t ${border}`}>
          <td colSpan={8} className={`px-6 py-3 ${isDark ? 'bg-surface-850' : 'bg-slate-50'}`}>
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

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<Array<{ id: number; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [exporting, setExporting] = useState(false);

  // Load users for filter dropdown
  useEffect(() => {
    api.get('/api/admin/users').then((res) => {
      setUsers(res.data.map((u: any) => ({ id: u.id, email: u.email })));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminRepTrips({
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
  }, [t, startDate, endDate, selectedUserId]);

  useEffect(() => { load(); }, [load]);

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

  // Stats
  const totalKm = trips.reduce((acc, t) => acc + (t.totalKm ?? 0), 0);
  const completedCount = trips.filter((t) => t.status === 'COMPLETED').length;

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
                    <th className="px-4 py-3 text-left">{t.repTripsStatus}</th>
                    <th className="px-4 py-3 text-center">{t.repTripsStops}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-surface-700' : 'divide-slate-100'}`}>
                  {trips.map((trip) => (
                    <AdminTripRow
                      key={trip.id}
                      trip={trip}
                      isDark={isDark}
                      t={t as unknown as Record<string, string>}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTripsPage;
