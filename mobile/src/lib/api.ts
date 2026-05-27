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

export type RepTripCategory = 'CLIENT' | 'PICKUP' | 'TRAINING' | 'PERSONAL' | 'OTHER';
export type RepTripApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';

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
  idealKm: number | null;
  actualKm: number | null;
  distanceSource: string | null;
  distanceMethod: string;
  createdAt: string;
  stops: RepTripStop[];
  // V38 fields
  actualPolyline?: string | null;
  osrmKm?: number | null;
  category?: RepTripCategory | null;
  approvalStatus?: RepTripApprovalStatus | null;
  reimbursementCents?: number | null;
  mileageRateCents?: number | null;
  suspicionFlags?: number | null;
  driverNote?: string | null;
  vehicleId?: number | null;
  locked?: boolean;
}

export interface Vehicle {
  id: number;
  label: string;
  licensePlate?: string | null;
  userId?: number | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
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
  // V38
  idempotencyKey?: string;
  category?: RepTripCategory;
  vehicleId?: number | null;
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
  waypoints: Waypoint[],
  extra?: {
    idealKm?: number; actualKm?: number; distanceSource?: string;
    // V38
    actualPolyline?: string;
    osrmKm?: number;
    driverNote?: string;
    category?: RepTripCategory;
    vehicleId?: number | null;
  }
): Promise<RepTrip> {
  const res = await api.patch<RepTrip>(`/api/rep-trips/${id}`, {
    status: 'COMPLETED',
    endLat,
    endLng,
    endAddress,
    totalKm,
    durationMinutes,
    waypointsJson: JSON.stringify(waypoints),
    ...(extra ?? {}),
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

export interface RouteDistanceResult {
  km: number;
  source: string;          // "actual" | "ideal_fallback" | "ideal_only" | etc.
  idealKm?: number;        // optimal Google route via stops (deterministic)
  actualKm?: number;       // route through filtered GPS (real path driven)
  polyline?: string;       // V38: Google-snapped encoded polyline
  osrmKm?: number;         // V38: OSRM cross-check distance
}

export async function googleRouteKm(waypoints: Waypoint[]): Promise<RouteDistanceResult | null> {
  if (waypoints.length < 2) return null;

  // Send full waypoints WITH timestamps so the backend can detect stationary
  // clusters and pick stable anchors (drift-free, deterministic routing).
  // Format: [lat, lng, timestampMs]
  const pairs = waypoints.map(([lat, lng, t]) => [lat, lng, t]);
  try {
    const res = await api.post<{ km: number | ''; source?: string; idealKm?: number; actualKm?: number; polyline?: string; osrmKm?: number }>(
      '/api/rep-trips/route-distance', pairs
    );
    const km = res.data.km;
    if (typeof km !== 'number') return null;
    return {
      km,
      source: res.data.source ?? 'unknown',
      idealKm: res.data.idealKm,
      actualKm: res.data.actualKm,
      polyline: res.data.polyline,
      osrmKm: res.data.osrmKm,
    };
  } catch {
    return null;
  }
}

// ─── Stops ────────────────────────────────────────────────────────────────────

export async function addStop(
  tripId: number,
  payload: { reason: RepTripStopReason; address?: string; lat?: number; lng?: number; notes?: string; stoppedAt?: string }
): Promise<RepTripStop> {
  const res = await api.post<RepTripStop>(`/api/rep-trips/${tripId}/stops`, payload);
  return res.data;
}

export async function deleteStop(tripId: number, stopId: number): Promise<void> {
  await api.delete(`/api/rep-trips/${tripId}/stops/${stopId}`);
}

// ─── V38: Vehicles ────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const res = await api.get<Vehicle[]>('/api/rep-trips/vehicles');
  return res.data;
}

// ─── V38: Photos ──────────────────────────────────────────────────────────────
// Uploads a photo (start/end/stop/other) for a trip via multipart form.
// `uri` is the local file URI from expo-image-picker / Camera.

export async function uploadTripPhoto(
  tripId: number,
  uri: string,
  kind: 'START' | 'END' | 'STOP' | 'OTHER' = 'OTHER',
  stopId?: number,
): Promise<{ id: number }> {
  const form = new FormData();
  // RN-style FormData file part
  const filename = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  form.append('file', { uri, name: filename, type: mime } as any);
  form.append('kind', kind);
  if (stopId != null) form.append('stopId', String(stopId));
  const res = await api.post(`/api/rep-trips/${tripId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { id: number };
}

// ─── V38: Idempotency-key generator (no extra dep) ───────────────────────────
// RFC4122 v4-ish using Math.random — collision-safe enough for client-side dedup.

export function generateIdempotencyKey(): string {
  const rand = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${rand()}${rand()}-${rand()}-4${rand().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${rand().slice(1)}-${rand()}${rand()}${rand()}`;
}
