import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { PageKey } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { usePageAccess } from '../context/PageAccessContext';

type RequirePageAccessProps = {
  pageKey: PageKey;
  children: React.ReactNode;
};

const RequirePageAccess: React.FC<RequirePageAccessProps> = ({ pageKey, children }) => {
  const location = useLocation();
  const { accessToken, role } = useAuth();
  const { loading, canAccess, firstAllowedPath } = usePageAccess();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-surface-500">Loading...</div>
    );
  }

  if (canAccess(pageKey)) {
    return <>{children}</>;
  }

  const fallback = firstAllowedPath(role);

  if (!fallback || fallback === location.pathname) {
    if (location.pathname !== '/no-access') {
      return <Navigate to="/no-access" replace />;
    }
    return <>{children}</>;
  }

  return <Navigate to={fallback} replace />;
};

export default RequirePageAccess;
