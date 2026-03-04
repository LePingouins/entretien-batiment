import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationsContext } from '../context/NotificationsContext';
import { usePageAccess } from '../context/PageAccessContext';
import { getRoleBasePath } from '../lib/pageAccess';

const NotificationsIcon: React.FC = () => {
  const { count } = React.useContext(NotificationsContext);
  const { role } = useAuth();
  const { canAccess } = usePageAccess();
  const base = getRoleBasePath(role);

  if (!canAccess('NOTIFICATIONS')) {
    return null;
  }

  return (
    <Link to={`${base}/notifications`} aria-label={`Notifications (${count})`} className="relative p-2 rounded-lg hover:bg-surface-100 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{count}</span>
      )}
    </Link>
  );
};

export default NotificationsIcon;
