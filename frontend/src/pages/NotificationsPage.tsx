import React from 'react';
import PageHeader from '../components/PageHeader';
import { NotificationsContext, NotificationType, NotificationsContextType } from '../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { RiFilter3Line, RiCheckDoubleLine, RiNotification4Line, RiCheckLine, RiDeleteBinLine, RiArrowRightLine, RiToolsLine, RiAlarmWarningLine, RiCarLine, RiBroadcastLine, RiInformationLine, RiTimeLine } from 'react-icons/ri';
import { useLang } from '../context/LangContext';

const getNotificationIcon = (source?: string) => {
  if (!source) return RiInformationLine;
  if (source.includes('workorder')) return RiToolsLine;
  if (source.includes('urgent')) return RiAlarmWarningLine;
  if (source.includes('mileage')) return RiCarLine;
  if (source.includes('broadcast')) return RiBroadcastLine;
  if (source.includes('REMINDER')) return RiTimeLine;
  return RiInformationLine;
};

const getTranslatedNotification = (n: NotificationType, t: any) => {
  let title = n.title;
  let message = n.message;
  let match;
  
  if (n.source === 'workorder-create') {
    title = t.notifTitleWoCreate || title;
    match = n.message.match(/["']([^"']+)["']/);
    if (match) {
      if (t.notifMsgWoCreate) message = t.notifMsgWoCreate.replace('{name}', match[1]);
    }
  } else if (n.source === 'urgent-create') {
    title = t.notifTitleUrgentCreate || title;
    match = n.message.match(/["']([^"']+)["']/);
    if (match) {
      if (t.notifMsgUrgentCreate) message = t.notifMsgUrgentCreate.replace('{name}', match[1]);
    }
  } else if (n.source === 'mileage-create') {
    title = t.notifTitleMileageCreate || title;
    match = n.message.match(/["']([^"']+)["']/);
    if (match) {
      if (t.notifMsgMileageCreate) message = t.notifMsgMileageCreate.replace('{name}', match[1]);
    }
  } else if (n.source === 'REMINDER') {
    title = t.notifTitleReminder;
    message = t.notifMsgReminder;
    // Try to extract work order name from message if possible
    const nameMatch = n.message.match(/work order '([^']+)'/i);
    if (nameMatch && nameMatch[1]) {
      message = message.replace('{name}', nameMatch[1]);
    } else {
      message = message.replace('{name}', '');
    }
  } else if (n.source === 'user-invite') {
    title = t.notifTitleUserInvite || title;
    const invitedMatch = n.message.match(/User\s+["']([^"']+)["']/i);
    if (t.notifMsgUserInvite) {
      message = t.notifMsgUserInvite.replace('{name}', invitedMatch?.[1] || '');
    }
  } else if (n.source === 'user-welcome') {
    title = t.notifTitleUserWelcome || title;
    if (t.notifMsgUserWelcome) {
      message = t.notifMsgUserWelcome;
    }
  } else if (n.source === 'user-reset-password') {
    title = t.notifTitleUserResetPassword || title;
  } else if (n.source === 'user-email-change') {
    title = t.notifTitleUserEmailChange || title;
  } else if (n.source === 'user-delete') {
    title = t.notifTitleUserDelete || title;
  } else if (n.source === 'user-activate') {
    title = t.notifTitleUserActivate || title;
  } else if (n.source === 'user-deactivate') {
    title = t.notifTitleUserDeactivate || title;
  } else if (n.source === 'admin-settings-update') {
    const actorMatch = n.message.match(/saved by\s+["']([^"']+)["']/i);
    const actor = actorMatch?.[1] || 'admin';

    if (/user access overrides updated/i.test(n.title)) {
      title = t.notifTitleUserAccessOverridesUpdated || title;
      const userIdMatch = n.message.match(/user\s+id\s+(\d+)/i);
      if (t.notifMsgUserAccessOverridesUpdated) {
        message = t.notifMsgUserAccessOverridesUpdated
          .replace('{actor}', actor)
          .replace('{userId}', userIdMatch?.[1] || '');
      }
    } else if (/page access roles updated/i.test(n.title)) {
      title = t.notifTitlePageAccessRolesUpdated || title;
      if (t.notifMsgPageAccessRolesUpdated) {
        message = t.notifMsgPageAccessRolesUpdated.replace('{actor}', actor);
      }
    } else if (/notification rules updated/i.test(n.title)) {
      title = t.notifTitleNotificationRulesUpdated || title;
      if (t.notifMsgNotificationRulesUpdated) {
        message = t.notifMsgNotificationRulesUpdated.replace('{actor}', actor);
      }
    }
  }

  return { title, message };
};

