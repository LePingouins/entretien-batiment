import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const ACTIVE_TRIP_ID_KEY = 'active_trip_id';
const ACTIVE_TRIP_START_KEY = 'active_trip_start';
const ACTIVE_TRIP_METHOD_KEY = 'active_trip_method';
const ACTIVE_TRIP_START_COORDS_KEY = 'active_trip_start_coords';
const WAYPOINTS_PREFIX = 'trip_waypoints_';
const PLANNED_END_KEY = 'planned_end_address';

// ─── JWT Token ────────────────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Active Trip ──────────────────────────────────────────────────────────────

export async function saveActiveTripId(id: number): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_ID_KEY, String(id));
  await AsyncStorage.setItem(ACTIVE_TRIP_START_KEY, String(Date.now()));
}

export async function getActiveTripId(): Promise<number | null> {
  const val = await AsyncStorage.getItem(ACTIVE_TRIP_ID_KEY);
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
    PLANNED_END_KEY,
  ]);
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
  const key = waypointsKey(tripId);
  const existing = await AsyncStorage.getItem(key);
  const current: Waypoint[] = existing ? JSON.parse(existing) : [];
  await AsyncStorage.setItem(key, JSON.stringify([...current, ...points]));
}

export async function getWaypoints(tripId: number): Promise<Waypoint[]> {
  const stored = await AsyncStorage.getItem(waypointsKey(tripId));
  return stored ? JSON.parse(stored) : [];
}

export async function clearWaypoints(tripId: number): Promise<void> {
  await AsyncStorage.removeItem(waypointsKey(tripId));
}
