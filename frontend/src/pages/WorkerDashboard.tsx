import * as React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { NotificationsContext, NotificationsContextType } from '../context/NotificationsContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';

const WorkerDashboard: React.FC = () => {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const ctx = React.useContext(NotificationsContext) as NotificationsContextType;
  const reminders = ctx.notifications.filter((n) => n.source === 'REMINDER');
  const unreadCount = ctx.notifications.filter((n) => !n.read).length + ctx.broadcastNotifications.filter((n) => !n.read).length;
  const isDark = colorScheme === 'dark';

  return (
    <div className="min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className={`rounded-2xl border p-6 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <p className={`${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
            {t.workerDashboardWelcome || 'Welcome! You can follow notifications and manage your own account settings from here.'}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
            <div className="text-3xl font-bold text-brand-600 mb-1">{unreadCount}</div>
            <div className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.notificationsHeader}</div>
          </div>
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
            <div className="text-3xl font-bold text-amber-600 mb-1">{reminders.length}</div>
            <div className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.remindersSectionTitle || 'Reminders'}</div>
          </div>
        </section>

        <section className={`p-6 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-surface-100' : 'text-surface-700'}`}>{t.workerPermissionsTitle || 'Your Permissions'}</h3>
          <ul className={`space-y-2 text-sm ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
            <li>• {t.workerPermissionNotifications || 'View and manage your notifications.'}</li>
            <li>• {t.workerPermissionProfile || 'Change only your own password and personal settings.'}</li>
            <li>• {t.workerPermissionLimited || 'No access to admin/technician management pages.'}</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/worker/notifications"
              className="inline-flex items-center px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              {t.notificationsHeader}
            </Link>
            <Link
              to="/worker/work-orders"
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700 border border-surface-700' : 'bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-200'}`}
            >
              {t.workOrders}
            </Link>
          </div>
        </section>

        <p className={`text-center text-sm opacity-70 ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
          {t.pageExplanationWorkerDashboard}
        </p>
      </div>
    </div>
  );
};

export default WorkerDashboard;