const NotificationsPage: React.FC = () => {
  const { t, lang } = useLang();
  
  const filterGroups = {
    [t.filterWorkOrders]: [
      { key: 'workorder-create', label: t.filterWorkOrderCreated },
      { key: 'workorder-delete', label: t.filterWorkOrderDeleted },
    ],
    [t.filterUrgentWorkOrders]: [
      { key: 'urgent-create', label: t.filterUrgentCreated },
      { key: 'urgent-delete', label: t.filterUrgentDeleted },
    ],
    [t.filterVehiclesMileage]: [
      { key: 'mileage-create', label: t.filterMileageCreated },
      { key: 'mileage-delete', label: t.filterMileageDeleted },
    ],
    [t.filterSystemOther]: [
      { key: 'broadcast', label: t.filterBroadcast },
      { key: 'REMINDER', label: t.filterReminders || 'Reminders' },
      { key: 'other', label: t.filterOther },
    ],
    [t.filterUsersAdmin || 'Users & Admin']: [
      { key: 'user-invite', label: t.filterUserInvite || 'User Invited' },
      { key: 'user-welcome', label: t.filterUserWelcome || 'User Welcome' },
      { key: 'user-reset-password', label: t.filterUserResetPassword || 'User Password Reset' },
      { key: 'user-email-change', label: t.filterUserEmailChange || 'User Email Changed' },
      { key: 'user-delete', label: t.filterUserDelete || 'User Deleted' },
      { key: 'user-activate', label: t.filterUserActivate || 'User Activated' },
      { key: 'user-deactivate', label: t.filterUserDeactivate || 'User Deactivated' },
    ]
  };

  const ctx = React.useContext(NotificationsContext) as NotificationsContextType;
  const { count, notifications, markAllRead, removeNotification, markRead, removeBroadcastNotification, filters, toggleFilter, resetFilters } = ctx;
  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const filteredNotifications = notifications.filter((n: NotificationType) => {
    const src = n.source || 'other';
    const key = Object.prototype.hasOwnProperty.call(filters, src) ? src : 'other';
    return !!filters[key];
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t.notificationsHeader}</h1>
          <p className="text-surface-500 text-sm mt-1">{t.notificationsDesc.replace('{count}', count.toString())}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="md:hidden px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <RiFilter3Line className="w-4 h-4" />
            <span>{t.filters} ({activeFiltersCount})</span>
          </button>
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 text-sm font-medium rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <RiCheckDoubleLine className="w-4 h-4" />
              <span>{t.markAllRead}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar - Filters */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm sticky top-24 overflow-hidden">
            <div className="p-4 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex justify-between items-center">
              <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <RiFilter3Line className="w-4 h-4 text-surface-500" />
                {t.notificationTypes}
              </h3>
              <button onClick={resetFilters} className="text-xs text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400">
                {t.reset}
              </button>
            </div>
            <div className="p-4 space-y-6">
              {Object.entries(filterGroups).map(([groupName, options]) => (
                <div key={groupName}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">{groupName}</h4>
                  <div className="space-y-2.5">
                    {options.map(opt => (
                      <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={!!filters[opt.key]}
                            onChange={() => toggleFilter(opt.key)}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-surface-300 bg-white transition-all checked:border-brand-600 checked:bg-brand-600 hover:border-brand-500 dark:border-surface-600 dark:bg-surface-700 dark:checked:border-brand-500 dark:checked:bg-brand-500"
                          />
                          <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <RiCheckLine className="w-3 h-3" />
                          </span>
                        </div>
                        <span className="text-sm text-surface-700 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center - Main Notifications List */}
        <main className="flex-1 min-w-0">
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 bg-surface-50 dark:bg-surface-700 rounded-full flex items-center justify-center mb-4">
                  <RiNotification4Line className="w-8 h-8 text-surface-400 dark:text-surface-500" />
                </div>
                <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-1">{t.allCaughtUp}</h3>
                <p className="text-surface-500 dark:text-surface-400 max-w-sm">{t.noNewNotifications}</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                {filteredNotifications.map((n: NotificationType) => {
                  const Icon = getNotificationIcon(n.source);
                  const { title, message } = getTranslatedNotification(n, t);
                  const showFullMessage = n.source === 'user-welcome';
                  return (
                    <li
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        if (n.href) navigate(n.href);
                      }}
                      role={n.href ? 'button' : 'listitem'}
                      tabIndex={n.href ? 0 : undefined}
                      className={`group p-4 sm:p-5 transition-all duration-200 ${
                        n.href ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50' : ''
                      } ${!n.read ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          !n.read
                            ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400'
                            : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 animate-pulse" />
                                )}
                                <h4 className={`text-base font-semibold truncate ${
                                  !n.read ? 'text-surface-900 dark:text-white' : 'text-surface-700 dark:text-surface-300'
                                }`}>
                                  {title}
                                </h4>
                              </div>
                              <p className={`text-sm mt-1 ${showFullMessage ? 'whitespace-pre-wrap' : 'line-clamp-2'} ${
                                !n.read ? 'text-surface-700 dark:text-surface-300' : 'text-surface-500 dark:text-surface-400'
                              }`}>
                                {message}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className="text-xs font-medium text-surface-500 dark:text-surface-400 whitespace-nowrap bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-md">
                                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(n.date))}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                    className="p-1.5 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30 rounded-md transition-colors"
                                    title={t.markAsRead}
                                  >
                                    <RiCheckLine className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                                  className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                  title={t.deleteNotification}
                                >
                                  <RiDeleteBinLine className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {n.href && (
                            <div className="mt-3 flex items-center text-sm font-medium text-brand-600 dark:text-brand-400">
                              <span>{t.viewDetails}</span>
                              <RiArrowRightLine className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>

        {/* Right Sidebar - Broadcasts */}
        <aside className="w-full xl:w-96 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white dark:bg-surface-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/50 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
              <div className="p-4 border-b border-surface-100 dark:border-surface-700 bg-indigo-50/50 dark:bg-indigo-900/10">
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <RiBroadcastLine className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {t.liveBroadcasts}
                </h3>
              </div>
              <div className="p-4">
                <BroadcastBox />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

function BroadcastBox() {
  const { broadcastNotifications, markBroadcastRead, removeBroadcastNotification } = React.useContext(NotificationsContext) as NotificationsContextType;
  const { t } = useLang();

  if (!broadcastNotifications || broadcastNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-white/50 dark:bg-surface-900/20 rounded-lg border border-dashed border-surface-200 dark:border-surface-700">
        <RiBroadcastLine className="w-8 h-8 text-surface-300 dark:text-surface-600 mb-2" />
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{t.noActiveBroadcasts}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {broadcastNotifications.map((b: NotificationType) => (
        <div key={b.id} className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
          b.read 
            ? 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 opacity-75' 
            : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
        }`}>
          {!b.read && (
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          )}
          <div className="flex justify-between items-start mb-2">
            <h4 className={`text-sm font-bold pr-6 ${
              b.read ? 'text-surface-700 dark:text-surface-300' : 'text-indigo-900 dark:text-indigo-100'
            }`}>{b.title}</h4>
            <div className="flex items-center gap-1 absolute top-3 right-3">
              <button 
                onClick={() => removeBroadcastNotification(b.id)} 
                aria-label={t.deleteBroadcast}
                title={t.deleteBroadcast}
                className="text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-md transition-colors"
              >
                <RiDeleteBinLine className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className={`text-sm mb-3 ${
            b.read ? 'text-surface-600 dark:text-surface-400' : 'text-indigo-800 dark:text-indigo-200'
          }`}>{b.message}</div>
          
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-100 dark:border-surface-700/50">
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
              {new Date(b.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {!b.read && (
              <button 
                onClick={() => markBroadcastRead(b.id)} 
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
              >
                <RiCheckLine className="w-3.5 h-3.5" />
                {t.markRead}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationsPage;
