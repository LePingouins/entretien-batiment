import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurrentUser, PageKey } from '../types/api';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const OFFLINE_LOGIN_KEY = 'offline_login_verifier';
const ACTIVE_TRIP_ID_KEY = 'active_trip_id';
const ACTIVE_TRIP_START_KEY = 'active_trip_start';
const ACTIVE_TRIP_METHOD_KEY = 'active_trip_method';
const ACTIVE_TRIP_START_COORDS_KEY = 'active_trip_start_coords';
const WAYPOINTS_PREFIX = 'trip_waypoints_';
const PLANNED_END_KEY = 'planned_end_address';
const CACHED_AUTH_KEY = 'cached_authenticated_user';
const PENDING_TRIPS_KEY = 'pending_rep_trips';
const API_CACHE_PREFIX = 'offline_api_cache:';
const ACTIVE_TRIP_OWNER_KEY = 'active_trip_owner_id';

let pendingTripsWrite: Promise<void> = Promise.resolve();
let waypointWrite: Promise<void> = Promise.resolve();

export interface CachedAuth {
  user: CurrentUser;
  access: Partial<Record<PageKey, boolean>>;
}

interface OfflineLoginVerifier {
  email: string;
  salt: string;
  passwordHash: string;
  expiresAt: number;
}

export interface PendingTripStart {
  startLat: number;
  startLng: number;
  startAddress: string;
  purpose?: string;
  distanceMethod?: string;
  idempotencyKey: string;
  category?: string;
  vehicleId?: number | null;
}

export interface PendingTripCompletion {
  endLat: number;
  endLng: number;
  endAddress: string;
  totalKm: number;
  durationMinutes: number;
  waypoints: Waypoint[];
  extra?: {
    idealKm?: number;
    actualKm?: number;
    distanceSource?: string;
    actualPolyline?: string;
    osrmKm?: number;
    driverNote?: string;
    category?: string;
    vehicleId?: number | null;
  };
}

export interface PendingTripStop {
  localStopId: number;
  operationId: string;
  reason: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  stoppedAt?: string;
}

export interface PendingTripPhoto {
  localPhotoId: number;
  operationId: string;
  uri: string;
  kind: 'START' | 'END' | 'STOP' | 'OTHER';
  stopId?: number;
}

export interface PendingTrip {
  ownerUserId: number;
  localId: number;
  serverId?: number;
  startedAt: string;
  start?: PendingTripStart;
  completion?: PendingTripCompletion;
  completionSynced?: boolean;
  stops: PendingTripStop[];
  photos: PendingTripPhoto[];
}

