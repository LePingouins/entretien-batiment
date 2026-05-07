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
  createdByName?: string;
  assignedToUserId?: number;
  assignedToName?: string;
  requestedDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  attachmentFilename?: string;
  attachmentContentType?: string;
  attachmentDownloadUrl?: string;
  invoiceFilename?: string;
  invoiceContentType?: string;
  invoiceDownloadUrl?: string;
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

export type UserRole = 'ADMIN' | 'DEVELOPPER' | 'TECH' | 'WORKER';

export interface AdminUserResponse {
  id: number;
  email: string;
  role: UserRole;
  enabled: boolean;
  remindersEnabled: boolean;
  getReminders: boolean;
}

export interface NotificationRecipientRule {
  source: string;
  admin: boolean;
  tech: boolean;
  worker: boolean;
}

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
  | 'SUBSCRIPTIONS';

export type AccessOverrideState = 'DEFAULT' | 'ALLOW' | 'DENY';

export interface PageAccessEntry {
  pageKey: PageKey;
  allowed: boolean;
}

export interface MyPageAccessResponse {
  pages: PageAccessEntry[];
}

export interface RolePageAccessRule {
  pageKey: PageKey;
  admin: boolean;
  tech: boolean;
  worker: boolean;
}

export interface UserPageAccessItem {
  pageKey: PageKey;
  state: AccessOverrideState;
  effectiveAllowed: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface UserPageAccessOverview {
  userId: number;
  email: string;
  role: UserRole;
  enabled: boolean;
  pages: UserPageAccessItem[];
}

export interface AuthResponse {
  accessToken: string;
  role: UserRole;
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
  createdByName?: string;
  assignedToUserId?: number;
  assignedToName?: string;
  requestedDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  attachmentFilename?: string;
  attachmentContentType?: string;
  attachmentDownloadUrl?: string;
  invoiceFilename?: string;
  invoiceContentType?: string;
  invoiceDownloadUrl?: string;
  materialsCount?: number;
  materialsPreview?: string[];
  sortIndex?: number;
  archived: boolean;
  archivedAt?: string;
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

export interface UrgentWorkOrderRequest {
  title: string;
  description: string;
  location: string;
  assignedToUserId?: number | string | null;
  files?: FileList | File[];
}

// --- Mileage Types ---
export interface MileageEntry {
  id: number;
  date: string;
  supplier: string;
  startKm: number;
  endKm: number;
  totalKm?: number;
  notes?: string;
  archived: boolean;
  archivedAt?: string;
  workOrderId?: number;
  urgentWorkOrderId?: number;
}

// --- Dashboard Types ---
export interface DashboardStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  urgentWorkOrders: number;
  activeUrgentWorkOrders: number;
  mileageEntries: number;
}

// --- Analytics Types ---
export interface TechnicianStats {
  userId: number;
  name: string;
  completedTasks: number;
}

export interface AnalyticsStatsResponse {
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
  taskFrequencies: Array<{ taskName: string; count: number }>;
}

export interface BugReportCreatedResponse {
  reportId: number;
  createdAt: string;
  nextAllowedAt: string;
}

export interface BugReportConfirmedResponse {
  reportId: number;
  confirmedAt: string;
  confirmedBy: string;
  reporterUserId: number;
  reportTitle: string;
  alreadyConfirmed: boolean;
}

export interface DebugErrorOccurrence {
  id: number;
  occurredAt: string;
  requestMethod: string;
  requestPath: string;
  statusCode: number;
  methodName: string;
  context: string;
  errorMessage: string;
  stackTrace: string;
}

export interface DebugErrorGroup {
  fingerprint: string;
  occurrences: number;
  exceptionType: string;
  errorMessage: string;
  methodName: string;
  lastOccurredAt: string;
  latest: DebugErrorOccurrence | null;
}

export interface DevelopperDebugDashboardResponse {
  totalOccurrences: number;
  uniqueErrors: number;
  errors: DebugErrorGroup[];
}

export interface DevelopperDebugErrorDetailResponse {
  fingerprint: string;
  occurrences: number;
  entries: DebugErrorOccurrence[];
}

// ─── Inventory System (Horizon Nature) ─────────────────────────────────

export interface InventoryCategoryResponse {
  id: number;
  name: string;
  createdAt: string;
}

export interface InventoryProductResponse {
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

export interface InventoryProductRequest {
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

export interface InventorySessionResponse {
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

export interface InventoryCountItemResponse {
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
  countedByUserId?: number;
  countedByName?: string;
  notes?: string;
  countedAt?: string;
}

// ─── Software Subscriptions ─────────────────────────────────────────────

export type SubscriptionBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
export type SubscriptionCategory =
  | 'ERP' | 'ACCOUNTING' | 'SECURITY' | 'INFRASTRUCTURE'
  | 'COMMUNICATION' | 'PRODUCTIVITY' | 'DOMAIN' | 'HOSTING'
  | 'STORAGE' | 'MONITORING' | 'HR' | 'CRM' | 'OTHER';

export interface SubscriptionResponse {
  id: number;
  name: string;
  vendor?: string;
  category: SubscriptionCategory;
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

export interface SubscriptionRequest {
  name: string;
  vendor?: string;
  category: string;
  cost: number;
  currency: string;
  billingCycle: string;
  status?: string;
  startDate?: string;
  nextDueDate?: string;
  autoRenew?: boolean;
  websiteUrl?: string;
  contactEmail?: string;
  notes?: string;
}

export interface SubscriptionReportResponse {
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
  upcomingRenewals: SubscriptionResponse[];
}

// ─── Audit Trail / Developer Insights ─────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  entityTitle: string | null;
  details: string | null;
  ipAddress: string | null;
  occurredAt: string;
}

export interface AuditStatsResponse {
  totalAll: number;
  totalInRange: number;
  uniqueUsers: number;
  loginsInRange: number;
  logoutsInRange: number;
  workOrdersCreatedInRange: number;
  urgentWorkOrdersCreatedInRange: number;
  eventsToday: number;
  mostCommonAction: string | null;
  mostActiveUserEmail: string | null;
  rangeDays: number;
}

export interface AuditUserStat {
  userId: number;
  userEmail: string;
  userRole: string;
  totalActions: number;
  loginCount: number;
  logoutCount: number;
  workOrdersCreated: number;
  urgentWorkOrdersCreated: number;
  lastSeen: string | null;
}

export interface AuditActionEntry {
  action: string;
  count: number;
}

export interface AuditTimelineEntry {
  date: string;
  count: number;
}

export interface AuditLogsPage {
  content: AuditLogEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface JobStatus {
  id: string;
  name: string;
  description: string;
  schedule: string;
  running: boolean;
  progressPercent: number;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  lastRunAt: string | null;
  lastRunMessage: string | null;
  nextRunAt: string | null;
  recentBackups: string[];
  lastBackupSizeBytes: number;
}
