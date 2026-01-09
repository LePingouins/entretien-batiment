export interface MaterialResponse {
  id: number;
  name: string;
  quantity?: number;
  bought: boolean;
}

export interface MaterialRequest {
  name: string;
  quantity?: number;
}
export enum WorkOrderStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface WorkOrderResponse {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  createdByUserId: number;
  assignedToUserId?: number;
  requestedDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  attachmentFilename?: string;
  attachmentContentType?: string;
  attachmentDownloadUrl?: string;
  materialsCount?: number;
  materialsPreview?: string[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuthResponse {
  accessToken: string;
  role: 'ADMIN' | 'TECH';
  userId: number;
}

export interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
}
