import axios, { AxiosError } from 'axios';
import { BASE_URL } from './config';
import {
  getToken,
  getRefreshToken,
  saveSession,
  clearToken,
  Waypoint,
} from './storage';
import type {
  CurrentUser,
  AppNotification,
  AdminUser,
  AnalyticsStats,
  DashboardStats,
  InventoryCategory,
  InventoryCountItem,
  InventoryProduct,
  InventoryProductInput,
  InventorySession,
  MileageEntry,
  MileageEntryInput,
  MobileTokenResponse,
  MyPageAccessResponse,
  PageResponse,
  PreventiveTask,
  ShoppingListResponse,
  Subscription,
  SubscriptionInput,
  SubscriptionReport,
  UrgentWorkOrder,
  UrgentWorkOrderInput,
  WorkOrder,
  WorkOrderInput,
  WorkOrderPriority,
  WorkOrderStatus,
  UserRole,
} from '../types/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    // Bypass the ngrok browser-warning interstitial for non-browser clients
    'ngrok-skip-browser-warning': 'true',
  },
});

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();
let refreshPromise: Promise<string> | null = null;

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => listener());
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token is available');
  }

  const response = await axios.post<MobileTokenResponse>(
    `${BASE_URL}/api/auth/mobile/refresh`,
    { refreshToken },
    { headers: { 'ngrok-skip-browser-warning': 'true' } },
  );
  await saveSession(response.data.accessToken, response.data.refreshToken);
  return response.data.accessToken;
}

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });
    const isAuthRequest = originalRequest?.url?.includes('/api/auth/mobile/');
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      await clearToken();
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepTripStopReason = 'CLIENT' | 'RESTAURANT' | 'GAS' | 'OFFICE' | 'OTHER';

// ─── File uploads ─────────────────────────────────────────────────────────────

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

interface WorkOrderFileOptions {
  photos?: PickedFile[];
  invoice?: PickedFile | null;
  removeAttachment?: boolean;
  removeInvoice?: boolean;
}

function appendFile(form: FormData, field: string, file: PickedFile): void {
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as unknown as Blob);
}

function hasFileChanges(files?: WorkOrderFileOptions): boolean {
  if (!files) return false;
  return Boolean(files.photos?.length || files.invoice || files.removeAttachment || files.removeInvoice);
}

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

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = true,
): Promise<MobileTokenResponse> {
  const res = await api.post<MobileTokenResponse>('/api/auth/mobile/login', {
    email,
    password,
    rememberMe,
  });
  return res.data;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await api.post('/api/auth/mobile/logout', { refreshToken });
    }
  } finally {
    await clearToken();
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await api.get<CurrentUser>('/api/users/me');
  return res.data;
}

export async function getMyPageAccess(): Promise<MyPageAccessResponse> {
  const res = await api.get<MyPageAccessResponse>('/api/page-access/me');
  return res.data;
}

// ─── Shared application modules ──────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/api/admin/dashboard');
  return res.data;
}

