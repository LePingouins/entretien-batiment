import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getRepTrips,
  startRepTrip,
  updateRepTrip,
  deleteRepTrip,
  archiveRepTrip,
  addRepTripStop,
  deleteRepTripStop,
  reverseGeocode,
  osrmRouteKm,
  googleRouteKm,
  getVehicles,
} from '../lib/api';
import type { RepTrip, RepTripStop, RepTripStopReason, RepTripCategory, Vehicle } from '../types/api';
import PageHeader from '../components/PageHeader';
import TripDetailModal from '../components/TripDetailModal';
import { formatDuration } from '../lib/tripUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureUtc(iso: string): string {
  if (!iso.endsWith('Z') && !/[+\-]\d{2}:\d{2}$/.test(iso)) return iso + 'Z';
  return iso;
}

function formatActiveDuration(startIso: string): string {
  const diffMs = Date.now() - new Date(ensureUtc(startIso)).getTime();
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min ${String(s).padStart(2, '0')}s`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(ensureUtc(iso)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type LocState = 'idle' | 'getting' | 'got' | 'error';

// ─── AddStopModal ──────────────────────────────────────────────────────────

interface AddStopModalProps {
  tripId: number;
  isDark: boolean;
  onClose: () => void;
  onAdded: (stop: RepTripStop) => void;
  t: Record<string, string>;
}

const STOP_REASONS: RepTripStopReason[] = ['CLIENT', 'RESTAURANT', 'GAS', 'OFFICE', 'OTHER'];

const AddStopModal: React.FC<AddStopModalProps> = ({ tripId, isDark, onClose, onAdded, t }) => {
  const [reason, setReason] = useState<RepTripStopReason>('CLIENT');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [locState, setLocState] = useState<LocState>('idle');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) { setLocState('error'); return; }
    setLocState('getting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la);
        setLng(lo);
        setLocState('got');
        const addr = await reverseGeocode(la, lo);
        setAddress(addr);
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const stop = await addRepTripStop(tripId, { reason, notes: notes || undefined, address: address || undefined, lat, lng });
      onAdded(stop);
    } finally {
      setSaving(false);
    }
  };

  const reasonLabel = (r: RepTripStopReason) => {
    const map: Record<RepTripStopReason, string> = {
      CLIENT: t.repTripsReasonClient,
      RESTAURANT: t.repTripsReasonRestaurant,
      GAS: t.repTripsReasonGas,
      OFFICE: t.repTripsReasonOffice,
      OTHER: t.repTripsReasonOther,
    };
    return map[r];
  };

  const card = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const label = isDark ? 'text-surface-300' : 'text-slate-600';
  const inp = isDark
    ? 'bg-surface-700 border-surface-600 text-white placeholder-surface-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.repTripsAddStop}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsStopReason}</label>
            <div className="flex flex-wrap gap-2">
              {STOP_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    reason === r
                      ? 'bg-brand-500 text-white border-brand-500'
                      : isDark
                      ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {reasonLabel(r)}
                </button>
              ))}
            </div>
          </div>

          {/* Address (auto from GPS) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsStopAddress}</label>
            {locState === 'getting' && (
              <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-400'}`}>{t.repTripsLocating}</p>
            )}
            {locState === 'error' && (
              <p className="text-sm text-red-500">{t.repTripsLocationError}</p>
            )}
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.repTripsNoAddress}
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsStopNotes}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.repTripsNotesPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || locState === 'getting'}
              className="flex-1 py-2 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {saving ? t.loading : t.repTripsAddStop}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg border font-medium text-sm transition-colors ${isDark ? 'border-surface-600 text-surface-300 hover:bg-surface-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── ActiveTripBanner ─────────────────────────────────────────────────────────

interface ActiveTripBannerProps {
  trip: RepTrip;
  isDark: boolean;
  t: Record<string, string>;
  onAddStop: () => void;
  onEndTrip: () => void;
  endingTrip: boolean;
}

