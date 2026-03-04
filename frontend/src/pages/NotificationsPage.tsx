import React from 'react';
import PageHeader from '../components/PageHeader';
import { NotificationsContext } from '../context/NotificationsContext';

const NotificationsPage: React.FC = () => {
  const { count, notifications, markAllRead } = React.useContext(NotificationsContext);

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6">
      <PageHeader title="Notifications" subtitle={`You have ${count} unread`} />
      <div className="rounded-lg border p-4 bg-white dark:bg-surface-900">
        <div className="mb-4 flex justify-end">
          <button onClick={markAllRead} className="px-3 py-1 rounded-md bg-brand-600 text-white text-sm hover:bg-brand-700 transition-colors">Mark all read</button>
        </div>
        {notifications.length === 0 ? (
          <div className="text-sm text-surface-500 text-center py-6">No notifications</div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className={`p-4 rounded-md border ${n.read ? 'bg-white dark:bg-surface-800 border-surface-200' : 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800'}`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-semibold ${n.read ? 'text-surface-700 dark:text-surface-300' : 'text-brand-800 dark:text-brand-300'}`}>{n.title}</h4>
                  <span className="text-xs text-surface-500">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
