import axios, { AxiosError } from 'axios';
import { BASE_URL } from './config';
import { getToken, clearToken, Waypoint } from './storage';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    // Bypass the ngrok browser-warning interstitial for non-browser clients
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the token so the auth gate redirects to login
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearToken();
    }
    return Promise.reject(error);
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepTripStopReason = 'CLIENT' | 'RESTAURANT' | 'GAS' | 'OFFICE' | 'OTHER';

export interface RepTripStop {
  id: number;
  tripId: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  reason: RepTripStopReason;
  notes: string | null;
  stoppedAt: string;
}

export interface RepTrip {
  id: number;
  date: string;
  status: string;
  purpose: string | null;
  notes: string | null;
  startAddress: string | null;
  startLat: number | null;
  startLng: number | null;
  endAddress: string | null;
  endLat: number | null;
  endLng: number | null;
  totalKm: number | null;
  distanceMethod: string;
  createdAt: string;
  stops: RepTripStop[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post<{ accessToken: string }>('/api/auth/login', {
    email,
    password,
    rememberMeEnabled: true,
  });
  return res.data.accessToken;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function getMyTrips(): Promise<RepTrip[]> {
  const res = await api.get<RepTrip[]>('/api/rep-trips');
  return res.data;
}

export async function startTrip(payload: {
  startLat: number;
  startLng: number;
  startAddress: string;
  purpose?: string;
  distanceMethod?: string;
}): Promise<RepTrip> {
  const res = await api.post<RepTrip>('/api/rep-trips', {
    ...payload,
    distanceMethod: payload.distanceMethod ?? 'GPS',
  });
  return res.data;
}

export async function endTrip(
  id: number,
  endLat: number,
  endLng: number,
  endAddress: string,
  totalKm: number,
  durationMinutes: number,
  waypoints: Waypoint[]
): Promise<RepTrip> {
  const res = await api.patch<RepTrip>(`/api/rep-trips/${id}`, {
    status: 'COMPLETED',
    endLat,
    endLng,
    endAddress,
    totalKm,
    durationMinutes,
    waypointsJson: JSON.stringify(waypoints),
  });
  return res.data;
}

// ─── OSRM road distance ───────────────────────────────────────────────────────
// Sends a sample of GPS waypoints to OSRM and returns the road-snapped distance.
// Automatically samples to ≤60 points to stay within URL length limits.

export async function osrmRouteKm(waypoints: Waypoint[]): Promise<number | null> {
  if (waypoints.length < 2) return null;

  // Sample evenly, always keeping first and last points
  const MAX = 60;
  const step = Math.max(1, Math.floor(waypoints.length / MAX));
  const sampled: Waypoint[] = [];
  for (let i = 0; i < waypoints.length; i += step) {
    sampled.push(waypoints[i]);
  }
  const last = waypoints[waypoints.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  const coords = sampled.map(([lat, lng]) => `${lng},${lat}`).join(';');
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
      { headers: { 'User-Agent': 'EntretienBatiment/1.0' } }
    );
    const data: any = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return Math.round(data.routes[0].distance / 100) / 10; // metres → km (1 decimal)
    }
  } catch {}
  return null;
}

// ─── Google Routes distance (proxied through backend) ────────────────────────
// The mobile app sends waypoints to our Spring Boot backend, which calls
// Google Routes API server-side. The API key never leaves the server.

export async function googleRouteKm(waypoints: Waypoint[]): Promise<number | null> {
  if (waypoints.length < 2) return null;

  // Sample to at most 27 points (origin + 25 intermediates + destination)
  const MAX_TOTAL = 27;
  const step = Math.max(1, Math.floor(waypoints.length / MAX_TOTAL));
  const sampled: Waypoint[] = [];
  for (let i = 0; i < waypoints.length; i += step) {
    sampled.push(waypoints[i]);
  }
  const last = waypoints[waypoints.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  // Send only [lat, lng] pairs to the backend (strip timestamps)
  const pairs = sampled.map(([lat, lng]) => [lat, lng]);
  try {
    const res = await api.post<{ km: number | '' }>('/api/rep-trips/route-distance', pairs);
    const km = res.data.km;
    return typeof km === 'number' ? km : null;
  } catch {
    return null;
  }
}

// ─── Stops ────────────────────────────────────────────────────────────────────

export async function addStop(
  tripId: number,
  payload: { reason: RepTripStopReason; address?: string; lat?: number; lng?: number; notes?: string }
): Promise<RepTripStop> {
  const res = await api.post<RepTripStop>(`/api/rep-trips/${tripId}/stops`, payload);
  return res.data;
}

export async function deleteStop(tripId: number, stopId: number): Promise<void> {
  await api.delete(`/api/rep-trips/${tripId}/stops/${stopId}`);
}
