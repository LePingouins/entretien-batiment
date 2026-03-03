import React from 'react';
import PageHeader from '../components/PageHeader';
import { NotificationsContext } from '../context/NotificationsContext';

const NotificationsPage: React.FC = () => {
  const { count, markAllRead } = React.useContext(NotificationsContext);

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6">
      <PageHeader title="Notifications" subtitle={`You have ${count} unread`} />
      <div className="rounded-lg border p-4 bg-white dark:bg-surface-900">
        <div className="mb-4 flex justify-end">
          <button onClick={markAllRead} className="px-3 py-1 rounded-md bg-brand-600 text-white text-sm">Mark all read</button>
        </div>
        {count === 0 ? (
          <div className="text-sm text-surface-500">No notifications</div>
        ) : (
          <ul className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <li key={i} className="p-3 rounded-md border bg-surface-50">Mock notification #{i + 1}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
