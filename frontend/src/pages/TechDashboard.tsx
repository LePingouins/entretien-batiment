import * as React from 'react';
import { useLang } from '../context/LangContext';
import { NotificationsContext, NotificationsContextType } from '../context/NotificationsContext';
import { Link } from 'react-router-dom';

const TechDashboard: React.FC = () => {
  const { t } = useLang();
  const ctx = React.useContext(NotificationsContext) as NotificationsContextType;
  const reminders = ctx.notifications.filter(n => n.source === 'REMINDER');

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">{t.techDashboardTitle || 'Technician Dashboard'}</h1>
        <p className="text-surface-500 text-lg mb-8">{t.techDashboardWelcome || 'Welcome back! Your assigned work orders and tasks will appear here.'}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white border border-surface-200 shadow-card">
            <div className="text-3xl font-bold text-brand-600 mb-1">0</div>
            <div className="text-sm text-surface-500 font-medium">Assigned Tasks</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-surface-200 shadow-card">
            <div className="text-3xl font-bold text-emerald-600 mb-1">0</div>
            <div className="text-sm text-surface-500 font-medium">Completed Today</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-surface-200 shadow-card text-left">
          <h3 className="font-semibold text-surface-700 mb-3 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Recent Activity
          </h3>
          <p className="text-surface-400 text-sm">No recent activity to show. Check back later!</p>
        </div>

        {/* Reminders Panel */}
        <div className="p-6 rounded-2xl bg-white border border-surface-200 shadow-card text-left mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {t.remindersSectionTitle || 'Reminders'}
            </h3>
          </div>
          
          {reminders.length === 0 ? (
            <p className="text-surface-400 text-sm">{t.noReminders || 'No active reminders.'}</p>
          ) : (
            <div className="space-y-4">
              {reminders.map(r => {
                let title = t.notifTitleReminder;
                let msg = t.notifMsgReminder;
                // Try to extract work order name from message if possible
                const nameMatch = r.message.match(/work order '([^']+)'/i);
                if (nameMatch && nameMatch[1]) {
                  msg = msg.replace('{name}', nameMatch[1]);
                } else {
                  msg = msg.replace('{name}', '');
                }
                return (
                  <div key={r.id} className={`p-4 rounded-xl border ${!r.read ? 'bg-indigo-50/50 border-indigo-100' : 'bg-surface-50 border-surface-100'} flex flex-col`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-surface-800 text-sm">{title}</h4>
                      {!r.read && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block flex-shrink-0"></span>}
                    </div>
                    <p className="text-sm text-surface-600 mb-3">{msg}</p>
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
                        <Link to={r.href} className="text-xs text-surface-600 hover:text-surface-800 bg-surface-100 hover:bg-surface-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                          {t.view || 'View'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechDashboard;
