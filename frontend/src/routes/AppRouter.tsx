import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import App from '../App';
import ProtectedRoute from './ProtectedRoute';
import RequirePageAccess from './RequirePageAccess';

// Layouts are kept as eager imports — they are always rendered once the user
// is authenticated and would otherwise flash a loader on every navigation.
import AdminLayout from '../components/AdminLayout';
import TechLayout from '../components/TechLayout';
import WorkerLayout from '../components/WorkerLayout';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
// Each page is split into its own JS chunk by Vite.  The browser only downloads
// a chunk when the user actually navigates to that route, which reduces the
// initial bundle size significantly.
const LoginPage              = lazy(() => import('../pages/LoginPage'));
const DashboardPage          = lazy(() => import('../pages/DashboardPage'));
const TechDashboard          = lazy(() => import('../pages/TechDashboard'));
const WorkerDashboard        = lazy(() => import('../pages/WorkerDashboard'));
const AdminWorkOrdersPage    = lazy(() => import('../pages/AdminWorkOrdersPage'));
const WorkOrderDetailPage    = lazy(() => import('../pages/WorkOrderDetailPage'));
const UrgentWorkOrdersPage   = lazy(() => import('../pages/UrgentWorkOrdersPage'));
const UrgentWorkOrderDetailPage = lazy(() => import('../pages/UrgentWorkOrderDetailPage'));
const MileagePage            = lazy(() => import('../pages/MileagePage'));
const ArchivePage            = lazy(() => import('../pages/ArchivePage'));
const AnalyticsPage          = lazy(() => import('../pages/AnalyticsPage'));
const AdminUsersPage         = lazy(() => import('../pages/AdminUsersPage'));
const NotificationsPage      = lazy(() => import('../pages/NotificationsPage'));
const DevelopperDebugPage    = lazy(() => import('../pages/DevelopperDebugPage'));
const NoAccessPage           = lazy(() => import('../pages/NoAccessPage'));
const DocumentsPage          = lazy(() => import('../pages/DocumentsPage'));
const MaterialsShoppingListPage = lazy(() => import('../pages/MaterialsShoppingListPage'));
const InventoryProductsPage       = lazy(() => import('../pages/InventoryProductsPage'));
const InventoryCountSessionsPage  = lazy(() => import('../pages/InventoryCountSessionsPage'));
const InventoryCountLivePage      = lazy(() => import('../pages/InventoryCountLivePage'));

/** Shown while a lazy page chunk is being downloaded */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'no-access',
        element: <ProtectedRoute allowedRoles={['ADMIN', 'DEVELOPPER', 'TECH', 'WORKER']} />,
        children: [
          {
            index: true,
            element: <NoAccessPage />,
          },
        ],
      },
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['ADMIN', 'DEVELOPPER']} />,
        children: [
          {
            path: '',
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: (
                  <RequirePageAccess pageKey="DASHBOARD">
                    <DashboardPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <AdminWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <WorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'notifications',
                element: (
                  <RequirePageAccess pageKey="NOTIFICATIONS">
                    <NotificationsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'mileage',
                element: (
                  <RequirePageAccess pageKey="MILEAGE">
                    <MileagePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'archive',
                element: (
                  <RequirePageAccess pageKey="ARCHIVE">
                    <ArchivePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'analytics',
                element: (
                  <RequirePageAccess pageKey="ANALYTICS">
                    <AnalyticsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'users',
                element: (
                  <RequirePageAccess pageKey="USERS">
                    <AdminUsersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'documents',
                element: <DocumentsPage />,
              },
              {
                path: 'shopping-list',
                element: <MaterialsShoppingListPage />,
              },
              {
                path: 'inventory',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountSessionsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/products',
                element: (
                  <RequirePageAccess pageKey="INVENTORY_PRODUCTS">
                    <InventoryProductsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/count/:id',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountLivePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'debug',
                element: <ProtectedRoute requiredRole="DEVELOPPER" />,
                children: [
                  {
                    index: true,
                    element: <DevelopperDebugPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'tech',
        element: <ProtectedRoute requiredRole="TECH" />,
        children: [
          {
            path: '',
            element: <TechLayout />,
            children: [
              {
                index: true,
                element: (
                  <RequirePageAccess pageKey="DASHBOARD">
                    <TechDashboard />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <AdminWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <WorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'mileage',
                element: (
                  <RequirePageAccess pageKey="MILEAGE">
                    <MileagePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'archive',
                element: (
                  <RequirePageAccess pageKey="ARCHIVE">
                    <ArchivePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'analytics',
                element: (
                  <RequirePageAccess pageKey="ANALYTICS">
                    <AnalyticsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'notifications',
                element: (
                  <RequirePageAccess pageKey="NOTIFICATIONS">
                    <NotificationsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'documents',
                element: <DocumentsPage />,
              },
              {
                path: 'shopping-list',
                element: <MaterialsShoppingListPage />,
              },
              {
                path: 'inventory',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountSessionsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/products',
                element: (
                  <RequirePageAccess pageKey="INVENTORY_PRODUCTS">
                    <InventoryProductsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/count/:id',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountLivePage />
                  </RequirePageAccess>
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'worker',
        element: <ProtectedRoute requiredRole="WORKER" />,
        children: [
          {
            path: '',
            element: <WorkerLayout />,
            children: [
              {
                index: true,
                element: (
                  <RequirePageAccess pageKey="DASHBOARD">
                    <WorkerDashboard />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <AdminWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="WORK_ORDERS">
                    <WorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrdersPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'urgent-work-orders/:id',
                element: (
                  <RequirePageAccess pageKey="URGENT_WORK_ORDERS">
                    <UrgentWorkOrderDetailPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'mileage',
                element: (
                  <RequirePageAccess pageKey="MILEAGE">
                    <MileagePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'archive',
                element: (
                  <RequirePageAccess pageKey="ARCHIVE">
                    <ArchivePage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'analytics',
                element: (
                  <RequirePageAccess pageKey="ANALYTICS">
                    <AnalyticsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'notifications',
                element: (
                  <RequirePageAccess pageKey="NOTIFICATIONS">
                    <NotificationsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'documents',
                element: <DocumentsPage />,
              },
              {
                path: 'shopping-list',
                element: <MaterialsShoppingListPage />,
              },
              {
                path: 'inventory',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountSessionsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/products',
                element: (
                  <RequirePageAccess pageKey="INVENTORY_PRODUCTS">
                    <InventoryProductsPage />
                  </RequirePageAccess>
                ),
              },
              {
                path: 'inventory/count/:id',
                element: (
                  <RequirePageAccess pageKey="INVENTORY">
                    <InventoryCountLivePage />
                  </RequirePageAccess>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);

/**
 * The Suspense wrapper here catches all lazy-loaded page chunks.
 * PageLoader is shown while the JS chunk for a given page is being downloaded.
 * After the first visit to a route the chunk is cached by the browser, so
 * subsequent navigations to the same route are instant.
 */
const AppRouter = () => (
  <Suspense fallback={<PageLoader />}>
    <RouterProvider router={router} />
  </Suspense>
);

export default AppRouter;
