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
  'REP_TRIPS',
  'REP_EXPENSES',
  'REPRESENTANTS',
  'PREVENTIVE_MAINTENANCE',
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
  SUBSCRIPTIONS: 'subscriptions',
  REP_TRIPS: 'rep-trips',
  REP_EXPENSES: 'expenses',
  REPRESENTANTS: 'representants',
  PREVENTIVE_MAINTENANCE: 'preventive-maintenance',
};

const ADMIN_FALLBACK_ORDER: PageKey[] = [
  'USERS',
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'NOTIFICATIONS',
  'PREVENTIVE_MAINTENANCE',
  'ARCHIVE',
  'ANALYTICS',
  'INVENTORY',
  'INVENTORY_PRODUCTS',
  'REP_TRIPS',
  'REPRESENTANTS',
  'PREVENTIVE_MAINTENANCE',
];

const NON_ADMIN_FALLBACK_ORDER: PageKey[] = [
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'NOTIFICATIONS',
  'PREVENTIVE_MAINTENANCE',
  'ARCHIVE',
  'ANALYTICS',
  'USERS',
  'INVENTORY',
  'INVENTORY_PRODUCTS',
  'REP_TRIPS',
  'PREVENTIVE_MAINTENANCE',
];

const REPRESENTANT_FALLBACK_ORDER: PageKey[] = [
  'REP_TRIPS',
  'REP_EXPENSES',
];

export function getRoleBasePath(role: UserRole | null | undefined): '/admin' | '/tech' | '/worker' | '/rep' {
  if (role === 'ADMIN' || role === 'DEVELOPPER') return '/admin';
  if (role === 'WORKER') return '/worker';
  if (role === 'REPRESENTANT') return '/rep';
  return '/tech';
}

export function getRoleHomePath(role: UserRole | null | undefined): string {
  if (role === 'REPRESENTANT') return '/rep/rep-trips';
  return getRoleBasePath(role);
}

export function getRolePagePath(role: UserRole | null | undefined, pageKey: PageKey): string {
  const base = getRoleBasePath(role);
  const segment = PAGE_SEGMENTS[pageKey];
  return segment ? `${base}/${segment}` : base;
}

export function getRoleFallbackOrder(role: UserRole | null | undefined): PageKey[] {
  if (role === 'REPRESENTANT') return REPRESENTANT_FALLBACK_ORDER;
  return role === 'ADMIN' || role === 'DEVELOPPER' ? ADMIN_FALLBACK_ORDER : NON_ADMIN_FALLBACK_ORDER;
}
