import * as React from 'react';
import { useLang } from '../context/LangContext';
import { NotificationsContext, NotificationsContextType } from '../context/NotificationsContext';
import { Link } from 'react-router-dom';
import { ColorSchemeContext } from '../context/ColorSchemeContext';

const TechDashboard: React.FC = () => {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const ctx = React.useContext(NotificationsContext) as NotificationsContextType;
  const reminders = ctx.notifications.filter(n => n.source === 'REMINDER');
  const unreadCount = ctx.notifications.filter((n) => !n.read).length + ctx.broadcastNotifications.filter((n) => !n.read).length;
  const isDark = colorScheme === 'dark';

  return (
    <div className="min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className={`rounded-2xl border p-6 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <p className={`${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
            {t.techDashboardWelcome || 'Welcome back! Your assigned work orders and tasks will appear here.'}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
            <div className="text-3xl font-bold text-brand-600 mb-1">{unreadCount}</div>
            <div className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.notificationsHeader}</div>
          </div>
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
            <div className="text-3xl font-bold text-indigo-500 mb-1">{reminders.length}</div>
            <div className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.remindersSectionTitle || 'Reminders'}</div>
          </div>
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
            <div className={`text-sm font-semibold mb-3 ${isDark ? 'text-surface-300' : 'text-surface-700'}`}>{t.quickAccess || 'Quick Access'}</div>
            <div className="flex flex-wrap gap-2">
              <Link to="/tech/work-orders" className="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                {t.workOrders}
              </Link>
              <Link to="/tech/notifications" className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-surface-800 text-surface-200 border border-surface-700 hover:bg-surface-700' : 'bg-surface-100 text-surface-700 border border-surface-200 hover:bg-surface-200'}`}>
                {t.notificationsHeader}
              </Link>
            </div>
          </div>
        </section>

        <section className={`p-6 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-surface-100' : 'text-surface-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {t.remindersSectionTitle || 'Reminders'}
            </h3>
          </div>

          {reminders.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.noReminders || 'No active reminders.'}</p>
          ) : (
            <div className="space-y-4">
              {reminders.map(r => {
                let title = t.notifTitleReminder;
                let msg = t.notifMsgReminder;
                const nameMatch = r.message.match(/work order '([^']+)'/i);
                if (nameMatch && nameMatch[1]) {
                  msg = msg.replace('{name}', nameMatch[1]);
                } else {
                  msg = msg.replace('{name}', '');
                }

                return (
                  <div
                    key={r.id}
                    className={`p-4 rounded-xl border ${
                      !r.read
                        ? (isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50/50 border-indigo-100')
                        : (isDark ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-100')
                    } flex flex-col`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold text-sm ${isDark ? 'text-surface-100' : 'text-surface-800'}`}>{title}</h4>
                      {!r.read && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block flex-shrink-0"></span>}
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>{msg}</p>
                    <div className="flex justify-end gap-2 mt-auto">
                      <button onClick={() => ctx.removeNotification(r.id)} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        {t.delete || 'Delete'}
                      </button>
                      {!r.read && (
                        <button onClick={() => ctx.markRead(r.id)} className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                          {t.markRead || 'Mark Read'}
                        </button>
                      )}
                      {r.href && (
                        <Link to={r.href} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium ${isDark ? 'text-surface-200 bg-surface-700 hover:bg-surface-600' : 'text-surface-600 bg-surface-100 hover:bg-surface-200'}`}>
                          {t.view || 'View'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className={`text-center text-sm opacity-70 ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
          {t.pageExplanationTechDashboard}
        </p>
      </div>
    </div>
  );
};

export default TechDashboard;
