// Fetch a single work order by ID
export async function getWorkOrderById(id: number): Promise<import('../types/api').WorkOrderResponse> {
  const res = await api.get(`/api/admin/work-orders/${id}`);
  return res.data;
}
/**
 * Reorder urgent work orders within a single status column.
 * Sets sortIndex = array index for each id in orderedIds.
 * Used when dragging a card within the same column.
 */
export async function reorderUrgentWorkOrders(status: string, orderedIds: number[]): Promise<void> {
  await api.patch('/api/urgent-work-orders/reorder', { status, orderedIds });
}
import axios from 'axios';
import { clearStoredAuth, getRememberMePreference, getStoredAccessToken, getStoredAuth, setStoredAuth } from './authStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});

// Prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

// Helper to decode JWT and extract payload
function decodeJwt(token: string): { role?: string; sub?: string } {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (e) {
    return {};
  }
}

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Handle both 401 (Unauthorized) and 403 (Forbidden) for token refresh
    // Some backends return 403 for expired tokens
    const status = error.response?.status;
    const shouldRefresh = (status === 401 || status === 403) && !originalRequest._retry;
    
    if (shouldRefresh) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await api.post('/api/auth/refresh');
        const { accessToken } = res.data;
        // Decode the new token and refresh stored role/user ID in the active auth storage.
        const decoded = decodeJwt(accessToken);
        const rememberMe = getRememberMePreference();
        const previous = getStoredAuth();
        setStoredAuth(
          accessToken,
          decoded.role || previous.role,
          decoded.sub || previous.userId,
          rememberMe
        );
        // Dispatch a storage event so AuthContext can update its state
        window.dispatchEvent(new Event('auth-storage-update'));
        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearStoredAuth();
        window.dispatchEvent(new Event('auth-storage-update'));
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);


// --- Materials API ---

import type { MaterialRequest, MaterialResponse } from '../types/api';

// Normal work order materials
export async function getMaterials(workOrderId: number): Promise<MaterialResponse[]> {
  const res = await api.get(`/api/work-orders/${workOrderId}/materials`);
  return res.data;
}
export async function createMaterial(workOrderId: number, payload: MaterialRequest): Promise<MaterialResponse> {
  const res = await api.post(`/api/work-orders/${workOrderId}/materials`, payload);
  return res.data;
}
export async function updateMaterial(workOrderId: number, materialId: number, payload: Partial<MaterialRequest>): Promise<MaterialResponse> {
  const res = await api.patch(`/api/work-orders/${workOrderId}/materials/${materialId}`, payload);
  return res.data;
}
export async function setMaterialBought(workOrderId: number, materialId: number, bought: boolean): Promise<MaterialResponse> {
  const res = await api.patch(`/api/work-orders/${workOrderId}/materials/${materialId}/bought`, { bought });
  return res.data;
}
export async function deleteMaterial(workOrderId: number, materialId: number): Promise<void> {
  await api.delete(`/api/work-orders/${workOrderId}/materials/${materialId}`);
}

// Urgent work order materials
export async function getUrgentMaterials(urgentWorkOrderId: number): Promise<MaterialResponse[]> {
  const res = await api.get(`/api/urgent-work-orders/${urgentWorkOrderId}/materials`);
  return res.data;
}
export async function createUrgentMaterial(urgentWorkOrderId: number, payload: MaterialRequest): Promise<MaterialResponse> {
  const res = await api.post(`/api/urgent-work-orders/${urgentWorkOrderId}/materials`, payload);
  return res.data;
}
export async function updateUrgentMaterial(urgentWorkOrderId: number, materialId: number, payload: Partial<MaterialRequest>): Promise<MaterialResponse> {
  const res = await api.patch(`/api/urgent-work-orders/${urgentWorkOrderId}/materials/${materialId}`, payload);
  return res.data;
}
export async function setUrgentMaterialBought(urgentWorkOrderId: number, materialId: number, bought: boolean): Promise<MaterialResponse> {
  const res = await api.patch(`/api/urgent-work-orders/${urgentWorkOrderId}/materials/${materialId}/bought`, { bought });
  return res.data;
}
export async function deleteUrgentMaterial(urgentWorkOrderId: number, materialId: number): Promise<void> {
  await api.delete(`/api/urgent-work-orders/${urgentWorkOrderId}/materials/${materialId}`);
}

