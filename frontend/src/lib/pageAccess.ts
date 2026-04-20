import type { PageKey, UserRole } from '../types/api';

export const PAGE_KEYS: PageKey[] = [
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'ARCHIVE',
  'ANALYTICS',
  'USERS',
  'NOTIFICATIONS',
  'INVENTORY',
  'INVENTORY_PRODUCTS',
];

const PAGE_SEGMENTS: Record<PageKey, string> = {
  DASHBOARD: '',
  WORK_ORDERS: 'work-orders',
  URGENT_WORK_ORDERS: 'urgent-work-orders',
  MILEAGE: 'mileage',
  ARCHIVE: 'archive',
  ANALYTICS: 'analytics',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  INVENTORY: 'inventory',
  INVENTORY_PRODUCTS: 'inventory/products',
};

const ADMIN_FALLBACK_ORDER: PageKey[] = [
  'USERS',
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'NOTIFICATIONS',
  'ARCHIVE',
  'ANALYTICS',
  'INVENTORY',
  'INVENTORY_PRODUCTS',
];

const NON_ADMIN_FALLBACK_ORDER: PageKey[] = [
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'NOTIFICATIONS',
  'ARCHIVE',
  'ANALYTICS',
  'USERS',
  'INVENTORY',
  'INVENTORY_PRODUCTS',
];

export function getRoleBasePath(role: UserRole | null | undefined): '/admin' | '/tech' | '/worker' {
  if (role === 'ADMIN' || role === 'DEVELOPPER') return '/admin';
  if (role === 'WORKER') return '/worker';
  return '/tech';
}

export function getRoleHomePath(role: UserRole | null | undefined): string {
  return getRoleBasePath(role);
}

export function getRolePagePath(role: UserRole | null | undefined, pageKey: PageKey): string {
  const base = getRoleBasePath(role);
  const segment = PAGE_SEGMENTS[pageKey];
  return segment ? `${base}/${segment}` : base;
}

export function getRoleFallbackOrder(role: UserRole | null | undefined): PageKey[] {
  return role === 'ADMIN' || role === 'DEVELOPPER' ? ADMIN_FALLBACK_ORDER : NON_ADMIN_FALLBACK_ORDER;
}
