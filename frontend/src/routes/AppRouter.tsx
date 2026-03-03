import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from '../App';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../components/AdminLayout';
import TechLayout from '../components/TechLayout';
import TechDashboard from '../pages/TechDashboard';
import AdminWorkOrdersPage from '../pages/AdminWorkOrdersPage';
import MileagePage from '../pages/MileagePage';
import ArchivePage from '../pages/ArchivePage';
import NotificationsPage from '../pages/NotificationsPage';

import UrgentWorkOrdersPage from '../pages/UrgentWorkOrdersPage';
import DashboardPage from '../pages/DashboardPage';

import { Navigate } from 'react-router-dom';

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
        path: 'admin',
        element: <ProtectedRoute requiredRole="ADMIN" />,
        children: [
          {
            path: '',
            element: <AdminLayout />, // layout for admin
            children: [
              {
                index: true,
                element: <DashboardPage />,
              },
              {
                path: 'work-orders',
                element: <AdminWorkOrdersPage />,
              },
              {
                path: 'work-orders/:id',
                element: React.createElement(React.lazy(() => import('../pages/WorkOrderDetailPage'))),
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'urgent-work-orders',
                element: <UrgentWorkOrdersPage />,
              },
              {
                path: 'urgent-work-orders/:id',
                element: React.createElement(React.lazy(() => import('../pages/UrgentWorkOrderDetailPage'))),
              },
                {
                  path: 'mileage',
                  element: <MileagePage />,
                },
                {
                  path: 'archive',
                  element: <ArchivePage />,
                },
              // More admin pages can go here
  // ...existing code...
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
            element: <TechLayout />, // layout for tech
            children: [
              {
                path: '',
                element: <TechDashboard />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              // More tech pages can go here
            ],
          },
        ],
      },
    ],
  },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
