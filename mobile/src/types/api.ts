export type UserRole = 'ADMIN' | 'DEVELOPPER' | 'TECH' | 'WORKER' | 'REPRESENTANT';

export type PageKey =
  | 'DASHBOARD'
  | 'WORK_ORDERS'
  | 'URGENT_WORK_ORDERS'
  | 'MILEAGE'
  | 'ARCHIVE'
  | 'ANALYTICS'
  | 'USERS'
  | 'NOTIFICATIONS'
  | 'INVENTORY'
  | 'INVENTORY_PRODUCTS'
  | 'SUBSCRIPTIONS'
  | 'REP_TRIPS'
  | 'REP_EXPENSES'
  | 'REPRESENTANTS'
  | 'PREVENTIVE_MAINTENANCE';

export interface MobileTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  role: UserRole;
  enabled: boolean;
  remindersEnabled: boolean;
}

export interface PageAccessEntry {
  pageKey: PageKey;
  allowed: boolean;
}

export interface MyPageAccessResponse {
  pages: PageAccessEntry[];
}

export type WorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  createdByUserId: number;
  createdByName?: string | null;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  requestedDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentFilename?: string | null;
  attachmentDownloadUrl?: string | null;
  invoiceFilename?: string | null;
  invoiceDownloadUrl?: string | null;
  materialsCount?: number;
  materialsPreview?: string[];
  archived: boolean;
}

export interface WorkOrderInput {
  title: string;
  description?: string;
  location?: string;
  priority: WorkOrderPriority;
  requestedDate?: string;
  dueDate?: string | null;
  assignedToUserId?: number | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UrgentWorkOrder {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  createdByUserId: number;
  createdByName?: string | null;
  assignedToUserId?: number | null;
  assignedToName?: string | null;
  requestedDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  attachmentFilename?: string | null;
  attachmentDownloadUrl?: string | null;
  invoiceFilename?: string | null;
  invoiceDownloadUrl?: string | null;
  materialsCount?: number;
  materialsPreview?: string[] | string;
  archived: boolean;
}

export interface UrgentWorkOrderInput {
  title: string;
  description: string;
  location: string;
  priority: WorkOrderPriority;
  status?: WorkOrderStatus;
  dueDate?: string | null;
  assignedToUserId?: number | null;
}

export interface DashboardStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  urgentWorkOrders: number;
  activeUrgentWorkOrders: number;
  mileageEntries: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  href?: string | null;
  source?: string | null;
  bugReportId?: number | null;
}

export interface MileageEntry {
  id: number;
  date: string;
  supplier: string;
  startKm: number | null;
  endKm: number | null;
  totalKm?: number | null;
  notes?: string | null;
  archived: boolean;
  archivedAt?: string | null;
  workOrderId?: number | null;
  urgentWorkOrderId?: number | null;
}

export interface MileageEntryInput {
  date: string;
  supplier: string;
  startKm: number | null;
  endKm: number | null;
  workOrderId?: number | null;
  urgentWorkOrderId?: number | null;
}

export interface TechnicianStats {
  userId: number;
  name: string;
  completedTasks: number;
}

export interface AnalyticsStats {
  tasksCompletedThisWeek: number;
  urgentTasksCompletedThisWeek: number;
  normalTasksCompletedThisWeek: number;
  completionRate: number;
  averageCompletionTimeHours: number;
  averageCompletionTimeUrgent: number;
  averageCompletionTimeNormal: number;
  totalMileageThisMonth: number;
  urgentCount: number;
  normalCount: number;
  urgentRatio: number;
  overdueCompletedTasks: number;
  overdueActiveTasks: number;
  tasksCreatedThisWeek: number;
  tasksCreatedThisMonth: number;
  tasksCancelledThisWeek: number;
  tasksCancelledThisMonth: number;
  activeTasksByStatus: Record<string, number>;
  averageMileagePerTask: number;
  topTechnicians: TechnicianStats[];
  averageTasksPerDay: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  enabled: boolean;
  remindersEnabled: boolean;
  getReminders: boolean;
}

export interface ShoppingListItem {
  materialId: number;
  name: string;
  quantity?: number;
  bought: boolean;
  supplier?: string;
  url?: string;
  description?: string;
  workOrderId: number;
  workOrderTitle: string;
  workOrderType: 'REGULAR' | 'URGENT';
  workOrderStatus: string;
}

export interface ShoppingListResponse {
  items: ShoppingListItem[];
  totalCount: number;
  boughtCount: number;
  unboughtCount: number;
}

export interface InventoryCategory {
  id: number;
  name: string;
  createdAt: string;
}

export interface InventoryProduct {
  id: number;
  sku: string;
  name: string;
  categoryId?: number;
  categoryName?: string;
  unit: string;
  barcode?: string;
  expectedQty: number;
  locationZone?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryProductInput {
  sku: string;
  name: string;
  categoryId?: number;
  unit?: string;
  barcode?: string;
  expectedQty?: number;
  locationZone?: string;
  notes?: string;
}

export type InventorySessionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InventorySession {
  id: number;
  name: string;
  status: InventorySessionStatus;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  createdByUserId?: number;
  createdByName?: string;
  totalItems: number;
  countedItems: number;
  discrepancyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCountItem {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  productBarcode?: string;
  unit: string;
  zone?: string;
  expectedQty: number;
  countedQty?: number;
  discrepancy?: number;
  countedByName?: string;
  notes?: string;
  countedAt?: string;
}

export type TaskFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';
export type TaskSite = 'INEWA' | 'HORIZON_NATURE';

export interface PreventiveTask {
  id: number;
  name: string;
  frequency: TaskFrequency;
  site: TaskSite;
  displayOrder: number;
  isDue: boolean;
  lastCompletedAt?: string;
  lastCompletionId?: number;
  lastCompletedByEmail?: string;
}

export type SubscriptionBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';

export interface Subscription {
  id: number;
  name: string;
  vendor?: string;
  category: string;
  cost: number;
  currency: string;
  billingCycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
  startDate?: string;
  nextDueDate?: string;
  autoRenew: boolean;
  websiteUrl?: string;
  contactEmail?: string;
  notes?: string;
  monthlyCost: number;
  yearlyCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInput {
  name: string;
  vendor?: string;
  category: string;
  cost: number;
  currency: string;
  billingCycle: SubscriptionBillingCycle;
  status?: SubscriptionStatus;
  startDate?: string;
  nextDueDate?: string;
  autoRenew?: boolean;
  websiteUrl?: string;
  contactEmail?: string;
  notes?: string;
}

export interface SubscriptionReport {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalMonthlyCost: number;
  totalYearlyCost: number;
  upcomingRenewals30d: number;
  expiredCount: number;
  costByCategory: Record<string, number>;
  countByCategory: Record<string, number>;
  costByBillingCycle: Record<string, number>;
  countByStatus: Record<string, number>;
  upcomingRenewals: Subscription[];
}