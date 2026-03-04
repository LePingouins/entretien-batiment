import { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDashboardStats } from '../lib/api';
import { DashboardStats } from '../types/api';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useBroadcast } from '../context/BroadcastContext';
import { NotificationsContext, NotificationsContextType } from '../context/NotificationsContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add translation hook
  const { t } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';
  
  const ctx = useContext(NotificationsContext) as NotificationsContextType;
  const reminders = ctx.notifications.filter(n => n.source === 'REMINDER');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => {
        console.error(err);
        setError('Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[50vh] ${isDark ? 'text-surface-300' : ''}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className={`ml-4 text-lg ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.dashboardLoading}</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <div className={`p-4 rounded-lg inline-block ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
          {error || t.dashboardNoData}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {t.dashboardRetry}
        </button>
      </div>
    );
  }

  // Calculate percentages for progress bars
  const woPercent = stats.totalWorkOrders > 0 
    ? Math.round((stats.activeWorkOrders / stats.totalWorkOrders) * 100) 
    : 0;
    
  const uwoPercent = stats.urgentWorkOrders > 0 
    ? Math.round((stats.activeUrgentWorkOrders / stats.urgentWorkOrders) * 100) 
    : 0;

  return (
    <div className={`p-6 md:p-8 space-y-8 max-w-7xl mx-auto ${isDark ? 'text-surface-100' : ''}`}>
      <header className="mb-8">
        <h1 className={`text-3xl font-extrabold sm:text-4xl tracking-tight ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>
          {t.dashboardTitle}
        </h1>
        <p className={`mt-2 text-lg ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
          {t.dashboardDescription}
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Work Orders Card */}
        <DashboardCard 
          title={t.dashboardRegularWorkOrders}
          total={stats.totalWorkOrders}
          active={stats.activeWorkOrders}
          activeLabel={t.dashboardActive}
          icon={<ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />}
          accentColor="bg-blue-600"
          percent={woPercent}
          link="/admin/work-orders"
          isDark={isDark}
        />

        {/* Urgent Work Orders Card */}
        <DashboardCard 
          title={t.dashboardUrgentWorkOrders}
          total={stats.urgentWorkOrders}
          active={stats.activeUrgentWorkOrders}
          activeLabel={t.dashboardInProgress}
          icon={<FireIcon className="h-8 w-8 text-red-600" />}
          accentColor="bg-red-600"
          percent={uwoPercent}
          link="/admin/urgent-work-orders"
          isDark={isDark}
        />

        {/* Mileage Card */}
        <SimpleStatCard 
          title={t.dashboardMileageEntries}
          value={stats.mileageEntries}
          icon={<TruckIcon className="h-8 w-8 text-green-600" />}
          accentColor="text-green-600"
          link="/admin/mileage"
          isDark={isDark}
        />
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Quick Actions Panel */}
        <div className={`rounded-xl shadow-md border p-6 ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>
              <QuickActionIcon className="h-5 w-5 text-yellow-500" />
              {t.dashboardQuickActions}
            </h2>
            {/* Admin-only broadcast creation */}
            <AdminBroadcastControls />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <Link to="/admin/work-orders?action=create" className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors group border ${isDark ? 'bg-surface-900 border-surface-700 hover:bg-surface-700' : 'bg-slate-50 border-slate-100 hover:bg-blue-50'}`}>
                <div className={`p-3 rounded-full text-blue-600 transition-colors mb-2 ${isDark ? 'bg-blue-900/30 group-hover:bg-blue-900/50' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className={`font-medium text-sm text-center ${isDark ? 'text-surface-200' : 'text-slate-700'}`}>{t.dashboardNewWorkOrder}</span>
             </Link>
             <Link to="/admin/urgent-work-orders?action=create" className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors group border ${isDark ? 'bg-surface-900 border-surface-700 hover:bg-surface-700' : 'bg-slate-50 border-slate-100 hover:bg-red-50'}`}>
                <div className={`p-3 rounded-full text-red-600 transition-colors mb-2 ${isDark ? 'bg-red-900/30 group-hover:bg-red-900/50' : 'bg-red-100 group-hover:bg-red-200'}`}>
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className={`font-medium text-sm text-center ${isDark ? 'text-surface-200' : 'text-slate-700'}`}>{t.dashboardNewUrgentOrder}</span>
             </Link>
             <Link to="/admin/mileage?action=create" className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors group border ${isDark ? 'bg-surface-900 border-surface-700 hover:bg-surface-700' : 'bg-slate-50 border-slate-100 hover:bg-green-50'}`}>
                <div className={`p-3 rounded-full text-green-600 transition-colors mb-2 ${isDark ? 'bg-green-900/30 group-hover:bg-green-900/50' : 'bg-green-100 group-hover:bg-green-200'}`}>
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className={`font-medium text-sm text-center ${isDark ? 'text-surface-200' : 'text-slate-700'}`}>{t.dashboardNewMileageEntry}</span>
             </Link>
          </div>
        </div>

        {/* System Status / Info Panel */}
        <div className={`rounded-xl shadow-md border p-6 relative overflow-hidden ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-100'}`}>
          
          <h2 className={`text-xl font-bold mb-2 relative z-10 ${isDark ? 'text-surface-100' : 'text-slate-800'}`}>{t.dashboardSystemStatus}</h2>
          <p className={`mb-6 relative z-10 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{t.dashboardSystemStatusDesc}</p>
          
          <div className={`flex items-center justify-between relative z-10 rounded-lg p-4 border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-slate-50 border-slate-100'}`}>
            <div>
              <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{t.dashboardCurrentDate}</p>
              <p className={`text-lg font-mono font-bold ${isDark ? 'text-surface-200' : 'text-slate-700'}`}>{new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
               <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{t.dashboardActiveUsers}</p>
               <p className={`text-lg font-mono font-bold ${isDark ? 'text-surface-200' : 'text-slate-700'}`}>--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reminders Panel */}
      <div className={`rounded-xl shadow-md border p-6 mt-8 ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {t.remindersSectionTitle || 'Reminders'}
          </h2>
        </div>
        
        {reminders.length === 0 ? (
          <p className={isDark ? 'text-surface-400' : 'text-slate-500'}>{t.noReminders || 'No active reminders.'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map(r => {
              // Extract work order ID if present to make it clickable or display prettier
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
                <div key={r.id} className={`p-4 rounded-lg border flex flex-col justify-between ${!r.read ? (isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50/50 border-indigo-100') : (isDark ? 'bg-surface-900 border-surface-700' : 'bg-slate-50 border-slate-100')}`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${isDark ? 'text-surface-100' : 'text-slate-800'}`}>{title}</h4>
                      {!r.read && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>}
                    </div>
                    <p className={`text-sm mb-4 ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{msg}</p>
                  </div>
                  <div className="flex justify-end gap-2 mt-auto">
                    <button onClick={() => ctx.removeNotification(r.id)} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">
                      {t.delete || 'Delete'}
                    </button>
                    {!r.read && (
                      <button onClick={() => ctx.markRead(r.id)} className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'text-indigo-300 hover:text-indigo-200 bg-indigo-900/40 hover:bg-indigo-900/60' : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100'}`}>
                        {t.markRead || 'Mark Read'}
                      </button>
                    )}
                    {r.href && (
                      <Link to={r.href} className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'text-surface-200 hover:text-surface-100 bg-surface-700 hover:bg-surface-600' : 'text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'}`}>
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
  );
}

function AdminBroadcastControls() {
  const { role } = useAuth();
  const { broadcast, createBroadcast, clearBroadcast } = useBroadcast();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const { t } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (role !== 'ADMIN') return null;

  return (
    <div className="flex items-center gap-2">
      {broadcast ? (
        <>
          <button onClick={() => clearBroadcast()} className={`px-3 py-1 text-sm rounded ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>{t.clearBroadcast}</button>
          <button onClick={() => setOpen(true)} className={`px-3 py-1 text-sm rounded ${isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>{t.edit}</button>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className={`px-3 py-1 text-sm rounded ${isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>{t.createBroadcastBtn}</button>
      )}

      {open && createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} style={{ zIndex: 99990 }} />
          <div className={`rounded-lg shadow-lg p-6 w-full max-w-lg ${isDark ? 'bg-surface-900 border border-surface-700 text-surface-100' : 'bg-white'} `} style={{ zIndex: 99999 }}>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-surface-100' : ''}`}>{t.createBroadcastTitle}</h3>
            <textarea 
              value={msg} 
              onChange={(e) => setMsg(e.target.value)} 
              className={`w-full min-h-[120px] p-2 border rounded mb-4 ${isDark ? 'bg-surface-800 border-surface-700 text-surface-100 placeholder-surface-400' : ''}`}
              placeholder={t.broadcastPlaceholder || ''}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className={`px-4 py-2 rounded ${isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700' : 'bg-slate-100'}`}>{t.cancel}</button>
              <button onClick={() => { createBroadcast(msg || ''); setMsg(''); setOpen(false); }} className={`px-4 py-2 rounded ${isDark ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-amber-500 text-white'}`}>{t.save}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// --- Components ---

function DashboardCard({ 
  title, 
  total, 
  active, 
  activeLabel, 
  icon, 
  gradient, 
  accentColor, 
  percent,
  link,
  isDark
}: any) {
  const { t } = useLang();
  return (
    <Link to={link || '#'} className={`relative overflow-hidden rounded-2xl shadow-md border p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group ${isDark ? 'border-surface-700 bg-surface-800 hover:border-surface-600' : 'border-slate-100 bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{title}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>{active}</span>
              <span className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{t.dashboardActive}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>{active} / {total} {t.dashboardTotal}</span>
            </div>
        </div>
        <div className={`p-3 rounded-xl shadow-sm border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-slate-50 border-slate-100'}`}>
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className={`flex justify-between text-xs font-bold ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
          <span>{activeLabel}</span>
          <span>{percent}%</span>
        </div>
        <div className={`relative h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}>
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${accentColor}`} 
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function SimpleStatCard({ title, value, icon, gradient, accentColor, link, isDark }: any) {
  const { t } = useLang();
  return (
    <Link to={link || '#'} className={`relative overflow-hidden rounded-2xl shadow-md border p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group flex flex-col justify-between ${isDark ? 'border-surface-700 bg-surface-800 hover:border-surface-600' : 'border-slate-100 bg-white'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{title}</h3>
          <p className={`mt-2 text-4xl font-extrabold ${accentColor}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl shadow-sm border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-slate-50 border-slate-100'}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>
          {t.dashboardViewAll}
        </span>
      </div>
    </Link>
  );
}

// --- Icons (SVG) ---

function ClipboardDocumentListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 7.5 0h.375a1.875 1.875 0 0 1 1.875 1.875v1.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5v-1.5Z" />
      <path fillRule="evenodd" d="M3 5.25a.75.75 0 0 1 .75-.75h.322c.242.61.754 1.114 1.353 1.442.503.275 1.05.42 1.625.421h5.86c.602 0 1.176-.152 1.688-.442.576-.328 1.076-.826 1.303-1.421h.349c.414 0 .75.336.75.75v12.5a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V5.25ZM8 10a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 8 10Zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 8 14Z" clipRule="evenodd" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 1 1 6 0h3a.75.75 0 0 0 .75-.75V15Z" />
      <path d="M8.25 19.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM15.75 6.75a.75.75 0 0 0-.75.75v11.25c0 .087.015.17.042.248a3 3 0 0 1 5.958.464c.853-.175 1.522-.935 1.464-1.883a.75.75 0 0 0-1.002-.69c-1.147.35-2.008-1.544-1.25-2.673a.75.75 0 0 0-.853-1.127c-1.096.357-1.92-1.493-1.137-2.428a.75.75 0 0 0-.7-1.229c-1.103.392-1.802-1.63-1.05-2.52a.75.75 0 0 0-.72-1.161Z" />
    </svg>
  );
}

function QuickActionIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM9.75 7.5a.75.75 0 0 0-1.5 0v2.25H6a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H12a.75.75 0 0 0 0-1.5H9.75V7.5Z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