// --- Work Order Kanban Ordering API ---
import type { WorkOrderResponse, WorkOrderStatus } from '../types/api';

/**
 * Reorder work orders within a single status column.
 * Sets sortIndex = array index for each id in orderedIds.
 * Used when dragging a card within the same column.
 */
export async function reorderWorkOrders(status: WorkOrderStatus, orderedIds: number[]): Promise<void> {
  await api.patch('/api/admin/work-orders/reorder', { status, orderedIds });
}

/**
 * Move a work order to a different status column at a specific index.
 * Used when dragging a card from one column to another.
 */
export async function moveWorkOrder(workOrderId: number, newStatus: WorkOrderStatus, newIndex: number): Promise<WorkOrderResponse> {
  const res = await api.patch<WorkOrderResponse>(`/api/admin/work-orders/${workOrderId}/move`, { newStatus, newIndex });
  return res.data;
}

/**
 * Get work orders for a specific status column, ordered for Kanban display.
 */
export async function getWorkOrdersByStatusForKanban(status: WorkOrderStatus): Promise<WorkOrderResponse[]> {
  const res = await api.get<WorkOrderResponse[]>(`/api/admin/work-orders/kanban/${status}`);
  return res.data;
}

/**
 * Reorder ALL work orders in EVERY column by priority.
 * This resets any manual ordering and organizes all cards by priority
 * (URGENT first, then HIGH, MEDIUM, LOW).
 */
export async function reorderAllByPriority(): Promise<void> {
  await api.post('/api/admin/work-orders/reorder-by-priority');
}

// --- Archive API ---
import type { PageResponse } from '../types/api';

/**
 * Get archived work orders with optional filters.
 */
