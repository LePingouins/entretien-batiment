import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from '../App';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import RequirePageAccess from './RequirePageAccess';
import AdminLayout from '../components/AdminLayout';
import TechLayout from '../components/TechLayout';
import WorkerLayout from '../components/WorkerLayout';
import TechDashboard from '../pages/TechDashboard';
import WorkerDashboard from '../pages/WorkerDashboard';
import AdminWorkOrdersPage from '../pages/AdminWorkOrdersPage';
import MileagePage from '../pages/MileagePage';
import ArchivePage from '../pages/ArchivePage';
import NotificationsPage from '../pages/NotificationsPage';

import UrgentWorkOrdersPage from '../pages/UrgentWorkOrdersPage';
import DashboardPage from '../pages/DashboardPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import DevelopperDebugPage from '../pages/DevelopperDebugPage';
import NoAccessPage from '../pages/NoAccessPage';

import { Navigate } from 'react-router-dom';

const WorkOrderDetailPage = React.createElement(React.lazy(() => import('../pages/WorkOrderDetailPage')));
const UrgentWorkOrderDetailPage = React.createElement(React.lazy(() => import('../pages/UrgentWorkOrderDetailPage')));

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
                    {WorkOrderDetailPage}
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
                    {UrgentWorkOrderDetailPage}
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
                    {WorkOrderDetailPage}
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
                    {UrgentWorkOrderDetailPage}
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
                    {WorkOrderDetailPage}
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
                    {UrgentWorkOrderDetailPage}
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
            ],
          },
        ],
      },
    ],
  },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
