import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RepTrip, RepTripAuditLog, RepTripPhoto } from '../types/api';
import { findIdlePeriods, formatDuration, formatDurationMs, computeStopDuration, decodePolyline, haversineM } from '../lib/tripUtils';
import type { Waypoint } from '../lib/tripUtils';
import {
  updateRepTrip, reverseGeocode,
  getTripAuditLog, getTripPhotos, fetchTripPhotoBlobUrl,
  approveTrip, rejectTrip, unlockTrip,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface TripDetailModalProps {
  trip: RepTrip;
  isDark: boolean;
  onClose: () => void;
  onUpdate?: (updated: RepTrip) => void;
}

/** Java LocalDateTime serializes without 'Z'; tell the browser to treat it as UTC. */
function ensureUtc(iso: string | null | undefined): string {
  if (!iso) return '';
  if (!iso.endsWith('Z') && !/[+\-]\d{2}:\d{2}$/.test(iso)) return iso + 'Z';
  return iso;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(ensureUtc(iso)).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(ensureUtc(iso)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function methodBadge(method?: string) {
  if (method === 'ROAD' || method === 'OSRM')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">🛣️ OSRM</span>;
  if (method === 'GOOGLE')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">🗺️ Google</span>;
  if (method === 'GPS')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">📍 GPS</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">📏 Droite</span>;
}

function MapFlyTo({ coord }: { coord: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) map.flyTo(coord, 16, { animate: true, duration: 0.8 } as Parameters<typeof map.flyTo>[2]);
  }, [coord, map]);
  return null;
}

const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, isDark, onClose, onUpdate }) => {
  const auth = useAuth();
  const isAdmin = auth?.role === 'ADMIN' || auth?.role === 'DEVELOPPER';

  // Admin edit state
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState(trip.startAddress ?? '');
  const [editEnd, setEditEnd] = useState(trip.endAddress ?? '');
  const [saving, setSaving] = useState(false);
  // Parse waypoints from JSON
  const waypoints = useMemo<Waypoint[]>(() => {
    if (!trip.waypointsJson) return [];
    try {
      const parsed = JSON.parse(trip.waypointsJson);
      if (Array.isArray(parsed)) return parsed as Waypoint[];
    } catch {}
    return [];
  }, [trip.waypointsJson]);

  const polyline = useMemo<[number, number][]>(
    () => waypoints.map(([lat, lng]) => [lat, lng]),
    [waypoints]
  );

  // ─── V38: Google-snapped polyline + view-mode toggle ────────────────────
  const googlePolyline = useMemo<[number, number][]>(
    () => trip.actualPolyline ? decodePolyline(trip.actualPolyline) : [],
    [trip.actualPolyline]
  );
  const [mapView, setMapView] = useState<'google' | 'gps' | 'both'>(
    googlePolyline.length >= 2 ? 'google' : 'gps'
  );

  // Numbered DivIcon for stops (#16). Created once per index range.
  const numberedIcon = (n: number) => L.divIcon({
    className: 'trip-stop-pin',
    html: `<div style="
      background:#fbbf24;color:#78350f;border:2px solid #b45309;
      border-radius:9999px;width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.3);
    ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  // ─── V38: Speed series (km/h vs elapsed minutes) for #17 graph ──────────
  const speedSeries = useMemo(() => {
    if (waypoints.length < 2) return [] as { t: number; kmh: number }[];
    const t0 = waypoints[0][2];
    const raw: { t: number; kmh: number }[] = [];
    for (let i = 1; i < waypoints.length; i++) {
      const [la, ln, t] = waypoints[i];
      const [pla, pln, pt] = waypoints[i - 1];
      const dtS = (t - pt) / 1000;
      if (dtS < 2) continue; // intervals < 2 s are too noisy to give reliable speed
      const dM = haversineM(pla, pln, la, ln);
      const kmh = (dM / 1000) / (dtS / 3600);
      raw.push({ t: (t - t0) / 60000, kmh: Math.min(130, kmh) });
    }
    // 5-point rolling average to smooth remaining GPS jitter
    const HALF = 2;
    const smoothed = raw.map((p, i) => {
      const slice = raw.slice(Math.max(0, i - HALF), Math.min(raw.length, i + HALF + 1));
      const avg = slice.reduce((s, x) => s + x.kmh, 0) / slice.length;
      return { t: p.t, kmh: avg };
    });
    // Anchor start and end at 0 km/h (vehicle starts and stops from rest)
    const lastT = (waypoints[waypoints.length - 1][2] - waypoints[0][2]) / 60000;
    return [{ t: 0, kmh: 0 }, ...smoothed, { t: lastT, kmh: 0 }];
  }, [waypoints]);

  // ─── V38: Trip replay (#18) ─────────────────────────────────────────────
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!replaying) {
      if (replayTimerRef.current) { clearInterval(replayTimerRef.current); replayTimerRef.current = null; }
      return;
    }
    const src = mapView === 'google' && googlePolyline.length >= 2 ? googlePolyline : polyline;
    if (src.length < 2) { setReplaying(false); return; }
    replayTimerRef.current = setInterval(() => {
      setReplayIdx(prev => {
        const next = (prev == null ? 0 : prev + 1);
        if (next >= src.length) { setReplaying(false); return null; }
        return next;
      });
    }, 50);
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replaying, mapView, googlePolyline, polyline]);

  const replayCoord: [number, number] | null = (() => {
    if (replayIdx == null) return null;
    const src = mapView === 'google' && googlePolyline.length >= 2 ? googlePolyline : polyline;
    return src[Math.min(replayIdx, src.length - 1)] ?? null;
  })();

  // ─── V38: Audit log + photos (lazy-loaded) ──────────────────────────────
  const [auditLog, setAuditLog] = useState<RepTripAuditLog[] | null>(null);
  const [photos, setPhotos] = useState<RepTripPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      try {
        const [logs, ph] = await Promise.all([
          getTripAuditLog(trip.id).catch(() => []),
          getTripPhotos(trip.id).catch(() => []),
        ]);
        if (cancelled) return;
        setAuditLog(logs);
        setPhotos(ph);
        // Fetch each photo as blob (auth-protected, can't use plain <img src>).
        for (const p of ph) {
          try {
            const url = await fetchTripPhotoBlobUrl(p.id);
            if (cancelled) { URL.revokeObjectURL(url); continue; }
            urls.push(url);
            setPhotoUrls(prev => ({ ...prev, [p.id]: url }));
          } catch {}
        }
      } catch {}
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); };
  }, [trip.id]);

  // Approve / reject state (admin only)
  const [approving, setApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  async function handleApprove() {
    setApproving(true);
    try {
      const updated = await approveTrip(trip.id);
      onUpdate?.(updated);
    } finally { setApproving(false); }
  }
  async function handleReject() {
    if (!rejectReason.trim()) return;
    setApproving(true);
    try {
      const updated = await rejectTrip(trip.id, rejectReason.trim());
      onUpdate?.(updated); setShowRejectBox(false); setRejectReason('');
    } finally { setApproving(false); }
  }
  async function handleUnlock() {
    if (!window.confirm('Déverrouiller ce trajet pour modification ?')) return;
    setApproving(true);
    try {
      const updated = await unlockTrip(trip.id);
      onUpdate?.(updated);
    } finally { setApproving(false); }
  }

  const idlePeriods = useMemo(() => findIdlePeriods(waypoints), [waypoints]);

  // Deduplicate: hide auto-detected idle periods that overlap (±5 min) with a manual stop.
  const filteredIdlePeriods = useMemo(() => {
    if (trip.stops.length === 0) return idlePeriods;
    const FIVE_MIN = 5 * 60_000;
    const stopTimesMs = trip.stops
      .map(s => new Date(ensureUtc(s.stoppedAt ?? '')).getTime())
      .filter(t => !isNaN(t) && t > 0);
    return idlePeriods.filter(
      idle => !stopTimesMs.some(stopMs => Math.abs(idle.startTime - stopMs) < FIVE_MIN)
    );
  }, [idlePeriods, trip.stops]);


  // Map center: midpoint of route, or start coords, or end coords
  const hasStartCoords = trip.startLat != null && trip.startLng != null;
  const hasEndCoords = trip.endLat != null && trip.endLng != null;
  const showMap = polyline.length >= 2 || googlePolyline.length >= 2 || hasStartCoords || hasEndCoords;

  const mapCenter = useMemo<[number, number]>(() => {
    if (googlePolyline.length > 0) {
      return googlePolyline[Math.floor(googlePolyline.length / 2)];
    }
    if (polyline.length > 0) {
      const midIdx = Math.floor(polyline.length / 2);
      return polyline[midIdx];
    }
    if (hasStartCoords) return [trip.startLat!, trip.startLng!];
    if (hasEndCoords) return [trip.endLat!, trip.endLng!];
    return [45.5, -73.6];
  }, [polyline, googlePolyline, trip.startLat, trip.startLng, trip.endLat, trip.endLng, hasStartCoords, hasEndCoords]);

  const [flyCoord, setFlyCoord] = useState<[number, number] | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Reverse-geocoded addresses for auto-detected idle periods
  const [idleAddresses, setIdleAddresses] = useState<Record<number, string>>({});
  useEffect(() => {
    if (filteredIdlePeriods.length === 0) return;
    let cancelled = false;
    filteredIdlePeriods.forEach((idle, idx) => {
      reverseGeocode(idle.lat, idle.lng)
        .then(addr => { if (!cancelled) setIdleAddresses(prev => ({ ...prev, [idx]: addr })); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [filteredIdlePeriods]);

  function flyTo(coord: [number, number] | null) {
    if (!coord) return;
    setFlyCoord([...coord] as [number, number]); // new array reference to always trigger effect
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Close on Escape (only when not editing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editing) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, editing]);

  async function handleSaveAddresses() {
    setSaving(true);
    try {
      const updated = await updateRepTrip(trip.id, {
        startAddress: editStart.trim(),
        endAddress: editEnd.trim(),
        // Pass totalKm through so the backend does not fall back to haversine
        ...(trip.totalKm != null ? { totalKm: trip.totalKm } : {}),
      });
      onUpdate?.(updated);
      setEditing(false);
    } catch {
      // keep edit mode open on error
    } finally {
      setSaving(false);
    }
  }

  const overlay = isDark ? 'bg-black/70' : 'bg-black/50';
  const card = isDark ? 'bg-surface-900 text-white' : 'bg-white text-slate-900';
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';
  const divider = isDark ? 'border-surface-700' : 'border-slate-200';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlay}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${card}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <div>
            <h2 className="text-lg font-bold">{trip.purpose || '—'}</h2>
            <p className={`text-sm ${sub}`}>
              {fmtDateTime(trip.createdAt)}
              {(() => {
                const endIso = trip.endedAt
                  ?? (trip.durationMinutes != null ? new Date(new Date(ensureUtc(trip.createdAt)).getTime() + trip.durationMinutes * 60000).toISOString() : null);
                return endIso ? (
                  <span> – {new Date(ensureUtc(endIso)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                ) : null;
              })()}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-surface-700 text-surface-300' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Stats row */}
          <div className={`grid grid-cols-3 divide-x ${divider} border-b ${divider}`}>
            <div className="px-4 py-3 text-center">
              <p className={`text-xs uppercase tracking-wide ${sub}`}>Distance</p>
              <p className="text-xl font-bold mt-0.5">
                {trip.totalKm != null ? `${trip.totalKm} km` : '—'}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className={`text-xs uppercase tracking-wide ${sub}`}>Durée</p>
              <p className="text-xl font-bold mt-0.5">
                {trip.durationMinutes != null ? formatDuration(trip.durationMinutes) : '—'}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className={`text-xs uppercase tracking-wide ${sub}`}>Méthode</p>
              <div className="mt-1 flex justify-center">{methodBadge(trip.distanceMethod)}</div>
            </div>
          </div>

          {/* Dual-distance audit panel — shows both Google numbers when present */}
          {(trip.idealKm != null || trip.actualKm != null) && (() => {
            const ideal = trip.idealKm;
            const actual = trip.actualKm;
            const diff = ideal != null && actual != null ? actual - ideal : null;
            const diffPct = ideal != null && actual != null && ideal > 0
              ? Math.round(((actual - ideal) / ideal) * 100) : null;
            const sourceLabel: Record<string, string> = {
              actual: 'Trajet réel',
              ideal_fallback: 'Route optimale (GPS rejeté)',
              ideal_only: 'Route optimale',
              actual_no_ideal: 'Trajet réel',
              haversine: 'Distance à vol d\'oiseau',
              osrm: 'OSRM',
            };
            const isFallback = trip.distanceSource === 'ideal_fallback';
            return (
              <div className={`px-5 py-3 border-b ${divider} ${isFallback ? (isDark ? 'bg-amber-900/10' : 'bg-amber-50') : ''}`}>
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div className="flex gap-5 flex-wrap">
                    {ideal != null && (
                      <div>
                        <p className={`text-xs ${sub}`}>Route optimale</p>
                        <p className="text-sm font-semibold">{ideal} km</p>
                      </div>
                    )}
                    {actual != null && (
                      <div>
                        <p className={`text-xs ${sub}`}>Trajet GPS</p>
                        <p className="text-sm font-semibold">{actual} km</p>
                      </div>
                    )}
                    {diff != null && (
                      <div>
                        <p className={`text-xs ${sub}`}>Écart</p>
                        <p className={`text-sm font-semibold ${diff > 0 ? (isDark ? 'text-amber-400' : 'text-amber-700') : ''}`}>
                          {diff >= 0 ? '+' : ''}{Math.round(diff * 10) / 10} km
                          {diffPct != null && ` (${diffPct >= 0 ? '+' : ''}${diffPct}%)`}
                        </p>
                      </div>
                    )}
                  </div>
                  {trip.distanceSource && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isFallback
                      ? (isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800')
                      : (isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {sourceLabel[trip.distanceSource] ?? trip.distanceSource}
                    </span>
                  )}
                </div>
                {isFallback && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>
                    Le trajet GPS reconstitué dépassait 2,5× la route optimale — probablement de la dérive GPS. La route optimale a été conservée pour le remboursement.
                  </p>
                )}
              </div>
            );
          })()}

          {/* V38: Approval / category / reimbursement bar */}
          {(() => {
            const cat = trip.category;
            const catLabel: Record<string, string> = {
              CLIENT: '🤝 Client', PICKUP: '📦 Récupération', TRAINING: '🎓 Formation',
              PERSONAL: '👤 Personnel', OTHER: '📍 Autre',
            };
            const status = trip.approvalStatus;
            const statusLabel: Record<string, { label: string; cls: string }> = {
              PENDING:        { label: '⏳ En attente',     cls: isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800' },
              APPROVED:       { label: '✅ Approuvé',       cls: isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800' },
              AUTO_APPROVED:  { label: '✅ Auto-approuvé',  cls: isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700' },
              REJECTED:       { label: '⛔ Refusé',         cls: isDark ? 'bg-red-900/40 text-red-300'     : 'bg-red-100 text-red-800' },
            };
            const reimb = trip.reimbursementCents != null ? (trip.reimbursementCents / 100).toFixed(2) : null;
            const rate = trip.mileageRateCents;
            const flags = trip.suspicionFlags ?? 0;
            const flagLabels = [
              { bit: 1,  label: '🌙 Heure inhabituelle' },
              { bit: 2,  label: '📅 Weekend' },
              { bit: 4,  label: '🚫 Sans waypoints' },
              { bit: 8,  label: '🎯 Km rond' },
              { bit: 16, label: '🚨 Distance anormale' },
              { bit: 32, label: '⚠️ Sans GPS fiable' },
            ];
            const activeFlags = flagLabels.filter(f => (flags & f.bit) !== 0);
            const hasContent = cat || status || reimb != null || activeFlags.length > 0 || trip.locked;
            if (!hasContent) return null;
            return (
              <div className={`px-5 py-3 border-b ${divider} flex flex-wrap items-center gap-2`}>
                {status && statusLabel[status] && (
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusLabel[status].cls}`}>
                    {statusLabel[status].label}
                  </span>
                )}
                {cat && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-700'}`}>
                    {catLabel[cat] ?? cat}
                  </span>
                )}
                {trip.locked && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                    🔒 Verrouillé
                  </span>
                )}
                {reimb && (
                  <span className={`ml-auto text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {reimb} $
                    {rate && <span className={`ml-1 text-xs font-normal ${sub}`}>({(rate/100).toFixed(2)} $/km)</span>}
                  </span>
                )}
                {activeFlags.length > 0 && (
                  <div className="w-full flex flex-wrap gap-1 mt-1">
                    {activeFlags.map(f => (
                      <span key={f.bit} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-700'}`}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
                {isAdmin && status === 'PENDING' && (
                  <div className="w-full flex gap-2 mt-2">
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >✅ Approuver</button>
                    <button
                      onClick={() => setShowRejectBox(v => !v)}
                      disabled={approving}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >⛔ Refuser</button>
                  </div>
                )}
                {isAdmin && showRejectBox && (
                  <div className="w-full mt-2 flex gap-2">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Motif du refus (obligatoire)"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs ${isDark ? 'bg-surface-800 border-surface-600 text-white' : 'bg-white border-slate-300'}`}
                    />
                    <button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || approving}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                    >Confirmer</button>
                  </div>
                )}
                {isAdmin && trip.locked && (
                  <button
                    onClick={handleUnlock}
                    disabled={approving}
                    className={`ml-auto text-[11px] px-2 py-1 rounded-lg border ${isDark ? 'border-surface-600 text-surface-300 hover:bg-surface-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >🔓 Déverrouiller</button>
                )}
              </div>
            );
          })()}

          {/* Addresses */}
          <div className={`px-5 py-4 border-b ${divider} space-y-2`}>
            {isAdmin && (
              <div className="flex justify-end mb-1">
                {editing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(false); setEditStart(trip.startAddress ?? ''); setEditEnd(trip.endAddress ?? ''); }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-surface-600 text-surface-300 hover:bg-surface-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveAddresses}
                      disabled={saving}
                      className="text-xs px-2.5 py-1 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-surface-600 text-surface-400 hover:bg-surface-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                  >
                    ✏️ Modifier adresses
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-3 items-start">
              <span className="text-green-500 mt-1.5">▲</span>
              <div className="flex-1">
                <p className={`text-xs ${sub}`}>Départ</p>
                {editing ? (
                  <input
                    type="text"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                    className={`w-full mt-0.5 px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${isDark ? 'bg-surface-800 border-surface-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  />
                ) : (
                  <p className="text-sm font-medium">{trip.startAddress || '—'}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-red-500 mt-1.5">▼</span>
              <div className="flex-1">
                <p className={`text-xs ${sub}`}>Arrivée</p>
                {editing ? (
                  <input
                    type="text"
                    value={editEnd}
                    onChange={e => setEditEnd(e.target.value)}
                    className={`w-full mt-0.5 px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${isDark ? 'bg-surface-800 border-surface-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  />
                ) : (
                  <p className="text-sm font-medium">{trip.endAddress || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          {showMap && (
            <div ref={mapRef} className="relative" style={{ height: 280, isolation: 'isolate' }}>
              {/* V38: view toggle (Google vs raw GPS) + replay controls */}
              {googlePolyline.length >= 2 && polyline.length >= 2 && (
                <div className="absolute top-2 left-2 z-[401] flex gap-1 bg-white/95 dark:bg-surface-800/95 rounded-lg shadow border border-slate-200 dark:border-surface-700 text-xs p-0.5">
                  {(['google','gps','both'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMapView(m)}
                      className={`px-2 py-1 rounded transition-colors ${mapView===m ? 'bg-brand-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-surface-700'}`}
                      title={m==='google'?'Route Google':m==='gps'?'GPS brut':'Les deux'}
                    >
                      {m==='google'?'🗺️ Google':m==='gps'?'📡 GPS':'🔀 Les 2'}
                    </button>
                  ))}
                </div>
              )}
              {(polyline.length >= 2 || googlePolyline.length >= 2) && (
                <div className="absolute top-2 right-2 z-[401] flex gap-1 bg-white/95 dark:bg-surface-800/95 rounded-lg shadow border border-slate-200 dark:border-surface-700 text-xs p-0.5">
                  <button
                    onClick={() => { setReplaying(r => !r); if (!replaying) setReplayIdx(0); }}
                    className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-surface-700"
                    title="Rejouer le trajet"
                  >
                    {replaying ? '⏸ Pause' : '▶ Rejouer'}
                  </button>
                  {replayIdx != null && (
                    <button
                      onClick={() => { setReplaying(false); setReplayIdx(null); }}
                      className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-surface-700"
                    >⏹</button>
                  )}
                </div>
              )}
              <MapContainer
                center={mapCenter}
                zoom={polyline.length >= 2 || googlePolyline.length >= 2 ? 13 : 15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Google snapped polyline (clean, road-aligned) */}
                {googlePolyline.length >= 2 && (mapView === 'google' || mapView === 'both') && (
                  <Polyline
                    positions={googlePolyline}
                    pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9 }}
                  />
                )}
                {/* Raw GPS polyline (driver-recorded) */}
                {polyline.length >= 2 && (mapView === 'gps' || mapView === 'both') && (
                  <Polyline
                    positions={polyline}
                    pathOptions={{ color: mapView === 'both' ? '#94a3b8' : '#3b82f6', weight: 3, opacity: mapView === 'both' ? 0.65 : 0.85, dashArray: mapView === 'both' ? '4 4' : undefined }}
                  />
                )}
                {/* Replay marker (#18) */}
                {replayCoord && (
                  <CircleMarker
                    center={replayCoord}
                    radius={10}
                    pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 1, weight: 3 }}
                  />
                )}
                {/* Start marker */}
                {(polyline.length >= 1 || googlePolyline.length >= 1 || hasStartCoords) && (
                  <CircleMarker
                    center={
                      googlePolyline.length >= 1 ? googlePolyline[0]
                        : polyline.length >= 1 ? polyline[0]
                        : [trip.startLat!, trip.startLng!]
                    }
                    radius={8}
                    pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
                  >
                    <Tooltip permanent direction="top" offset={[0, -10]}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Départ</div>
                        {trip.startAddress && <div style={{ color: '#6b7280', fontSize: '0.68rem', maxWidth: 160, lineHeight: 1.3, marginTop: 2 }}>{trip.startAddress}</div>}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                )}
                {/* End marker */}
                {(polyline.length >= 2 || googlePolyline.length >= 2 || hasEndCoords) && (
                  <CircleMarker
                    center={
                      googlePolyline.length >= 2 ? googlePolyline[googlePolyline.length - 1]
                        : polyline.length >= 2 ? polyline[polyline.length - 1]
                        : [trip.endLat!, trip.endLng!]
                    }
                    radius={8}
                    pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
                  >
                    <Tooltip permanent direction="top" offset={[0, -10]}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Arrivée</div>
                        {trip.endAddress && <div style={{ color: '#6b7280', fontSize: '0.68rem', maxWidth: 160, lineHeight: 1.3, marginTop: 2 }}>{trip.endAddress}</div>}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                )}
                {/* Idle period markers (deduplicated against manual stops) */}
                {filteredIdlePeriods.map((idle, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[idle.lat, idle.lng]}
                    radius={7}
                    pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Tooltip direction="top" offset={[0, -10]}>
                      Arrêt ~{formatDurationMs(idle.durationMs)}
                    </Tooltip>
                  </CircleMarker>
                ))}
                {/* V38: Saved stops with numbered pins (#16) */}
                {trip.stops.filter(s => s.lat != null && s.lng != null).map((s, idx) => {
                  const dur = computeStopDuration(waypoints, s.lat!, s.lng!);
                  return (
                    <Marker
                      key={`stop-${idx}`}
                      position={[s.lat!, s.lng!]}
                      icon={numberedIcon(idx + 1)}
                    >
                      <Tooltip direction="top" offset={[0, -14]}>
                        <div style={{ fontWeight: 600 }}>Arrêt #{idx+1}{dur ? ` · ~${formatDurationMs(dur)}` : ''}</div>
                        {s.address && <div style={{ color: '#6b7280', fontSize: '0.68rem', maxWidth: 160, lineHeight: 1.3, marginTop: 2 }}>{s.address}</div>}
                      </Tooltip>
                    </Marker>
                  );
                })}
                <MapFlyTo coord={flyCoord} />
              </MapContainer>
              {polyline.length < 2 && googlePolyline.length < 2 && (
                <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
                  <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full">
                    Trace GPS disponible pour les nouveaux trajets
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Parcours timeline — manual stops + auto-detected idle periods merged */}
          {(trip.startAddress || trip.stops.length > 0 || trip.endAddress || idlePeriods.length > 0) && (() => {
            const endIso = trip.endedAt
              ?? (trip.durationMinutes != null ? new Date(new Date(ensureUtc(trip.createdAt)).getTime() + trip.durationMinutes * 60000).toISOString() : null);
            const reasonLabels: Record<string, string> = {
              CLIENT: 'Client', RESTAURANT: 'Restaurant',
              GAS: 'Carburant', OFFICE: 'Bureau', OTHER: 'Pause',
            };
            type TimelineEvent = {
              type: 'start' | 'stop' | 'idle' | 'end';
              time: string | null;
              label: string;
              reason?: string;
              sublabel?: string;
              coord: [number, number] | null;
              notes?: string;
              // idle/stop fields
              resumeTime?: string;
              durationMs?: number;
            };
            const events: TimelineEvent[] = [
              {
                type: 'start', time: ensureUtc(trip.createdAt), label: 'Départ',
                sublabel: trip.startAddress,
                coord: polyline.length >= 1 ? polyline[0] : hasStartCoords ? [trip.startLat!, trip.startLng!] : null,
              },
              ...trip.stops.map(s => {
                const computedMs = (s.lat != null && s.lng != null)
                  ? computeStopDuration(waypoints, s.lat, s.lng)
                  : null;
                const durationMs = computedMs ?? (s.durationSeconds != null ? s.durationSeconds * 1000 : undefined);
                const resumeTime = durationMs != null
                  ? new Date(new Date(ensureUtc(s.stoppedAt)).getTime() + durationMs).toISOString()
                  : undefined;
                return {
                  type: 'stop' as const, time: ensureUtc(s.stoppedAt),
                  label: 'Arrêt',
                  reason: reasonLabels[s.reason] ?? s.reason,
                  sublabel: s.address, notes: s.notes,
                  coord: (s.lat != null && s.lng != null ? [s.lat, s.lng] : null) as [number, number] | null,
                  durationMs,
                  resumeTime,
                };
              }),
              ...filteredIdlePeriods.map((idle, idx) => ({
                type: 'idle' as const,
                time: new Date(idle.startTime).toISOString(),
                resumeTime: new Date(idle.resumeTime ?? idle.endTime).toISOString(),
                durationMs: idle.durationMs,
                label: 'Arrêt détecté',
                sublabel: idleAddresses[idx],
                coord: [idle.lat, idle.lng] as [number, number],
              })),
              ...(endIso || trip.endAddress ? [{
                type: 'end' as const, time: ensureUtc(endIso), label: 'Arrivée',
                sublabel: trip.endAddress,
                coord: (polyline.length >= 2 ? polyline[polyline.length - 1] : hasEndCoords ? [trip.endLat!, trip.endLng!] : null) as [number, number] | null,
              }] : []),
            ].sort((a, b) => {
              if (!a.time) return 1;
              if (!b.time) return -1;
              return new Date(a.time).getTime() - new Date(b.time).getTime();
            });

            return (
              <div className={`px-5 py-4 border-t ${divider}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Parcours</h3>
                  {trip.durationMinutes != null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'}`}>
                      🕐 {formatDuration(trip.durationMinutes)} total
                    </span>
                  )}
                </div>
                <div>
                  {events.map((event, idx) => {
                    const next = events[idx + 1];
                    const segMs = next?.time && event.time
                      ? new Date(next.time).getTime() - new Date(event.time).getTime()
                      : null;
                    const dotClass = event.type === 'start'
                      ? 'bg-green-500 text-white'
                      : event.type === 'end'
                      ? 'bg-red-500 text-white'
                      : `text-sm ${isDark ? 'bg-surface-800 border-amber-500' : 'bg-white border-amber-400'} border-2`;
                    const timeClass = event.type === 'start' ? 'text-green-600'
                      : event.type === 'end' ? 'text-red-600'
                      : isDark ? 'text-amber-400' : 'text-amber-600';
                    const hoverClass = event.type === 'start'
                      ? 'hover:bg-green-50 dark:hover:bg-green-900/20'
                      : event.type === 'end'
                      ? 'hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'hover:bg-amber-50 dark:hover:bg-amber-900/20';
                    const dotIcon = event.type === 'start' ? 'D' : event.type === 'end' ? 'A' : event.type === 'idle' ? '🅿' : '⏸';
                    return (
                      <div key={idx}>
                        <div
                          className={`flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${event.coord ? `cursor-pointer ${hoverClass}` : ''}`}
                          onClick={() => flyTo(event.coord)}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold ${dotClass}`}>
                            {dotIcon}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {event.time && <span className={`text-xs font-semibold ${timeClass}`}>{fmtTime(event.time)}</span>}
                              <span className="text-xs font-medium">{event.label}</span>
                              {event.reason && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'}`}>
                                  {event.reason}
                                </span>
                              )}
                              {event.type === 'idle' && event.durationMs != null && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                  {formatDurationMs(event.durationMs)}
                                </span>
                              )}
                              {event.type === 'stop' && event.durationMs != null && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                  {formatDurationMs(event.durationMs)}
                                </span>
                              )}
                              {event.coord && <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>🗺️</span>}
                            </div>
                            {event.sublabel && <p className={`text-xs mt-0.5 ${sub}`}>{event.sublabel}</p>}
                            {(event.type === 'idle' || event.type === 'stop') && event.resumeTime && (
                              <p className={`text-xs mt-0.5 ${sub}`}>
                                Reprise à {fmtTime(event.resumeTime)}
                              </p>
                            )}
                            {event.notes && <p className={`text-xs mt-0.5 italic ${sub}`}>{event.notes}</p>}
                          </div>
                        </div>
                        {/* Segment duration connector */}
                        {idx < events.length - 1 && (
                          <div className={`flex items-center gap-2 ml-3.5 pl-3 py-1 border-l-2 ${isDark ? 'border-surface-600' : 'border-slate-200'}`}>
                            {segMs != null && segMs > 0 ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-slate-100 text-slate-500'}`}>
                                ⏱ {formatDurationMs(segMs)}
                              </span>
                            ) : (
                              <span className={`text-xs ${isDark ? 'text-surface-600' : 'text-slate-300'}`}>⋯</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}



          {/* V38: Driver note (#9) */}
          {trip.driverNote && (
            <div className={`px-5 py-3 border-t ${divider}`}>
              <h3 className="text-sm font-semibold mb-1">💬 Commentaire du conducteur</h3>
              <p className={`text-sm ${sub}`}>{trip.driverNote}</p>
            </div>
          )}

          {/* V38: Speed graph (#17) — inline SVG */}
          {speedSeries.length >= 5 && (() => {
            const W = 600, H = 110, PAD_L = 42, PAD_B = 18, PAD_T = 8;
            const maxKmh = Math.max(...speedSeries.map(p => p.kmh), 60);
            const maxT = speedSeries[speedSeries.length - 1].t;
            if (maxT <= 0) return null;
            const sx = (t: number) => PAD_L + (t / maxT) * (W - PAD_L - 6);
            const sy = (k: number) => H - PAD_B - (k / maxKmh) * (H - PAD_B - PAD_T);
            const path = speedSeries.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(1)} ${sy(p.kmh).toFixed(1)}`).join(' ');
            const ticks = [0, Math.round(maxKmh / 2), Math.round(maxKmh)];
            return (
              <div className={`px-5 py-4 border-t ${divider}`}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold">📈 Vitesse</h3>
                  <span className={`text-xs ${sub}`}>(km/h)</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
                  {/* Grid + Y labels */}
                  {ticks.map(k => (
                    <g key={k}>
                      <line x1={PAD_L} y1={sy(k)} x2={W - 4} y2={sy(k)}
                        stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={1} strokeDasharray="2 3" />
                      <text x={PAD_L - 6} y={sy(k) + 4} fontSize={10} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'}>{k}</text>
                    </g>
                  ))}
                  {/* X axis at bottom */}
                  <line x1={PAD_L} y1={H - PAD_B} x2={W - 4} y2={H - PAD_B} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth={1} />
                  {/* Y axis */}
                  <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth={1} />
                  {/* Speed line */}
                  <path d={path} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
                  {/* X labels: 0 / end (minutes) */}
                  <text x={PAD_L} y={H - 3} fontSize={10} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'}>0</text>
                  <text x={W - 6} y={H - 3} fontSize={10} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'}>{Math.round(maxT)} min</text>
                </svg>
              </div>
            );
          })()}

          {/* V38: Photos (#11) */}
          {photos.length > 0 && (
            <div className={`px-5 py-4 border-t ${divider}`}>
              <h3 className="text-sm font-semibold mb-2">📷 Photos ({photos.length})</h3>
              <div className="grid grid-cols-4 gap-2">
                {photos.map(p => {
                  const url = photoUrls[p.id];
                  return (
                    <a
                      key={p.id}
                      href={url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`block aspect-square rounded-lg overflow-hidden border ${isDark ? 'border-surface-700 bg-surface-800' : 'border-slate-200 bg-slate-100'}`}
                      title={`${p.kind || 'photo'} · ${new Date(p.createdAt).toLocaleString()}`}
                    >
                      {url
                        ? <img src={url} alt={p.kind || 'Photo'} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">⏳</div>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* V38: Audit log (#3) */}
          {auditLog && auditLog.length > 0 && (
            <div className={`px-5 py-4 border-t ${divider}`}>
              <h3 className="text-sm font-semibold mb-2">📋 Journal d'audit</h3>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {auditLog.map(log => {
                  const actionLabel: Record<string, string> = {
                    CREATED: '🟢 Création',
                    UPDATED: '✏️ Modifié',
                    APPROVED: '✅ Approuvé',
                    REJECTED: '⛔ Refusé',
                    UNLOCKED: '🔓 Déverrouillé',
                    LOCKED: '🔒 Verrouillé',
                  };
                  return (
                    <div key={log.id} className={`text-xs flex items-baseline gap-2 ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
                      <span className={`font-mono ${sub}`}>{new Date(log.createdAt).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span className="font-medium whitespace-nowrap">{actionLabel[log.action] ?? log.action}</span>
                      {log.actorEmail && <span className={sub}>par {log.actorEmail}</span>}
                      {log.summary && <span className={`${sub} truncate`}>— {log.summary}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {trip.notes && (
            <div className={`px-5 py-4 border-t ${divider}`}>
              <h3 className="text-sm font-semibold mb-1">Notes</h3>
              <p className={`text-sm ${sub}`}>{trip.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;
