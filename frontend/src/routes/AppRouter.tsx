import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from '../App';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../components/AdminLayout';
import TechLayout from '../components/TechLayout';
import TechDashboard from '../pages/TechDashboard';
import AdminWorkOrdersPage from '../pages/AdminWorkOrdersPage';

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
                path: 'work-orders',
                element: <AdminWorkOrdersPage />,
              },
              // More admin pages can go here
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
