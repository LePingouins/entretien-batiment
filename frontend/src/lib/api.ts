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
    const token = localStorage.getItem('accessToken');
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
        // Decode the new token and update role/userId in localStorage
        const decoded = decodeJwt(accessToken);
        localStorage.setItem('accessToken', accessToken);
        if (decoded.role) {
          localStorage.setItem('role', decoded.role);
        }
        if (decoded.sub) {
          localStorage.setItem('userId', decoded.sub);
        }
        // Dispatch a storage event so AuthContext can update its state
        window.dispatchEvent(new Event('auth-storage-update'));
        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
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

export async function createUrgentWorkOrder(payload: UrgentWorkOrderRequest & { dueDate?: string; priority?: string; assignedToUserId?: number | string | null }) : Promise<UrgentWorkOrderResponse> {
  // If files are present, use FormData, else send JSON
  if (payload.files && payload.files.length > 0) {
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
    for (let i = 0; i < payload.files.length; i++) {
      formData.append('files', payload.files[i]);
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
  data: Partial<UrgentWorkOrderRequest & { status: string; dueDate?: string; priority?: string; assignedToUserId?: number | string | null; removeAttachment?: boolean }>
): Promise<UrgentWorkOrderResponse> {
  const hasFiles = data.files && (data.files instanceof FileList ? data.files.length > 0 : Array.isArray(data.files) && data.files.length > 0);
  const mustUseMultipart = !!hasFiles || data.removeAttachment === true;

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
    const filesArr = data.files instanceof FileList ? Array.from(data.files) : Array.isArray(data.files) ? data.files : [];
    for (let i = 0; i < filesArr.length; i++) {
      formData.append('files', filesArr[i]);
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

export async function createBroadcast(title: string, message: string, href?: string): Promise<void> {
  await api.post('/api/notifications/broadcast', { title, message, href });
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
  updates: Array<{ pageKey: import('../types/api').PageKey; state: import('../types/api').AccessOverrideState }>
): Promise<import('../types/api').UserPageAccessOverview> {
  const res = await api.put<import('../types/api').UserPageAccessOverview>(`/api/admin/page-access/users/${userId}`, updates);
  return res.data;
}

