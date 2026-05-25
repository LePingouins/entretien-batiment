import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { RepTrip } from '../types/api';
import { findIdlePeriods, formatDuration, formatDurationMs } from '../lib/tripUtils';
import type { Waypoint } from '../lib/tripUtils';
import { updateRepTrip, reverseGeocode } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface TripDetailModalProps {
  trip: RepTrip;
  isDark: boolean;
  onClose: () => void;
  onUpdate?: (updated: RepTrip) => void;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
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

  const idlePeriods = useMemo(() => findIdlePeriods(waypoints), [waypoints]);

  // Map center: midpoint of route, or start coords, or end coords
  const hasStartCoords = trip.startLat != null && trip.startLng != null;
  const hasEndCoords = trip.endLat != null && trip.endLng != null;
  const showMap = polyline.length >= 2 || hasStartCoords || hasEndCoords;

  const mapCenter = useMemo<[number, number]>(() => {
    if (polyline.length > 0) {
      const midIdx = Math.floor(polyline.length / 2);
      return polyline[midIdx];
    }
    if (hasStartCoords) return [trip.startLat!, trip.startLng!];
    if (hasEndCoords) return [trip.endLat!, trip.endLng!];
    return [45.5, -73.6];
  }, [polyline, trip.startLat, trip.startLng, trip.endLat, trip.endLng, hasStartCoords, hasEndCoords]);

  const [flyCoord, setFlyCoord] = useState<[number, number] | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Reverse-geocoded addresses for auto-detected idle periods
  const [idleAddresses, setIdleAddresses] = useState<Record<number, string>>({});
  useEffect(() => {
    if (idlePeriods.length === 0) return;
    let cancelled = false;
    idlePeriods.forEach((idle, idx) => {
      reverseGeocode(idle.lat, idle.lng)
        .then(addr => { if (!cancelled) setIdleAddresses(prev => ({ ...prev, [idx]: addr })); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [idlePeriods]);

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
                  ?? (trip.durationMinutes != null ? new Date(new Date(trip.createdAt).getTime() + trip.durationMinutes * 60000).toISOString() : null);
                return endIso ? (
                  <span> – {new Date(endIso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
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
              <MapContainer
                center={mapCenter}
                zoom={polyline.length >= 2 ? 13 : 15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Route polyline — only when we have GPS trace */}
                {polyline.length >= 2 && (
                  <Polyline
                    positions={polyline}
                    pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.85 }}
                  />
                )}
                {/* Start marker */}
                {(polyline.length >= 1 || hasStartCoords) && (
                  <CircleMarker
                    center={polyline.length >= 1 ? polyline[0] : [trip.startLat!, trip.startLng!]}
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
                {(polyline.length >= 2 || hasEndCoords) && (
                  <CircleMarker
                    center={polyline.length >= 2 ? polyline[polyline.length - 1] : [trip.endLat!, trip.endLng!]}
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
                {/* Idle period markers */}
                {idlePeriods.map((idle, idx) => (
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
                <MapFlyTo coord={flyCoord} />
              </MapContainer>
              {polyline.length < 2 && (
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
              ?? (trip.durationMinutes != null ? new Date(new Date(trip.createdAt).getTime() + trip.durationMinutes * 60000).toISOString() : null);
            const reasonLabels: Record<string, string> = {
              CLIENT: 'Client', RESTAURANT: 'Restaurant',
              GAS: 'Carburant', OFFICE: 'Bureau', OTHER: 'Autre',
            };
            type TimelineEvent = {
              type: 'start' | 'stop' | 'idle' | 'end';
              time: string | null;
              label: string;
              sublabel?: string;
              coord: [number, number] | null;
              notes?: string;
              // idle-only fields
              resumeTime?: string;
              durationMs?: number;
            };
            const events: TimelineEvent[] = [
              {
                type: 'start', time: trip.createdAt, label: 'Départ',
                sublabel: trip.startAddress,
                coord: polyline.length >= 1 ? polyline[0] : hasStartCoords ? [trip.startLat!, trip.startLng!] : null,
              },
              ...trip.stops.map(s => ({
                type: 'stop' as const, time: s.stoppedAt,
                label: reasonLabels[s.reason] ?? s.reason,
                sublabel: s.address, notes: s.notes,
                coord: (s.lat != null && s.lng != null ? [s.lat, s.lng] : null) as [number, number] | null,
              })),
              ...idlePeriods.map((idle, idx) => ({
                type: 'idle' as const,
                time: new Date(idle.startTime).toISOString(),
                resumeTime: new Date(idle.resumeTime ?? idle.endTime).toISOString(),
                durationMs: idle.durationMs,
                label: 'Arrêt détecté',
                sublabel: idleAddresses[idx],
                coord: [idle.lat, idle.lng] as [number, number],
              })),
              ...(endIso || trip.endAddress ? [{
                type: 'end' as const, time: endIso, label: 'Arrivée',
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
                              {event.type === 'idle' && event.durationMs != null && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                  {formatDurationMs(event.durationMs)}
                                </span>
                              )}
                              {event.coord && <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>🗺️</span>}
                            </div>
                            {event.sublabel && <p className={`text-xs mt-0.5 ${sub}`}>{event.sublabel}</p>}
                            {event.type === 'idle' && event.resumeTime && (
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
