import * as React from 'react';
import { useLang } from '../context/LangContext';
import { NotificationsContext, NotificationsContextType } from '../context/NotificationsContext';
import { Link } from 'react-router-dom';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { usePageAccess } from '../context/PageAccessContext';
import { useAuth } from '../context/AuthContext';
import { getRolePagePath } from '../lib/pageAccess';
import type { PageKey } from '../types/api';

// ---- Page tile icons ----
function PageTileIcon({ pageKey, className }: { pageKey: PageKey; className?: string }) {
  switch (pageKey) {
    case 'WORK_ORDERS':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 7.5 0h.375a1.875 1.875 0 0 1 1.875 1.875v1.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5v-1.5Z" />
          <path fillRule="evenodd" d="M3 5.25a.75.75 0 0 1 .75-.75h.322c.242.61.754 1.114 1.353 1.442.503.275 1.05.42 1.625.421h5.86c.602 0 1.176-.152 1.688-.442.576-.328 1.076-.826 1.303-1.421h.349c.414 0 .75.336.75.75v12.5a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V5.25ZM8 10a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 8 10Zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 8 14Z" clipRule="evenodd" />
        </svg>
      );
    case 'URGENT_WORK_ORDERS':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
        </svg>
      );
    case 'MILEAGE':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 1 1 6 0h3a.75.75 0 0 0 .75-.75V15Z" />
          <path d="M8.25 19.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM15.75 6.75a.75.75 0 0 0-.75.75v11.25c0 .087.015.17.042.248a3 3 0 0 1 5.958.464c.853-.175 1.522-.935 1.464-1.883a.75.75 0 0 0-1.002-.69c-1.147.35-2.008-1.544-1.25-2.673a.75.75 0 0 0-.853-1.127c-1.096.357-1.92-1.493-1.137-2.428a.75.75 0 0 0-.7-1.229c-1.103.392-1.802-1.63-1.05-2.52a.75.75 0 0 0-.72-1.161Z" />
        </svg>
      );
    case 'ARCHIVE':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
          <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087ZM12 10.5a.75.75 0 0 1 .75.75v4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72v-4.94a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
        </svg>
      );
    case 'ANALYTICS':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z" clipRule="evenodd" />
        </svg>
      );
    case 'USERS':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
        </svg>
      );
    case 'NOTIFICATIONS':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
        </svg>
      );
    default: // DASHBOARD
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H8.625c-1.035 0-1.875-.84-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
        </svg>
      );
  }
}

const PAGE_TILE_COLORS: Record<PageKey, { light: string; dark: string; icon: string }> = {
  DASHBOARD:            { light: 'border-brand-100 hover:border-brand-300',   dark: 'border-surface-700 hover:border-brand-700',    icon: 'text-brand-600'   },
  WORK_ORDERS:          { light: 'border-blue-100 hover:border-blue-300',     dark: 'border-surface-700 hover:border-blue-700',     icon: 'text-blue-600'    },
  URGENT_WORK_ORDERS:   { light: 'border-red-100 hover:border-red-300',       dark: 'border-surface-700 hover:border-red-700',      icon: 'text-red-600'     },
  MILEAGE:              { light: 'border-green-100 hover:border-green-300',   dark: 'border-surface-700 hover:border-green-700',    icon: 'text-green-600'   },
  ARCHIVE:              { light: 'border-amber-100 hover:border-amber-300',   dark: 'border-surface-700 hover:border-amber-700',    icon: 'text-amber-600'   },
  ANALYTICS:            { light: 'border-purple-100 hover:border-purple-300', dark: 'border-surface-700 hover:border-purple-700',   icon: 'text-purple-600'  },
  USERS:                { light: 'border-teal-100 hover:border-teal-300',     dark: 'border-surface-700 hover:border-teal-700',     icon: 'text-teal-600'    },
  NOTIFICATIONS:        { light: 'border-indigo-100 hover:border-indigo-300', dark: 'border-surface-700 hover:border-indigo-700',   icon: 'text-indigo-600'  },
};

const TechDashboard: React.FC = () => {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const ctx = React.useContext(NotificationsContext) as NotificationsContextType;
  const reminders = ctx.notifications.filter(n => n.source === 'REMINDER');
  const unreadCount = ctx.notifications.filter((n) => !n.read).length + ctx.broadcastNotifications.filter((n) => !n.read).length;
  const isDark = colorScheme === 'dark';
  const { canAccess } = usePageAccess();
  const { role } = useAuth();

  // Pages to show as navigation tiles (all accessible except DASHBOARD itself)
  const ALL_NAV_PAGES: PageKey[] = ['WORK_ORDERS', 'URGENT_WORK_ORDERS', 'MILEAGE', 'NOTIFICATIONS', 'ARCHIVE', 'ANALYTICS', 'USERS'];
  const accessiblePages = ALL_NAV_PAGES.filter(p => canAccess(p));

  function getPageLabel(pageKey: PageKey): string {
    const map: Record<PageKey, string> = {
      DASHBOARD:          t.pageAccessDashboard,
      WORK_ORDERS:        t.pageAccessWorkOrders,
      URGENT_WORK_ORDERS: t.pageAccessUrgentWorkOrders,
      MILEAGE:            t.pageAccessMileage,
      ARCHIVE:            t.pageAccessArchive,
      ANALYTICS:          t.pageAccessAnalytics,
      USERS:              t.pageAccessUsers,
      NOTIFICATIONS:      t.pageAccessNotifications,
    };
    return map[pageKey] ?? pageKey;
  }

  function getPageDesc(pageKey: PageKey): string {
    const map: Record<PageKey, string> = {
      DASHBOARD:          t.pageExplanationDashboard,
      WORK_ORDERS:        t.pageExplanationWorkOrders,
      URGENT_WORK_ORDERS: t.pageExplanationUrgentWorkOrders,
      MILEAGE:            t.pageExplanationMileage,
      ARCHIVE:            t.pageExplanationArchive,
      ANALYTICS:          t.pageExplanationAnalytics,
      USERS:              t.pageExplanationUsers,
      NOTIFICATIONS:      t.pageExplanationNotifications,
    };
    return map[pageKey] ?? '';
  }

  return (
    <div className="min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Welcome banner */}
        <section className={`rounded-2xl border p-6 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <p className={`${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
            {t.techDashboardWelcome}
          </p>
        </section>

        {/* Stats bar */}
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
            <div className="text-3xl font-bold text-teal-500 mb-1">{accessiblePages.length}</div>
            <div className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.dashboardYourPages}</div>
          </div>
        </section>

        {/* Dynamic page access tiles */}
        <section className={`p-6 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-card'}`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-surface-100' : 'text-surface-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3V6ZM3 15.75a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2.25Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-2.25Z" clipRule="evenodd" />
            </svg>
            {t.dashboardYourPages}
          </h3>

          {accessiblePages.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.dashboardNoPages}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {accessiblePages.map((pageKey) => {
                const colors = PAGE_TILE_COLORS[pageKey];
                const path = getRolePagePath(role, pageKey);
                return (
                  <Link
                    key={pageKey}
                    to={path}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                      isDark
                        ? `bg-surface-800 ${colors.dark} text-surface-100`
                        : `bg-surface-50 ${colors.light} text-surface-900`
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
                      <PageTileIcon pageKey={pageKey} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold text-sm ${isDark ? 'text-surface-100' : 'text-surface-800'}`}>
                        {getPageLabel(pageKey)}
                      </div>
                      <div className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                        {getPageDesc(pageKey)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Reminders section */}
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
