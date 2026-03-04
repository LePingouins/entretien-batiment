import React from 'react';
import PageHeader from '../components/PageHeader';
import { NotificationsContext } from '../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const { count, notifications, markAllRead, removeNotification, markRead } = React.useContext(NotificationsContext);
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState<Record<string, boolean>>({
    'workorder-create': true,
    'workorder-delete': true,
    'urgent-create': true,
    'urgent-delete': true,
    'mileage-create': true,
    'mileage-delete': true,
    other: true,
  });

  const filterOptions = [
    { key: 'workorder-create', label: 'Work Order Created' },
    { key: 'workorder-delete', label: 'Work Order Deleted' },
    { key: 'urgent-create', label: 'Urgent Work Order Created' },
    { key: 'urgent-delete', label: 'Urgent Work Order Deleted' },
    { key: 'mileage-create', label: 'Mileage Created' },
    { key: 'mileage-delete', label: 'Mileage Deleted' },
    { key: 'other', label: 'Other' },
  ];

  const toggleFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6">
      <PageHeader title="Notifications" subtitle={`You have ${count} unread`} />
      <div className="mb-3 md:hidden">
        <button
          className="px-3 py-2 rounded-md bg-gray-100 dark:bg-surface-800 text-sm font-medium"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      <div className="flex gap-6">
        <aside className={`w-64 ${filtersOpen ? 'block' : 'hidden'} md:block`}>
          <div className="rounded-lg border p-4 bg-white dark:bg-surface-900 sticky top-6">
            <h3 className="text-sm font-semibold mb-3">Filters</h3>
            <div className="flex flex-col gap-2">
              {filterOptions.map(opt => (
                <label key={opt.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!filters[opt.key]} onChange={() => toggleFilter(opt.key)} className="w-4 h-4" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-lg border p-4 bg-white dark:bg-surface-900">
            <div className="mb-4 flex justify-end">
              <button onClick={markAllRead} className="px-3 py-1 rounded-md bg-brand-600 text-white text-sm hover:bg-brand-700 transition-colors">Mark all read</button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-sm text-surface-500 text-center py-6">No notifications</div>
            ) : (
              <ul className="space-y-3">
                {notifications.filter(n => {
                  const src = n.source || 'other';
                  return !!filters[src];
                }).map((n) => (
                  <li
                    key={n.id}
                    onClick={() => {
                      // mark read then navigate if href provided
                      markRead(n.id);
                      if (n.href) navigate(n.href);
                    }}
                    role={n.href ? 'button' : undefined}
                    tabIndex={n.href ? 0 : undefined}
                    className={`p-4 rounded-md border ${n.read ? 'bg-white dark:bg-surface-800 border-surface-200' : 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800'} cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-semibold ${n.read ? 'text-surface-700 dark:text-surface-300' : 'text-brand-800 dark:text-brand-300'}`}>{n.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-surface-500">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                          aria-label="Delete notification"
                          className="ml-2 text-surface-400 hover:text-red-500 p-1 rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationsPage;
