import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'ADMIN' | 'TECH';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { accessToken, role } = useAuth();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && String(role).toUpperCase() !== String(requiredRole).toUpperCase()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
