/**
 * Reorder urgent work orders within a single status column.
 * Sets sortIndex = array index for each id in orderedIds.
 * Used when dragging a card within the same column.
 */
export async function reorderUrgentWorkOrders(status: string, orderedIds: number[]): Promise<void> {
  // Backend expects array of {id, sortIndex}
  const reorderRequests = orderedIds.map((id, idx) => ({ id, sortIndex: idx }));
  await api.patch('/api/urgent-work-orders/reorder', reorderRequests);
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
import type { UrgentWorkOrderResponse, UrgentWorkOrderRequest } from '../types/api';

export async function getUrgentWorkOrders(): Promise<UrgentWorkOrderResponse[]> {
  const res = await api.get<UrgentWorkOrderResponse[]>('/api/urgent-work-orders');
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

export async function createUrgentWorkOrder(payload: UrgentWorkOrderRequest & { dueDate?: string; priority?: string; }) : Promise<UrgentWorkOrderResponse> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('location', payload.location);
  if (payload.dueDate) {
    // Always send as ISO string
    formData.append('dueDate', payload.dueDate.length === 10 ? payload.dueDate + 'T00:00:00' : payload.dueDate);
  }
  if (payload.priority) {
    formData.append('priority', payload.priority);
  }
  if (payload.files && payload.files.length > 0) {
    for (let i = 0; i < payload.files.length; i++) {
      formData.append('files', payload.files[i]);
    }
  }
  const res = await api.post('/api/urgent-work-orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateUrgentWorkOrder(id: number, data: Partial<UrgentWorkOrderRequest & { status: string; dueDate?: string; priority?: string }>): Promise<UrgentWorkOrderResponse> {
  // If files are present, use FormData
  if (data.files && (data.files instanceof FileList ? data.files.length > 0 : Array.isArray(data.files) && data.files.length > 0)) {
    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.location !== undefined) formData.append('location', data.location);
    if (data.dueDate !== undefined) formData.append('dueDate', data.dueDate.length === 10 ? data.dueDate + 'T00:00:00' : data.dueDate);
    if (data.priority !== undefined) formData.append('priority', data.priority);
    if (data.status !== undefined) formData.append('status', data.status);
    const filesArr = data.files instanceof FileList ? Array.from(data.files) : Array.isArray(data.files) ? data.files : [];
    for (let i = 0; i < filesArr.length; i++) {
      formData.append('files', filesArr[i]);
    }
    const res = await api.patch(`/api/urgent-work-orders/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } else {
    const res = await api.patch<UrgentWorkOrderResponse>(`/api/urgent-work-orders/${id}`, data);
    return res.data;
  }
}

export async function deleteUrgentWorkOrder(id: number): Promise<void> {
  await api.delete(`/api/urgent-work-orders/${id}`);
}
