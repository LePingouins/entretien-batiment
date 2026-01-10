import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
});

// Prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

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
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        localStorage.setItem('accessToken', accessToken);
        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
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

export default api;