const ActiveTripBanner: React.FC<ActiveTripBannerProps> = ({ trip, isDark, t, onAddStop, onEndTrip, endingTrip }) => {
  const [elapsed, setElapsed] = useState(() => formatActiveDuration(trip.createdAt));

  useEffect(() => {
    const id = setInterval(() => setElapsed(formatActiveDuration(trip.createdAt)), 1000);
    return () => clearInterval(id);
  }, [trip.createdAt]);

  return (
    <div className={`rounded-2xl border-2 border-brand-500 p-5 ${isDark ? 'bg-brand-950/40' : 'bg-brand-50'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className={`text-sm font-semibold ${isDark ? 'text-brand-300' : 'text-brand-700'}`}>{t.repTripsActiveTrip}</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.purpose || '—'}</p>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
            {t.repTripsStartedAt}: {fmtTime(trip.createdAt)} &nbsp;·&nbsp; {t.repTripsElapsed}: {elapsed}
          </p>
          {trip.startAddress && (
            <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
              📍 {trip.startAddress}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-col items-end">
          <div className="flex gap-2">
            <button
              onClick={onEndTrip}
              disabled={endingTrip}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {endingTrip ? t.loading : t.repTripsEndTrip}
            </button>
          </div>
          <p className={`text-xs text-center ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
            🔒 Cette application enregistre votre position GPS uniquement pendant les trajets actifs afin de calculer la distance remboursable.
          </p>
        </div>
      </div>

      {/* Stops so far */}
      {trip.stops.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {trip.stops.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 text-sm ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
              <span className="text-base">{stopIcon(s.reason)}</span>
              <span className="font-medium">{s.address || t.repTripsNoAddress}</span>
              <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{fmtTime(s.stoppedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function stopIcon(reason: RepTripStopReason): string {
  const icons: Record<RepTripStopReason, string> = {
    CLIENT: '🤝', RESTAURANT: '🍽️', GAS: '⛽', OFFICE: '🏢', OTHER: '📍',
  };
  return icons[reason] ?? '📍';
}

// ─── TripCard ─────────────────────────────────────────────────────────────────

interface TripCardProps {
  trip: RepTrip;
  isDark: boolean;
  t: Record<string, string>;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onDeleteStop: (tripId: number, stopId: number) => void;
  onSelect: (trip: RepTrip) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, isDark, t, onDelete, onArchive, onDeleteStop, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const card = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${card}`}
      onClick={() => onSelect(trip)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDark ? 'text-surface-300' : 'text-slate-500'}`}>
              {fmtDate(trip.date)}
              {' · '}{fmtTime(trip.createdAt)}
              {(() => {
                const endIso = trip.endedAt
                  ?? (trip.durationMinutes != null ? new Date(new Date(trip.createdAt).getTime() + trip.durationMinutes * 60000).toISOString() : null);
                return endIso ? ` – ${fmtTime(endIso)}` : '';
              })()}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              trip.status === 'IN_PROGRESS'
                ? 'bg-yellow-100 text-yellow-700'
                : isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {trip.status === 'IN_PROGRESS' ? t.repTripsStatusInProgress : t.repTripsStatusCompleted}
            </span>
          </div>
          <p className={`font-semibold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {trip.purpose || '—'}
          </p>
          <div className={`flex items-center gap-3 text-sm mt-1 flex-wrap ${sub}`}>
            {trip.startAddress && <span>📍 {trip.startAddress}</span>}
            {trip.endAddress && <span>🏁 {trip.endAddress}</span>}
            {trip.totalKm != null && (
              <span className="font-semibold text-brand-500">{trip.totalKm} {t.repTripsKm}</span>
            )}
            {trip.durationMinutes != null && (
              <span className={`text-xs ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>🕐 {formatDuration(trip.durationMinutes)}</span>
            )}
            {trip.distanceMethod === 'ROAD' || trip.distanceMethod === 'OSRM' ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-sky-900/50 text-sky-300' : 'bg-sky-100 text-sky-700'}`}>
                🛣️ {t.repTripsMethodBadgeRoad}
              </span>
            ) : trip.distanceMethod === 'GOOGLE' ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>
                🗺️ Google
              </span>
            ) : trip.distanceMethod === 'GPS' ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                📍 GPS
              </span>
            ) : (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-slate-100 text-slate-500'}`}>
                📏 {t.repTripsMethodBadgeStraight}
              </span>
            )}
            {trip.stops.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className={`text-xs underline ${isDark ? 'text-brand-400' : 'text-brand-600'}`}
              >
                {trip.stops.length} {t.repTripsStops} {expanded ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t.repTripsArchiveConfirm || 'Archive this trip?')) onArchive(trip.id);
          }}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${isDark ? 'text-surface-500 hover:text-brand-300 hover:bg-surface-700' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`}
          title={t.archive || 'Archive'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t.repTripsDeleteConfirm)) onDelete(trip.id);
          }}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${isDark ? 'text-surface-500 hover:text-red-400 hover:bg-surface-700' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
          title={t.delete}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      {/* Stops */}
      {expanded && trip.stops.length > 0 && (
        <div className={`mt-3 pt-3 border-t space-y-2 ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
          {trip.stops.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
                <span>{stopIcon(s.reason)}</span>
                <span>{s.address || t.repTripsNoAddress}</span>
                <span className={`text-xs ${sub}`}>{fmtTime(s.stoppedAt)}</span>
                {s.notes && <span className={`text-xs italic ${sub}`}>— {s.notes}</span>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStop(trip.id, s.id);
                }}
                className={`shrink-0 p-1 rounded transition-colors ${isDark ? 'text-surface-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'}`}
                title={t.repTripsDeleteStop}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── StartTripModal ───────────────────────────────────────────────────────────

interface StartTripModalProps {
  isDark: boolean;
  t: Record<string, string>;
  onClose: () => void;
  onStarted: (trip: RepTrip) => void;
}

const TRIP_CATEGORIES: { v: RepTripCategory; l: string }[] = [
  { v: 'CLIENT',   l: '🤝 Client' },
  { v: 'PICKUP',   l: '📦 Cueillette' },
  { v: 'TRAINING', l: '🎓 Formation' },
  { v: 'PERSONAL', l: '👤 Personnel' },
  { v: 'OTHER',    l: '📍 Autre' },
];

const StartTripModal: React.FC<StartTripModalProps> = ({ isDark, t, onClose, onStarted }) => {
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [locState, setLocState] = useState<LocState>('idle');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [distanceMethod] = useState<'HAVERSINE' | 'ROAD' | 'GOOGLE'>('GOOGLE');
  const [category, setCategory] = useState<RepTripCategory>('CLIENT');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  useEffect(() => {
    getVehicles().then((vs) => setVehicles(vs.filter((v) => v.active))).catch(() => {});
  }, []);

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) { setLocState('error'); return; }
    setLocState('getting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la);
        setLng(lo);
        setLocState('got');
        const addr = await reverseGeocode(la, lo);
        setAddress(addr);
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const trip = await startRepTrip({
        date: today,
        purpose: purpose.trim(),
        notes: notes.trim() || undefined,
        startAddress: address || undefined,
        startLat: lat,
        startLng: lng,
        distanceMethod,
        category,
        vehicleId: vehicleId ?? undefined,
      });
      onStarted(trip);
    } finally {
      setSaving(false);
    }
  };

  const card = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const label = isDark ? 'text-surface-300' : 'text-slate-600';
  const inp = isDark
    ? 'bg-surface-700 border-surface-600 text-white placeholder-surface-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.repTripsNewTrip}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Purpose */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsPurpose} *</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t.repTripsPurposePlaceholder}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
              autoFocus
            />
          </div>

          {/* Start address (from GPS) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsFrom}</label>
            {locState === 'getting' && (
              <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-400'}`}>{t.repTripsLocating}</p>
            )}
            {locState === 'error' && (
              <p className="text-sm text-orange-500">{t.repTripsLocationError}</p>
            )}
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.repTripsNoAddress}
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>{t.repTripsNotes}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.repTripsNotesPlaceholder}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${inp} focus:outline-none focus:ring-2 focus:ring-brand-400`}
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${label}`}>Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_CATEGORIES.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setCategory(c.v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === c.v
                      ? 'bg-brand-500 text-white border-brand-500'
                      : isDark
                      ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle (only shown when vehicles exist) */}
          {vehicles.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${label}`}>Véhicule</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleId(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    vehicleId == null
                      ? 'bg-brand-500 text-white border-brand-500'
                      : isDark
                      ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  — Aucun
                </button>
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleId(v.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      vehicleId === v.id
                        ? 'bg-brand-500 text-white border-brand-500'
                        : isDark
                        ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-brand-400'
                    }`}
                  >
                    🚗 {v.label}{v.licensePlate ? ` · ${v.licensePlate}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance method is always Google (with silent OSRM/haversine fallback) */}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !purpose.trim()}
              className="flex-1 py-2.5 rounded-lg bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {saving ? t.loading : '🚗 ' + t.repTripsNewTrip}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-lg border font-medium text-sm transition-colors ${isDark ? 'border-surface-600 text-surface-300 hover:bg-surface-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── RepTripsPage ─────────────────────────────────────────────────────────────

const RepTripsPage: React.FC = () => {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  const [trips, setTrips] = useState<RepTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<RepTrip | null>(null);

  const activeTrip = trips.find((t) => t.status === 'IN_PROGRESS');
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRepTrips();
      setTrips(data);
    } catch {
      setError(t.repTripsLoadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleStarted = (trip: RepTrip) => {
    setShowStartModal(false);
    setTrips((prev) => [trip, ...prev]);
  };

  const handleStopAdded = (stop: RepTripStop) => {
    setShowStopModal(false);
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === activeTrip?.id ? { ...trip, stops: [...trip.stops, stop] } : trip
      )
    );
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    if (!window.confirm(t.repTripsConfirmEndTrip)) return;
    setEndingTrip(true);
    try {
      let endLat: number | undefined;
      let endLng: number | undefined;
      let endAddress = '';

      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              endLat = pos.coords.latitude;
              endLng = pos.coords.longitude;
              endAddress = await reverseGeocode(endLat, endLng);
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }

      // Fetch road distance: Google first, OSRM fallback, then let backend use haversine
      let totalKm: number | undefined;
      const hasCoords =
        activeTrip.startLat != null && activeTrip.startLng != null &&
        endLat != null && endLng != null;
      if (hasCoords) {
        const gKm = await googleRouteKm(activeTrip.startLat!, activeTrip.startLng!, endLat!, endLng!);
        if (gKm != null) {
          totalKm = gKm;
        } else {
          // Silent fallback to OSRM
          const oKm = await osrmRouteKm(activeTrip.startLat!, activeTrip.startLng!, endLat!, endLng!);
          if (oKm != null) totalKm = oKm;
          // If both fail, totalKm stays undefined — backend haversine kicks in
        }
      }

      const updated = await updateRepTrip(activeTrip.id, {
        status: 'COMPLETED',
        endLat,
        endLng,
        endAddress: endAddress || undefined,
        ...(totalKm != null ? { totalKm } : {}),
      });
      setTrips((prev) => prev.map((trip) => (trip.id === updated.id ? updated : trip)));
    } finally {
      setEndingTrip(false);
    }
  };

  const handleDeleteTrip = async (id: number) => {
    await deleteRepTrip(id);
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const handleArchiveTrip = async (id: number) => {
    await archiveRepTrip(id);
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const handleDeleteStop = async (tripId: number, stopId: number) => {
    await deleteRepTripStop(tripId, stopId);
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === tripId ? { ...trip, stops: trip.stops.filter((s) => s.id !== stopId) } : trip
      )
    );
  };

  const bg = isDark ? 'bg-surface-950' : 'bg-slate-50';
  const heading = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title={t.repTripsTitle}
          subtitle={t.repTripsSubtitle}
        />

        {/* Start new trip button (only when no active trip) */}
        {!activeTrip && (
          <button
            onClick={() => setShowStartModal(true)}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold text-base hover:bg-brand-600 transition-colors shadow-sm"
          >
            🚗 {t.repTripsNewTrip}
          </button>
        )}

        {/* Active trip banner */}
        {activeTrip && (
          <ActiveTripBanner
            trip={activeTrip}
            isDark={isDark}
            t={t as unknown as Record<string, string>}
            onAddStop={() => setShowStopModal(true)}
            onEndTrip={handleEndTrip}
            endingTrip={endingTrip}
          />
        )}

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Completed trips list */}
        {!loading && completedTrips.length === 0 && !activeTrip && (
          <p className={`text-center py-12 ${sub}`}>{t.repTripsNoTrips}</p>
        )}

        {!loading && completedTrips.length > 0 && (
          <div className="space-y-3">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${sub}`}>{t.repTripsStatusCompleted}</h2>
            {completedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                isDark={isDark}
                t={t as unknown as Record<string, string>}
                onDelete={handleDeleteTrip}
                onArchive={handleArchiveTrip}
                onDeleteStop={handleDeleteStop}
                onSelect={setSelectedTrip}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showStartModal && (
        <StartTripModal
          isDark={isDark}
          t={t as unknown as Record<string, string>}
          onClose={() => setShowStartModal(false)}
          onStarted={handleStarted}
        />
      )}
      {showStopModal && activeTrip && (
        <AddStopModal
          tripId={activeTrip.id}
          isDark={isDark}
          t={t as unknown as Record<string, string>}
          onClose={() => setShowStopModal(false)}
          onAdded={handleStopAdded}
        />
      )}
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

export default RepTripsPage;
