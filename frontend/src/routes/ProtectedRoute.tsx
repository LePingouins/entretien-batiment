import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../lib/pageAccess';
import { UserRole } from '../types/api';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, allowedRoles }) => {
  const { accessToken, role } = useAuth();
  const roleHome = getRoleHomePath(role);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={roleHome} replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={role ? roleHome : '/login'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