export async function getArchivedWorkOrders(params?: {
  status?: WorkOrderStatus;
  priority?: string;
  q?: string;
  location?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<WorkOrderResponse>> {
  const res = await api.get<PageResponse<WorkOrderResponse>>('/api/admin/work-orders/archived', { params });
  return res.data;
}

/**
 * Archive a work order manually.
 */
export async function archiveWorkOrder(workOrderId: number): Promise<WorkOrderResponse> {
  const res = await api.patch<WorkOrderResponse>(`/api/admin/work-orders/${workOrderId}/archive`);
  return res.data;
}

/**
 * Unarchive (restore) a work order.
 */
export async function unarchiveWorkOrder(workOrderId: number): Promise<WorkOrderResponse> {
  const res = await api.patch<WorkOrderResponse>(`/api/admin/work-orders/${workOrderId}/unarchive`);
  return res.data;
}

export default api;

// --- Urgent Work Orders API ---
import type { UrgentWorkOrderResponse, UrgentWorkOrderRequest, MileageEntry } from '../types/api';

export async function getUrgentWorkOrders(params?: {
  status?: string;
  q?: string;
  location?: string;
  technician?: string;
  startDate?: string;
  endDate?: string;
}): Promise<UrgentWorkOrderResponse[]> {
  const p: any = {};
  if (params?.q) p.q = params.q;
  if (params?.status) p.status = params.status;
  if (params?.location) p.location = params.location;
  if (params?.technician) p.technician = params.technician;
  if (params?.startDate) p.startDate = params.startDate;
  if (params?.endDate) p.endDate = params.endDate;
  const res = await api.get<UrgentWorkOrderResponse[]>('/api/urgent-work-orders', { params: p });
  // Patch: convert materialsPreview string to array for frontend compatibility
  return res.data.map((wo: any) => {
    let preview: string[] = [];
    if (wo.materialsPreview) {
      if (Array.isArray(wo.materialsPreview)) {
        preview = wo.materialsPreview;
      } else if (typeof wo.materialsPreview === 'string' && wo.materialsPreview.length > 0) {
        preview = wo.materialsPreview.split(/,\s*/);
      }
    }
    return {
      ...wo,
      materialsPreview: preview,
    };
  });
}

export async function createUrgentWorkOrder(payload: UrgentWorkOrderRequest & { dueDate?: string; priority?: string; assignedToUserId?: number | string | null; invoiceFiles?: File[] }) : Promise<UrgentWorkOrderResponse> {
  // If files are present, use FormData, else send JSON
  const hasInvoiceFiles = payload.invoiceFiles && payload.invoiceFiles.length > 0;
  if ((payload.files && payload.files.length > 0) || hasInvoiceFiles) {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('location', payload.location);
    if (payload.dueDate) {
      formData.append('dueDate', payload.dueDate.length === 10 ? payload.dueDate + 'T00:00:00' : payload.dueDate);
    }
    if (payload.priority) {
      formData.append('priority', payload.priority);
    }
    if (payload.assignedToUserId !== undefined && payload.assignedToUserId !== null && payload.assignedToUserId !== '') {
      formData.append('assignedToUserId', String(payload.assignedToUserId));
    }
    if (payload.files) {
      for (let i = 0; i < payload.files.length; i++) {
        formData.append('files', payload.files[i]);
      }
    }
    if (payload.invoiceFiles) {
      for (let i = 0; i < payload.invoiceFiles.length; i++) {
        formData.append('invoiceFiles', payload.invoiceFiles[i]);
      }
    }
    const res = await api.post('/api/urgent-work-orders', formData);
    return res.data;
  } else {
    // Send as JSON
    const jsonPayload: any = {
      title: payload.title,
      description: payload.description,
      location: payload.location,
      dueDate: payload.dueDate ? (payload.dueDate.length === 10 ? payload.dueDate + 'T00:00:00' : payload.dueDate) : undefined,
      priority: payload.priority,
      assignedToUserId: payload.assignedToUserId !== undefined && payload.assignedToUserId !== null && payload.assignedToUserId !== '' ? payload.assignedToUserId : undefined,
      status: (payload as any).status // in case status is passed
    };
    const res = await api.post('/api/urgent-work-orders', jsonPayload);
    return res.data;
  }
}

export async function updateUrgentWorkOrder(
  id: number,
  data: Partial<UrgentWorkOrderRequest & { status: string; dueDate?: string; priority?: string; assignedToUserId?: number | string | null; removeAttachment?: boolean; invoiceFiles?: File[]; removeInvoice?: boolean }>
): Promise<UrgentWorkOrderResponse> {
  const hasFiles = data.files && (data.files instanceof FileList ? data.files.length > 0 : Array.isArray(data.files) && data.files.length > 0);
  const hasInvoiceFiles = data.invoiceFiles && data.invoiceFiles.length > 0;
  const mustUseMultipart = !!hasFiles || data.removeAttachment === true || !!hasInvoiceFiles || data.removeInvoice === true;

  if (mustUseMultipart) {
    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.location !== undefined) formData.append('location', data.location);
    if (data.dueDate !== undefined) formData.append('dueDate', data.dueDate.length === 10 ? data.dueDate + 'T00:00:00' : data.dueDate);
    if (data.priority !== undefined) formData.append('priority', data.priority);
    if (data.status !== undefined) formData.append('status', data.status);
    if (data.assignedToUserId !== undefined) {
      formData.append('assignedToUserId', data.assignedToUserId === null || data.assignedToUserId === '' ? '' : String(data.assignedToUserId));
    }
    if (data.removeAttachment === true) formData.append('removeAttachment', 'true');
    if (data.removeInvoice === true) formData.append('removeInvoice', 'true');
    const filesArr = data.files instanceof FileList ? Array.from(data.files) : Array.isArray(data.files) ? data.files : [];
    for (let i = 0; i < filesArr.length; i++) {
      formData.append('files', filesArr[i]);
    }
    if (data.invoiceFiles) {
      for (let i = 0; i < data.invoiceFiles.length; i++) {
        formData.append('invoiceFiles', data.invoiceFiles[i]);
      }
    }
    const res = await api.patch(`/api/urgent-work-orders/${id}`, formData);
    return res.data;
  } else {
    const res = await api.patch<UrgentWorkOrderResponse>(`/api/urgent-work-orders/${id}`, data);
    return res.data;
  }
}

export async function deleteUrgentWorkOrder(id: number): Promise<void> {
  await api.delete(`/api/urgent-work-orders/${id}`);
}

export async function getArchivedUrgentWorkOrders(params?: {
  q?: string;
  status?: string;
  location?: string;
}): Promise<UrgentWorkOrderResponse[]> {
  const p: any = {};
  if (params?.q) p.q = params.q;
  if (params?.status) p.status = params.status;
  if (params?.location) p.location = params.location;
  const res = await api.get<UrgentWorkOrderResponse[]>('/api/urgent-work-orders/archived', { params: p });
  return res.data;
}



export async function archiveUrgentWorkOrder(id: number): Promise<void> {
  await api.patch(`/api/urgent-work-orders/${id}/archive`);
}

export async function unarchiveUrgentWorkOrder(id: number): Promise<void> {
  await api.patch(`/api/urgent-work-orders/${id}/unarchive`);
}

export async function getArchivedMileageEntries(params?: {
  q?: string;
  startDate?: string;
  endDate?: string;
}): Promise<MileageEntry[]> {
  const p: any = {};
  if (params?.q) p.q = params.q;
  if (params?.startDate) p.startDate = params.startDate;
  if (params?.endDate) p.endDate = params.endDate;
  const res = await api.get<MileageEntry[]>('/api/mileage/archived', { params: p });
  return res.data;
}



export async function archiveMileageEntry(id: number): Promise<void> {
  await api.patch(`/api/mileage/${id}/archive`);
}

export async function unarchiveMileageEntry(id: number): Promise<void> {
  await api.patch(`/api/mileage/${id}/unarchive`);
}

export async function getDashboardStats(): Promise<import('../types/api').DashboardStats> {
  const res = await api.get('/api/admin/dashboard');
  return res.data;
}

export async function getAnalyticsStats(): Promise<import('../types/api').AnalyticsStatsResponse> {
  const res = await api.get('/api/admin/analytics');
  return res.data;
}

export async function getDevelopperDebugDashboard(
  limit = 50
): Promise<import('../types/api').DevelopperDebugDashboardResponse> {
  const res = await api.get<import('../types/api').DevelopperDebugDashboardResponse>('/api/developper/debug/errors', {
    params: { limit },
  });
  return res.data;
}

export async function getDevelopperDebugErrorDetail(
  fingerprint: string
): Promise<import('../types/api').DevelopperDebugErrorDetailResponse> {
  const res = await api.get<import('../types/api').DevelopperDebugErrorDetailResponse>(
    `/api/developper/debug/errors/${encodeURIComponent(fingerprint)}`
  );
  return res.data;
}

export async function deleteDevelopperDebugError(fingerprint: string): Promise<void> {
  await api.delete(`/api/developper/debug/errors/${encodeURIComponent(fingerprint)}`);
}

export async function deleteAllDevelopperDebugErrors(): Promise<void> {
  await api.delete('/api/developper/debug/errors');
}

// --- Notifications API ---
import type { NotificationType } from '../context/NotificationsContext';

export async function getNotifications(): Promise<NotificationType[]> {
  const res = await api.get<NotificationType[]>('/api/notifications');
  return res.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.put('/api/notifications/read');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/api/notifications/${id}`);
}

export async function createBroadcast(title: string, message: string, href?: string, targetUserId?: number | null): Promise<void> {
  await api.post('/api/notifications/broadcast', {
    title,
    message,
    href,
    targetUserId: targetUserId ?? null,
  });
}

export async function createBugReport(
  title: string,
  description: string
): Promise<import('../types/api').BugReportCreatedResponse> {
  const res = await api.post<import('../types/api').BugReportCreatedResponse>('/api/bug-reports', {
    title,
    description,
  });
  return res.data;
}

export async function confirmBugReport(
  reportId: number
): Promise<import('../types/api').BugReportConfirmedResponse> {
  const res = await api.post<import('../types/api').BugReportConfirmedResponse>(`/api/bug-reports/${reportId}/confirm`);
  return res.data;
}

export async function markBugReportAsRead(reportId: number): Promise<void> {
  await api.put(`/api/bug-reports/${reportId}/read`);
}

export async function deleteBugReport(reportId: number): Promise<void> {
  await api.delete(`/api/bug-reports/${reportId}`);
}


export async function getCurrentUser(): Promise<{ id: number; email: string; role: import('../types/api').UserRole; enabled: boolean; remindersEnabled: boolean }> {
  const res = await api.get('/api/users/me');
  return res.data;
}

export async function getTechnicians(): Promise<import('../types/api').AdminUserResponse[]> {
  const res = await api.get<import('../types/api').AdminUserResponse[]>('/api/users/technicians');
  return res.data;
}

export async function updateUserSettings(remindersEnabled: boolean): Promise<any> {
  const res = await api.patch('/api/users/me/settings', { remindersEnabled });
  return res.data;
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch('/api/users/me/password', { currentPassword, newPassword });
}

export async function getAdminUsers(): Promise<import('../types/api').AdminUserResponse[]> {
  const res = await api.get<import('../types/api').AdminUserResponse[]>('/api/admin/users');
  return res.data;
}

export async function inviteAdminUser(email: string, role: import('../types/api').UserRole): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.post<import('../types/api').AdminUserResponse>('/api/admin/users/invite', { email, role });
  return res.data;
}

export async function activateAdminUser(userId: number): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.patch<import('../types/api').AdminUserResponse>(`/api/admin/users/${userId}/activate`);
  return res.data;
}

export async function deactivateAdminUser(userId: number): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.patch<import('../types/api').AdminUserResponse>(`/api/admin/users/${userId}/deactivate`);
  return res.data;
}

export async function updateAdminUserRole(userId: number, role: import('../types/api').UserRole): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.patch<import('../types/api').AdminUserResponse>(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function resetAdminUserPassword(userId: number): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.patch<import('../types/api').AdminUserResponse>(`/api/admin/users/${userId}/reset-password`);
  return res.data;
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await api.delete(`/api/admin/users/${userId}`);
}

export async function updateAdminUserEmail(userId: number, email: string): Promise<import('../types/api').AdminUserResponse> {
  const res = await api.patch<import('../types/api').AdminUserResponse>(`/api/admin/users/${userId}/email`, { email });
  return res.data;
}

export async function getAdminNotificationRecipientRules(): Promise<import('../types/api').NotificationRecipientRule[]> {
  const res = await api.get<import('../types/api').NotificationRecipientRule[]>('/api/admin/notification-rules');
  return res.data;
}

export async function updateAdminNotificationRecipientRules(
  rules: import('../types/api').NotificationRecipientRule[]
): Promise<import('../types/api').NotificationRecipientRule[]> {
  const res = await api.put<import('../types/api').NotificationRecipientRule[]>('/api/admin/notification-rules', rules);
  return res.data;
}

export async function getMyPageAccess(): Promise<import('../types/api').MyPageAccessResponse> {
  const res = await api.get<import('../types/api').MyPageAccessResponse>('/api/page-access/me');
  return res.data;
}

export async function getAdminRolePageAccessRules(): Promise<import('../types/api').RolePageAccessRule[]> {
  const res = await api.get<import('../types/api').RolePageAccessRule[]>('/api/admin/page-access/roles');
  return res.data;
}

export async function updateAdminRolePageAccessRules(
  rules: import('../types/api').RolePageAccessRule[]
): Promise<import('../types/api').RolePageAccessRule[]> {
  const res = await api.put<import('../types/api').RolePageAccessRule[]>('/api/admin/page-access/roles', rules);
  return res.data;
}

export async function getAdminUserPageAccessOverview(): Promise<import('../types/api').UserPageAccessOverview[]> {
  const res = await api.get<import('../types/api').UserPageAccessOverview[]>('/api/admin/page-access/users');
  return res.data;
}

export async function updateAdminUserPageAccessOverrides(
  userId: number,
  updates: Array<{ pageKey: import('../types/api').PageKey; state: import('../types/api').AccessOverrideState; validFrom?: string; validUntil?: string }>
): Promise<import('../types/api').UserPageAccessOverview> {
  const res = await api.put<import('../types/api').UserPageAccessOverview>(`/api/admin/page-access/users/${userId}`, updates);
  return res.data;
}

export async function getShoppingList(): Promise<import('../types/api').ShoppingListResponse> {
  const res = await api.get<import('../types/api').ShoppingListResponse>('/api/shopping-list');
  return res.data;
}

export async function getWorkOrdersWithInvoices(): Promise<import('../types/api').WorkOrderResponse[]> {
  const res = await api.get<import('../types/api').PageResponse<import('../types/api').WorkOrderResponse>>('/api/admin/work-orders', {
    params: { size: 1000, hasInvoice: true },
  });
  return res.data.content;
}

export async function getUrgentWorkOrdersWithInvoices(): Promise<import('../types/api').UrgentWorkOrderResponse[]> {
  const res = await api.get<import('../types/api').UrgentWorkOrderResponse[]>('/api/urgent-work-orders');
  return res.data.filter((wo) => !!wo.invoiceFilename);
}

// ─── Inventory System API (Horizon Nature) ─────────────────────────────

import type {
  InventoryCategoryResponse,
  InventoryProductResponse,
  InventoryProductRequest,
  InventorySessionResponse,
  InventoryCountItemResponse,
} from '../types/api';

// Categories
export async function getInventoryCategories(): Promise<InventoryCategoryResponse[]> {
  const res = await api.get<InventoryCategoryResponse[]>('/api/inventory/categories');
  return res.data;
}
export async function createInventoryCategory(name: string): Promise<InventoryCategoryResponse> {
  const res = await api.post<InventoryCategoryResponse>('/api/inventory/categories', { name });
  return res.data;
}
export async function deleteInventoryCategory(id: number): Promise<void> {
  await api.delete(`/api/inventory/categories/${id}`);
}

// Products
export async function getInventoryProducts(q?: string): Promise<InventoryProductResponse[]> {
  const params: any = {};
  if (q) params.q = q;
  const res = await api.get<InventoryProductResponse[]>('/api/inventory/products', { params });
  return res.data;
}
export async function getInventoryProduct(id: number): Promise<InventoryProductResponse> {
  const res = await api.get<InventoryProductResponse>(`/api/inventory/products/${id}`);
  return res.data;
}
export async function createInventoryProduct(data: InventoryProductRequest): Promise<InventoryProductResponse> {
  const res = await api.post<InventoryProductResponse>('/api/inventory/products', data);
  return res.data;
}
export async function updateInventoryProduct(id: number, data: Partial<InventoryProductRequest>): Promise<InventoryProductResponse> {
  const res = await api.patch<InventoryProductResponse>(`/api/inventory/products/${id}`, data);
  return res.data;
}
export async function deleteInventoryProduct(id: number): Promise<void> {
  await api.delete(`/api/inventory/products/${id}`);
}
export async function getInventoryZones(): Promise<string[]> {
  const res = await api.get<string[]>('/api/inventory/zones');
  return res.data;
}

// Count Sessions
export async function getInventorySessions(): Promise<InventorySessionResponse[]> {
  const res = await api.get<InventorySessionResponse[]>('/api/inventory/sessions');
  return res.data;
}
export async function getInventorySession(id: number): Promise<InventorySessionResponse> {
  const res = await api.get<InventorySessionResponse>(`/api/inventory/sessions/${id}`);
  return res.data;
}
export async function createInventorySession(name: string, notes?: string): Promise<InventorySessionResponse> {
  const res = await api.post<InventorySessionResponse>('/api/inventory/sessions', { name, notes });
  return res.data;
}
export async function startInventorySession(id: number): Promise<InventorySessionResponse> {
  const res = await api.patch<InventorySessionResponse>(`/api/inventory/sessions/${id}/start`);
  return res.data;
}
export async function completeInventorySession(id: number): Promise<InventorySessionResponse> {
  const res = await api.patch<InventorySessionResponse>(`/api/inventory/sessions/${id}/complete`);
  return res.data;
}
export async function cancelInventorySession(id: number): Promise<InventorySessionResponse> {
  const res = await api.patch<InventorySessionResponse>(`/api/inventory/sessions/${id}/cancel`);
  return res.data;
}
export async function deleteInventorySession(id: number): Promise<void> {
  await api.delete(`/api/inventory/sessions/${id}`);
}

// Count Items
export async function getInventorySessionItems(sessionId: number, zone?: string, q?: string): Promise<InventoryCountItemResponse[]> {
  const params: any = {};
  if (zone) params.zone = zone;
  if (q) params.q = q;
  const res = await api.get<InventoryCountItemResponse[]>(`/api/inventory/sessions/${sessionId}/items`, { params });
  return res.data;
}
export async function recordInventoryCount(sessionId: number, productId: number, countedQty: number, notes?: string): Promise<InventoryCountItemResponse> {
  const res = await api.post<InventoryCountItemResponse>(`/api/inventory/sessions/${sessionId}/count`, { productId, countedQty, notes });
  return res.data;
}
export function getInventoryExportUrl(sessionId: number): string {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/api/inventory/sessions/${sessionId}/export`;
}

// ─── Software Subscriptions API ────────────────────────────────────────

import type {
  SubscriptionResponse,
  SubscriptionRequest,
  SubscriptionReportResponse,
} from '../types/api';

export async function getSubscriptions(): Promise<SubscriptionResponse[]> {
  const res = await api.get<SubscriptionResponse[]>('/api/admin/subscriptions');
  return res.data;
}
export async function getSubscription(id: number): Promise<SubscriptionResponse> {
  const res = await api.get<SubscriptionResponse>(`/api/admin/subscriptions/${id}`);
  return res.data;
}
export async function createSubscription(data: SubscriptionRequest): Promise<SubscriptionResponse> {
  const res = await api.post<SubscriptionResponse>('/api/admin/subscriptions', data);
  return res.data;
}
export async function updateSubscription(id: number, data: SubscriptionRequest): Promise<SubscriptionResponse> {
  const res = await api.put<SubscriptionResponse>(`/api/admin/subscriptions/${id}`, data);
  return res.data;
}
export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/api/admin/subscriptions/${id}`);
}
export async function getSubscriptionReport(): Promise<SubscriptionReportResponse> {
  const res = await api.get<SubscriptionReportResponse>('/api/admin/subscriptions/report');
  return res.data;
}

// ─── Audit Trail / Developer Insights ───────────────────────────────────────

import type {
  AuditStatsResponse,
  AuditLogsPage,
  AuditUserStat,
  AuditActionEntry,
  AuditTimelineEntry,
} from '../types/api';

// ─── Dev Jobs ────────────────────────────────────────────────────────────────

export async function getJobs(): Promise<import('../types/api').JobStatus[]> {
  const res = await api.get('/api/dev/jobs');
  return res.data;
}

export async function triggerJob(id: string): Promise<import('../types/api').JobStatus> {
  const res = await api.post(`/api/dev/jobs/${id}/trigger`);
  return res.data;
}

export async function getAuditStats(range: number = 7): Promise<AuditStatsResponse> {
  const res = await api.get<AuditStatsResponse>('/api/developper/audit/stats', { params: { range } });
  return res.data;
}

export async function getAuditLogs(params: {
  page?: number;
  size?: number;
  userId?: number | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<AuditLogsPage> {
  const res = await api.get<AuditLogsPage>('/api/developper/audit/logs', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 50,
      ...(params.userId   ? { userId: params.userId }     : {}),
      ...(params.action   ? { action: params.action }     : {}),
      ...(params.from     ? { from:   params.from }       : {}),
      ...(params.to       ? { to:     params.to }         : {}),
    },
  });
  return res.data;
}

export async function getAuditUserStats(range: number = 30): Promise<AuditUserStat[]> {
  const res = await api.get<AuditUserStat[]>('/api/developper/audit/user-stats', { params: { range } });
  return res.data;
}

export async function getAuditActionBreakdown(range: number = 30): Promise<AuditActionEntry[]> {
  const res = await api.get<AuditActionEntry[]>('/api/developper/audit/action-breakdown', { params: { range } });
  return res.data;
}

export async function getAuditTimeline(range: number = 30): Promise<AuditTimelineEntry[]> {
  const res = await api.get<AuditTimelineEntry[]>('/api/developper/audit/timeline', { params: { range } });
  return res.data;
}

export async function postAuditTrack(payload: {
  action: string;
  entityType?: string;
  entityId?: number;
  entityTitle?: string;
  details?: string;
}): Promise<void> {
  await api.post('/api/developper/audit/track', payload);
}

// ─── Presence / Online Users ────────────────────────────────────────────────

export interface OnlineUser {
  id: number;
  email: string;
  role: string;
  lastActiveAt: string;
}

/** Ping to mark the current user as active. Accessible to all roles. */
export async function postPresencePing(): Promise<void> {
  await api.post('/api/presence/ping');
}

/** Returns users who pinged within the last 5 minutes (DEVELOPER only). */
export async function getOnlineUsers(): Promise<OnlineUser[]> {
  const res = await api.get<OnlineUser[]>('/api/presence/online');
  return res.data;
}
