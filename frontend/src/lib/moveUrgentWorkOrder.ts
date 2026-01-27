// Move an urgent work order to a different status at a specific index (like moveWorkOrder for admin)
import api from './api';
import { UrgentWorkOrderResponse } from '../types/api';

export async function moveUrgentWorkOrder(workOrderId: number, newStatus: string, newIndex: number): Promise<UrgentWorkOrderResponse> {
  const res = await api.patch<UrgentWorkOrderResponse>(`/api/urgent-work-orders/${workOrderId}/move`, { newStatus, newIndex });
  return res.data;
}
