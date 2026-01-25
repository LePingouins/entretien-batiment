export interface MaterialResponse {
  id: number;
  name: string;
  quantity?: number;
  bought: boolean;
  url?: string;
  description?: string;
  supplier?: string;
}

export interface MaterialRequest {
  name: string;
  quantity?: number;
  url?: string;
  description?: string;
  supplier?: string;
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
  /** Manual ordering index within the status column. NULL means priority-based ordering. */
  sortIndex?: number;
  /** Whether this work order has been archived. */
  archived: boolean;
  /** Timestamp when the work order was archived. */
  archivedAt?: string;
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

// --- Urgent Work Orders Types ---

export type UrgentWorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface UrgentWorkOrderResponse {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: WorkOrderPriority;
  status: UrgentWorkOrderStatus;
  createdByUserId: number;
  assignedToUserId?: number;
  requestedDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  attachmentFilename?: string;
  attachmentContentType?: string;
  attachmentDownloadUrl?: string;
  materialsCount?: number;
  materialsPreview?: string[];
  sortIndex?: number;
  archived: boolean;
  archivedAt?: string;
}

export interface UrgentWorkOrderRequest {
  title: string;
  description: string;
  location: string;
  files?: FileList | File[];
}