// ─── JWT Token ────────────────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  // AFTER_FIRST_UNLOCK (not WHEN_UNLOCKED) so the token stays readable while the
  // phone is locked — needed since trip GPS tracking and auto-refresh happen
  // in the background, often while the device is locked in a pocket. Reading
  // under WHEN_UNLOCKED could fail with the device locked and look like a
  // logged-out session even though the refresh token was still valid.
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function saveSession(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    saveToken(accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }),
  ]);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearSessionTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function clearToken(): Promise<void> {
  await Promise.all([
    clearSessionTokens(),
    SecureStore.deleteItemAsync(OFFLINE_LOGIN_KEY),
    AsyncStorage.removeItem(CACHED_AUTH_KEY),
    clearApiCache(),
  ]);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function offlinePasswordHash(email: string, password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${email.trim().toLowerCase()}:${password}`,
  );
}

export async function saveOfflineLogin(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const passwordHash = await offlinePasswordHash(normalizedEmail, password, salt);
  const verifier: OfflineLoginVerifier = {
    email: normalizedEmail,
    salt,
    passwordHash,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  await SecureStore.setItemAsync(OFFLINE_LOGIN_KEY, JSON.stringify(verifier), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearOfflineLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(OFFLINE_LOGIN_KEY);
}

export async function verifyOfflineLogin(email: string, password: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(OFFLINE_LOGIN_KEY);
  if (!value) return false;
  try {
    const verifier = JSON.parse(value) as OfflineLoginVerifier;
    const normalizedEmail = email.trim().toLowerCase();
    if (verifier.expiresAt < Date.now() || verifier.email !== normalizedEmail) return false;
    return await offlinePasswordHash(normalizedEmail, password, verifier.salt) === verifier.passwordHash;
  } catch {
    await clearOfflineLogin();
    return false;
  }
}

export async function clearCachedAuthData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(CACHED_AUTH_KEY),
    clearApiCache(),
  ]);
}

export async function claimLegacyActiveTrip(userId: number): Promise<void> {
  const [activeId, owner] = await Promise.all([
    AsyncStorage.getItem(ACTIVE_TRIP_ID_KEY),
    AsyncStorage.getItem(ACTIVE_TRIP_OWNER_KEY),
  ]);
  if (activeId && !owner) await AsyncStorage.setItem(ACTIVE_TRIP_OWNER_KEY, String(userId));
}

export async function saveCachedAuth(cachedAuth: CachedAuth): Promise<void> {
  await AsyncStorage.setItem(CACHED_AUTH_KEY, JSON.stringify(cachedAuth));
}

export async function getCachedAuth(): Promise<CachedAuth | null> {
  const value = await AsyncStorage.getItem(CACHED_AUTH_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as CachedAuth;
  } catch {
    await AsyncStorage.removeItem(CACHED_AUTH_KEY);
    return null;
  }
}

export async function saveApiCache(key: string, data: unknown): Promise<void> {
  await AsyncStorage.setItem(`${API_CACHE_PREFIX}${key}`, JSON.stringify({ data, savedAt: Date.now() }));
}

export async function getApiCache<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(`${API_CACHE_PREFIX}${key}`);
  if (!value) return null;
  try {
    return (JSON.parse(value) as { data: T }).data;
  } catch {
    await AsyncStorage.removeItem(`${API_CACHE_PREFIX}${key}`);
    return null;
  }
}

async function clearApiCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cachedKeys = keys.filter((key) => key.startsWith(API_CACHE_PREFIX));
  if (cachedKeys.length > 0) await AsyncStorage.multiRemove(cachedKeys);
}

// ─── Offline trip queue ──────────────────────────────────────────────────────

export async function getPendingTrips(): Promise<PendingTrip[]> {
  await pendingTripsWrite;
  return readPendingTrips();
}

async function readPendingTrips(): Promise<PendingTrip[]> {
  const value = await AsyncStorage.getItem(PENDING_TRIPS_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as PendingTrip[];
  } catch {
    await AsyncStorage.removeItem(PENDING_TRIPS_KEY);
    return [];
  }
}

async function savePendingTrips(trips: PendingTrip[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_TRIPS_KEY, JSON.stringify(trips));
}

async function mutatePendingTrips(mutator: (trips: PendingTrip[]) => void): Promise<void> {
  const operation = pendingTripsWrite.then(async () => {
    const trips = await readPendingTrips();
    mutator(trips);
    await savePendingTrips(trips);
  });
  pendingTripsWrite = operation.catch(() => undefined);
  return operation;
}

async function currentUserId(): Promise<number> {
  const cached = await getCachedAuth();
  if (!cached) throw new Error('No authenticated user is available for offline storage');
  return cached.user.id;
}

export async function queuePendingTripStart(
  localId: number,
  start: PendingTripStart,
  startedAt: string,
  serverId?: number,
): Promise<void> {
  const ownerUserId = await currentUserId();
  await mutatePendingTrips((trips) => {
    const existing = trips.find((trip) => trip.ownerUserId === ownerUserId && (trip.localId === localId || trip.serverId === serverId));
    if (existing) {
      existing.start = start;
      existing.startedAt = startedAt;
      existing.serverId = serverId ?? existing.serverId;
    } else {
      trips.push({ ownerUserId, localId, serverId, startedAt, start, stops: [], photos: [] });
    }
  });
}

export async function queuePendingTripCompletion(id: number, completion: PendingTripCompletion): Promise<void> {
  const ownerUserId = await currentUserId();
  await mutatePendingTrips((trips) => {
    let pending = trips.find((trip) => trip.ownerUserId === ownerUserId && (trip.localId === id || trip.serverId === id));
    if (!pending) {
      pending = {
        ownerUserId,
        localId: id,
        serverId: id > 0 ? id : undefined,
        startedAt: new Date(Date.now() - completion.durationMinutes * 60_000).toISOString(),
        stops: [],
        photos: [],
      };
      trips.push(pending);
    }
    pending.completion = completion;
    pending.completionSynced = false;
  });
}

export async function queuePendingTripStop(id: number, stop: PendingTripStop): Promise<void> {
  const ownerUserId = await currentUserId();
  await mutatePendingTrips((trips) => {
    let pending = trips.find((trip) => trip.ownerUserId === ownerUserId && (trip.localId === id || trip.serverId === id));
    if (!pending) {
      pending = { ownerUserId, localId: id, serverId: id > 0 ? id : undefined, startedAt: new Date().toISOString(), stops: [], photos: [] };
      trips.push(pending);
    }
    if (!pending.stops.some((candidate) => candidate.operationId === stop.operationId)) pending.stops.push(stop);
  });
}

export async function queuePendingTripPhoto(id: number, photo: PendingTripPhoto): Promise<void> {
  const ownerUserId = await currentUserId();
  await mutatePendingTrips((trips) => {
    let pending = trips.find((trip) => trip.ownerUserId === ownerUserId && (trip.localId === id || trip.serverId === id));
    if (!pending) {
      pending = { ownerUserId, localId: id, serverId: id > 0 ? id : undefined, startedAt: new Date().toISOString(), stops: [], photos: [] };
      trips.push(pending);
    }
    if (!pending.photos.some((candidate) => candidate.operationId === photo.operationId)) pending.photos.push(photo);
  });
}

export async function setPendingTripServerId(localId: number, serverId: number): Promise<void> {
  await mutatePendingTrips((trips) => {
    const pending = trips.find((trip) => trip.localId === localId);
    if (pending) pending.serverId = serverId;
  });
}

export async function acknowledgePendingTripStop(localId: number, localStopId: number, serverStopId: number): Promise<void> {
  await mutatePendingTrips((trips) => {
    const pending = trips.find((trip) => trip.localId === localId);
    if (!pending) return;
    pending.stops = pending.stops.filter((stop) => stop.localStopId !== localStopId);
    pending.photos.forEach((photo) => {
      if (photo.stopId === localStopId) photo.stopId = serverStopId;
    });
  });
}

export async function acknowledgePendingTripPhoto(localId: number, localPhotoId: number): Promise<void> {
  await mutatePendingTrips((trips) => {
    const pending = trips.find((trip) => trip.localId === localId);
    if (pending) pending.photos = pending.photos.filter((photo) => photo.localPhotoId !== localPhotoId);
  });
}

export async function markPendingTripCompletionSynced(localId: number): Promise<void> {
  await mutatePendingTrips((trips) => {
    const index = trips.findIndex((trip) => trip.localId === localId);
    if (index < 0) return;
    trips[index].completionSynced = true;
    if (trips[index].stops.length === 0 && trips[index].photos.length === 0) trips.splice(index, 1);
  });
}

export async function removePendingTripIfFinished(localId: number): Promise<void> {
  await mutatePendingTrips((trips) => {
    const index = trips.findIndex((trip) => trip.localId === localId);
    if (index >= 0
        && (trips[index].completionSynced || (!trips[index].start && !trips[index].completion))
        && trips[index].stops.length === 0
        && trips[index].photos.length === 0) {
      trips.splice(index, 1);
    }
  });
}

// ─── Active Trip ──────────────────────────────────────────────────────────────

export async function saveActiveTripId(id: number): Promise<void> {
  const ownerUserId = await currentUserId();
  await AsyncStorage.multiSet([
    [ACTIVE_TRIP_ID_KEY, String(id)],
    [ACTIVE_TRIP_START_KEY, String(Date.now())],
    [ACTIVE_TRIP_OWNER_KEY, String(ownerUserId)],
  ]);
}

export async function replaceActiveTripId(currentId: number, nextId: number): Promise<void> {
  if (await getActiveTripId() === currentId) {
    await AsyncStorage.setItem(ACTIVE_TRIP_ID_KEY, String(nextId));
  }
}

export async function getActiveTripId(): Promise<number | null> {
  const [val, owner, cached] = await Promise.all([
    AsyncStorage.getItem(ACTIVE_TRIP_ID_KEY),
    AsyncStorage.getItem(ACTIVE_TRIP_OWNER_KEY),
    getCachedAuth(),
  ]);
  if (!cached || owner !== String(cached.user.id)) return null;
  return val ? parseInt(val, 10) : null;
}

export async function getActiveTripStart(): Promise<number | null> {
  const val = await AsyncStorage.getItem(ACTIVE_TRIP_START_KEY);
  return val ? parseInt(val, 10) : null;
}

export async function saveActiveTripMethod(method: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_METHOD_KEY, method);
}

export async function getActiveTripMethod(): Promise<string> {
  return (await AsyncStorage.getItem(ACTIVE_TRIP_METHOD_KEY)) ?? 'GPS';
}

export async function saveActiveTripStartCoords(lat: number, lng: number): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_START_COORDS_KEY, JSON.stringify([lat, lng]));
}

export async function getActiveTripStartCoords(): Promise<[number, number] | null> {
  const val = await AsyncStorage.getItem(ACTIVE_TRIP_START_COORDS_KEY);
  return val ? JSON.parse(val) : null;
}

export async function clearActiveTripId(): Promise<void> {
  await AsyncStorage.multiRemove([
    ACTIVE_TRIP_ID_KEY,
    ACTIVE_TRIP_START_KEY,
    ACTIVE_TRIP_METHOD_KEY,
    ACTIVE_TRIP_START_COORDS_KEY,
    ACTIVE_TRIP_OWNER_KEY,
    PLANNED_END_KEY,
    PENDING_IDLE_STOP_KEY,
  ]);
}

// ─── Pending idle stop (written by background task, read by JS thread) ────────

const PENDING_IDLE_STOP_KEY = 'pending_idle_stop';

export interface PendingIdleStop {
  tripId: number;
  startTime: number;
  lat: number;
  lng: number;
  durationMs: number;
}

export async function savePendingIdleStop(stop: PendingIdleStop): Promise<void> {
  await AsyncStorage.setItem(PENDING_IDLE_STOP_KEY, JSON.stringify(stop));
}

export async function getPendingIdleStop(): Promise<PendingIdleStop | null> {
  const val = await AsyncStorage.getItem(PENDING_IDLE_STOP_KEY);
  return val ? JSON.parse(val) : null;
}

export async function clearPendingIdleStop(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_IDLE_STOP_KEY);
}

// ─── Planned destination ──────────────────────────────────────────────────────

export async function savePlannedEndAddress(address: string): Promise<void> {
  await AsyncStorage.setItem(PLANNED_END_KEY, address);
}

export async function getPlannedEndAddress(): Promise<string | null> {
  return AsyncStorage.getItem(PLANNED_END_KEY);
}

// ─── Waypoints ────────────────────────────────────────────────────────────────
// Each waypoint is [lat, lng, timestamp_ms]

export type Waypoint = [number, number, number];

export function waypointsKey(tripId: number): string {
  return `${WAYPOINTS_PREFIX}${tripId}`;
}

export async function appendWaypoints(tripId: number, points: Waypoint[]): Promise<void> {
  const operation = waypointWrite.then(async () => {
    await pendingTripsWrite;
    const mapping = (await readPendingTrips()).find((trip) => trip.localId === tripId);
    const resolvedId = mapping?.serverId ?? tripId;
    const key = waypointsKey(resolvedId);
    const existing = await AsyncStorage.getItem(key);
    const current: Waypoint[] = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem(key, JSON.stringify([...current, ...points]));
  });
  waypointWrite = operation.catch(() => undefined);
  return operation;
}

export async function getWaypoints(tripId: number): Promise<Waypoint[]> {
  await waypointWrite;
  await pendingTripsWrite;
  const mapping = (await readPendingTrips()).find((trip) => trip.localId === tripId);
  const stored = await AsyncStorage.getItem(waypointsKey(mapping?.serverId ?? tripId));
  return stored ? JSON.parse(stored) : [];
}

export async function migrateWaypoints(localId: number, serverId: number): Promise<void> {
  const operation = waypointWrite.then(async () => {
    const [localValue, serverValue] = await Promise.all([
      AsyncStorage.getItem(waypointsKey(localId)),
      AsyncStorage.getItem(waypointsKey(serverId)),
    ]);
    const local: Waypoint[] = localValue ? JSON.parse(localValue) : [];
    const server: Waypoint[] = serverValue ? JSON.parse(serverValue) : [];
    const merged = [...server, ...local].sort((left, right) => left[2] - right[2]);
    const unique = merged.filter((point, index) => index === 0 || point[2] !== merged[index - 1][2]);
    await AsyncStorage.setItem(waypointsKey(serverId), JSON.stringify(unique));
    await AsyncStorage.removeItem(waypointsKey(localId));
  });
  waypointWrite = operation.catch(() => undefined);
  return operation;
}

export async function clearWaypoints(tripId: number): Promise<void> {
  const operation = waypointWrite.then(async () => {
    await pendingTripsWrite;
    const mapping = (await readPendingTrips()).find((trip) => trip.localId === tripId);
    await AsyncStorage.removeItem(waypointsKey(mapping?.serverId ?? tripId));
  });
  waypointWrite = operation.catch(() => undefined);
  return operation;
}