export async function getWorkOrders(params?: {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  q?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<WorkOrder>> {
  const res = await api.get<PageResponse<WorkOrder>>('/api/admin/work-orders', {
    params: { page: 0, size: 100, ...params },
  });
  return res.data;
}

export async function getWorkOrder(id: number): Promise<WorkOrder> {
  const res = await api.get<WorkOrder>(`/api/admin/work-orders/${id}`);
  return res.data;
}

export async function createWorkOrder(input: WorkOrderInput, files?: WorkOrderFileOptions): Promise<WorkOrder> {
  if (hasFileChanges(files)) {
    const form = new FormData();
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.location) form.append('location', input.location);
    form.append('priority', input.priority);
    if (input.dueDate) form.append('dueDate', input.dueDate.slice(0, 10));
    if (input.assignedToUserId != null) form.append('assignedToUserId', String(input.assignedToUserId));
    files?.photos?.forEach((photo) => appendFile(form, 'files', photo));
    if (files?.invoice) appendFile(form, 'invoiceFiles', files.invoice);
    const res = await api.post<WorkOrder>('/api/admin/work-orders', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await api.post<WorkOrder>('/api/admin/work-orders', input);
  return res.data;
}

export async function updateWorkOrder(
  id: number,
  input: WorkOrderInput & { status: WorkOrderStatus },
  files?: WorkOrderFileOptions,
): Promise<WorkOrder> {
  if (hasFileChanges(files)) {
    const form = new FormData();
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.location) form.append('location', input.location);
    form.append('priority', input.priority);
    form.append('status', input.status);
    if (input.dueDate) form.append('dueDate', input.dueDate.slice(0, 10));
    if (input.assignedToUserId != null) form.append('assignedToUserId', String(input.assignedToUserId));
    if (files?.removeAttachment) form.append('removeAttachment', 'true');
    if (files?.removeInvoice) form.append('removeInvoice', 'true');
    files?.photos?.forEach((photo) => appendFile(form, 'files', photo));
    if (files?.invoice) appendFile(form, 'invoiceFiles', files.invoice);
    const res = await api.put<WorkOrder>(`/api/admin/work-orders/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await api.put<WorkOrder>(`/api/admin/work-orders/${id}`, input);
  return res.data;
}

export async function getUrgentWorkOrders(params?: {
  status?: WorkOrderStatus;
  q?: string;
  location?: string;
}): Promise<UrgentWorkOrder[]> {
  const res = await api.get<UrgentWorkOrder[]>('/api/urgent-work-orders', { params });
  return res.data;
}

export async function getUrgentWorkOrder(id: number): Promise<UrgentWorkOrder> {
  const res = await api.get<UrgentWorkOrder>(`/api/urgent-work-orders/${id}`);
  return res.data;
}

export async function createUrgentWorkOrder(input: UrgentWorkOrderInput, files?: WorkOrderFileOptions): Promise<UrgentWorkOrder> {
  if (hasFileChanges(files)) {
    const form = new FormData();
    form.append('title', input.title);
    form.append('description', input.description);
    form.append('location', input.location);
    form.append('priority', input.priority);
    if (input.status) form.append('status', input.status);
    if (input.dueDate) form.append('dueDate', input.dueDate.length === 10 ? `${input.dueDate}T00:00:00` : input.dueDate);
    if (input.assignedToUserId != null) form.append('assignedToUserId', String(input.assignedToUserId));
    files?.photos?.forEach((photo) => appendFile(form, 'files', photo));
    if (files?.invoice) appendFile(form, 'invoiceFiles', files.invoice);
    const res = await api.post<UrgentWorkOrder>('/api/urgent-work-orders', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await api.post<UrgentWorkOrder>('/api/urgent-work-orders', input);
  return res.data;
}

export async function updateUrgentWorkOrder(
  id: number,
  input: Partial<UrgentWorkOrderInput>,
  files?: WorkOrderFileOptions,
): Promise<UrgentWorkOrder> {
  if (hasFileChanges(files)) {
    const form = new FormData();
    if (input.title !== undefined) form.append('title', input.title);
    if (input.description !== undefined) form.append('description', input.description);
    if (input.location !== undefined) form.append('location', input.location);
    if (input.priority !== undefined) form.append('priority', input.priority);
    if (input.status !== undefined) form.append('status', input.status);
    if (input.dueDate) form.append('dueDate', input.dueDate.length === 10 ? `${input.dueDate}T00:00:00` : input.dueDate);
    if (input.assignedToUserId != null) form.append('assignedToUserId', String(input.assignedToUserId));
    if (files?.removeAttachment) form.append('removeAttachment', 'true');
    if (files?.removeInvoice) form.append('removeInvoice', 'true');
    files?.photos?.forEach((photo) => appendFile(form, 'files', photo));
    if (files?.invoice) appendFile(form, 'invoiceFiles', files.invoice);
    const res = await api.patch<UrgentWorkOrder>(`/api/urgent-work-orders/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await api.patch<UrgentWorkOrder>(`/api/urgent-work-orders/${id}`, input);
  return res.data;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get<AppNotification[]>('/api/notifications');
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/api/notifications/read');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/api/notifications/${id}`);
}

export async function getMileageEntries(): Promise<MileageEntry[]> {
  const res = await api.get<MileageEntry[]>('/api/mileage');
  return res.data;
}

export async function createMileageEntry(input: MileageEntryInput): Promise<MileageEntry> {
  const res = await api.post<MileageEntry>('/api/mileage', input);
  return res.data;
}

export async function updateMileageEntry(id: number, input: MileageEntryInput): Promise<MileageEntry> {
  const res = await api.put<MileageEntry>(`/api/mileage/${id}`, input);
  return res.data;
}

export async function archiveMileageEntry(id: number): Promise<void> {
  await api.patch(`/api/mileage/${id}/archive`);
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const res = await api.get<AnalyticsStats>('/api/admin/analytics');
  return res.data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await api.get<AdminUser[]>('/api/admin/users');
  return res.data;
}

export async function inviteAdminUser(email: string, role: UserRole): Promise<AdminUser> {
  const res = await api.post<AdminUser>('/api/admin/users/invite', { email, role });
  return res.data;
}

export async function setAdminUserEnabled(userId: number, enabled: boolean): Promise<AdminUser> {
  const action = enabled ? 'activate' : 'deactivate';
  const res = await api.patch<AdminUser>(`/api/admin/users/${userId}/${action}`);
  return res.data;
}

export async function updateAdminUserRole(userId: number, role: UserRole): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function getShoppingList(): Promise<ShoppingListResponse> {
  const res = await api.get<ShoppingListResponse>('/api/shopping-list');
  return res.data;
}

export async function setShoppingItemBought(
  item: { workOrderType: 'REGULAR' | 'URGENT'; workOrderId: number; materialId: number },
  bought: boolean,
): Promise<void> {
  const root = item.workOrderType === 'URGENT' ? 'urgent-work-orders' : 'work-orders';
  await api.patch(`/api/${root}/${item.workOrderId}/materials/${item.materialId}/bought`, { bought });
}

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const res = await api.get<InventoryCategory[]>('/api/inventory/categories');
  return res.data;
}

export async function getInventoryProducts(q?: string): Promise<InventoryProduct[]> {
  const res = await api.get<InventoryProduct[]>('/api/inventory/products', { params: q ? { q } : undefined });
  return res.data;
}

export async function createInventoryProduct(input: InventoryProductInput): Promise<InventoryProduct> {
  const res = await api.post<InventoryProduct>('/api/inventory/products', input);
  return res.data;
}

export async function updateInventoryProduct(id: number, input: Partial<InventoryProductInput>): Promise<InventoryProduct> {
  const res = await api.patch<InventoryProduct>(`/api/inventory/products/${id}`, input);
  return res.data;
}

export async function getInventorySessions(): Promise<InventorySession[]> {
  const res = await api.get<InventorySession[]>('/api/inventory/sessions');
  return res.data;
}

export async function getInventorySession(id: number): Promise<InventorySession> {
  const res = await api.get<InventorySession>(`/api/inventory/sessions/${id}`);
  return res.data;
}

export async function createInventorySession(name: string, notes?: string): Promise<InventorySession> {
  const res = await api.post<InventorySession>('/api/inventory/sessions', { name, notes });
  return res.data;
}

export async function changeInventorySessionStatus(
  id: number,
  action: 'start' | 'complete' | 'cancel',
): Promise<InventorySession> {
  const res = await api.patch<InventorySession>(`/api/inventory/sessions/${id}/${action}`);
  return res.data;
}

export async function getInventorySessionItems(sessionId: number, q?: string): Promise<InventoryCountItem[]> {
  const res = await api.get<InventoryCountItem[]>(`/api/inventory/sessions/${sessionId}/items`, { params: q ? { q } : undefined });
  return res.data;
}

export async function recordInventoryCount(
  sessionId: number,
  productId: number,
  countedQty: number,
  notes?: string,
): Promise<InventoryCountItem> {
  const res = await api.post<InventoryCountItem>(`/api/inventory/sessions/${sessionId}/count`, { productId, countedQty, notes });
  return res.data;
}

export async function getPreventiveTasks(): Promise<PreventiveTask[]> {
  const res = await api.get<PreventiveTask[]>('/api/preventive-tasks');
  return res.data;
}

export async function completePreventiveTask(taskId: number): Promise<PreventiveTask> {
  const res = await api.post<PreventiveTask>(`/api/preventive-tasks/${taskId}/complete`);
  return res.data;
}

export async function uncompletePreventiveTask(taskId: number, completionId: number): Promise<void> {
  await api.delete(`/api/preventive-tasks/${taskId}/completions/${completionId}`);
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const res = await api.get<Subscription[]>('/api/admin/subscriptions');
  return res.data;
}

export async function getSubscriptionReport(): Promise<SubscriptionReport> {
  const res = await api.get<SubscriptionReport>('/api/admin/subscriptions/report');
  return res.data;
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const res = await api.post<Subscription>('/api/admin/subscriptions', input);
  return res.data;
}

export async function updateSubscription(id: number, input: SubscriptionInput): Promise<Subscription> {
  const res = await api.put<Subscription>(`/api/admin/subscriptions/${id}`, input);
  return res.data;
}

export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/api/admin/subscriptions/${id}`);
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

// ─── Expenses (Dépenses) ─────────────────────────────────────────────────────

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExpenseReceipt {
  id: number;
  filename: string;
  contentType?: string | null;
  originalName?: string | null;
  fileSize?: number | null;
  uploadedAt: string;
}

export interface Expense {
  id: number;
  userId: number;
  date: string;
  supplier?: string | null;
  description?: string | null;
  province?: string | null;
  imputationCode?: string | null;
  subtotalCents?: number | null;
  tpsCents?: number | null;
  tvqCents?: number | null;
  tvhCents?: number | null;
  tipCents?: number | null;
  totalCents?: number | null;
  status: ExpenseStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  archivedAt?: string | null;
  receipts: ExpenseReceipt[];
}

export interface ExpenseRequest {
  date: string;
  supplier?: string;
  description?: string;
  province?: string;
  imputationCode?: string;
  subtotalCents?: number;
  tpsCents?: number;
  tvqCents?: number;
  tvhCents?: number;
  tipCents?: number;
  totalCents?: number;
  notes?: string;
}

export async function getMyExpenses(): Promise<Expense[]> {
  const res = await api.get<Expense[]>('/api/expenses');
  return res.data;
}

export async function createExpense(req: ExpenseRequest): Promise<Expense> {
  const res = await api.post<Expense>('/api/expenses', req);
  return res.data;
}

export async function updateExpense(id: number, req: ExpenseRequest): Promise<Expense> {
  const res = await api.put<Expense>(`/api/expenses/${id}`, req);
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/api/expenses/${id}`);
}

export async function archiveExpense(id: number): Promise<void> {
  await api.patch(`/api/expenses/${id}/archive`);
}

export async function uploadExpenseReceipt(id: number, uri: string): Promise<Expense> {
  const form = new FormData();
  const filename = uri.split('/').pop() || `receipt-${Date.now()}.jpg`;
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  form.append('file', { uri, name: filename, type: mime } as any);
  const res = await api.post<Expense>(`/api/expenses/${id}/receipts`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function expenseReceiptUrl(expenseId: number, receiptId: number): string {
  return `${BASE_URL}/api/expenses/${expenseId}/receipts/${receiptId}`;
}
