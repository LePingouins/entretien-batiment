import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDashboardStats } from '../lib/api';
import { DashboardStats } from '../types/api';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useBroadcast } from '../context/BroadcastContext';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add translation hook
  const { t } = useLang();

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-4 text-lg text-slate-600">{t.dashboardLoading}</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block">
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
          {t.dashboardTitle}
        </h1>
        <p className="mt-2 text-lg text-slate-600">
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
        />

        {/* Mileage Card */}
        <SimpleStatCard 
          title={t.dashboardMileageEntries}
          value={stats.mileageEntries}
          icon={<TruckIcon className="h-8 w-8 text-green-600" />}
          accentColor="text-green-600"
          link="/admin/mileage"
        />
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Quick Actions Panel */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <QuickActionIcon className="h-5 w-5 text-yellow-500" />
              {t.dashboardQuickActions}
            </h2>
            {/* Admin-only broadcast creation */}
            <AdminBroadcastControls />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <Link to="/admin/work-orders?action=create" className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group border border-slate-100">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors mb-2">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className="font-medium text-slate-700 text-sm text-center">{t.dashboardNewWorkOrder}</span>
             </Link>
             <Link to="/admin/urgent-work-orders?action=create" className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 hover:bg-red-50 transition-colors group border border-slate-100">
                <div className="p-3 rounded-full bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors mb-2">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className="font-medium text-slate-700 text-sm text-center">{t.dashboardNewUrgentOrder}</span>
             </Link>
             <Link to="/admin/mileage?action=create" className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 hover:bg-green-50 transition-colors group border border-slate-100">
                <div className="p-3 rounded-full bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors mb-2">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className="font-medium text-slate-700 text-sm text-center">{t.dashboardNewMileageEntry}</span>
             </Link>
          </div>
        </div>

        {/* System Status / Info Panel */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 relative overflow-hidden">
          
          <h2 className="text-xl font-bold mb-2 relative z-10 text-slate-800">{t.dashboardSystemStatus}</h2>
          <p className="text-slate-500 mb-6 relative z-10">{t.dashboardSystemStatusDesc}</p>
          
          <div className="flex items-center justify-between relative z-10 bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.dashboardCurrentDate}</p>
              <p className="text-lg font-mono font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
               <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.dashboardActiveUsers}</p>
               <p className="text-lg font-mono font-bold text-slate-700">--</p>
            </div>
          </div>
        </div>
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
          <button onClick={() => clearBroadcast()} className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded">{t.clearBroadcast}</button>
          <button onClick={() => setOpen(true)} className="px-3 py-1 text-sm bg-amber-50 text-amber-800 rounded">{t.edit}</button>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className="px-3 py-1 text-sm bg-amber-50 text-amber-800 rounded">{t.createBroadcastBtn}</button>
      )}

      {open && createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} style={{ zIndex: 99990 }} />
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg" style={{ zIndex: 99999 }}>
            <h3 className="text-lg font-bold mb-2">{t.createBroadcastTitle}</h3>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full min-h-[120px] p-2 border rounded mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded bg-slate-100">{t.cancel}</button>
              <button onClick={() => { createBroadcast(msg || ''); setMsg(''); setOpen(false); }} className="px-4 py-2 rounded bg-amber-500 text-white">{t.save}</button>
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
  link 
}: any) {
  const { t } = useLang();
  return (
    <Link to={link || '#'} className="relative overflow-hidden rounded-2xl shadow-md border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{active}</span>
              <span className="text-sm text-slate-500 font-medium">{t.dashboardActive}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm text-slate-700 font-medium">{active} / {total} {t.dashboardTotal}</span>
            </div>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>{activeLabel}</span>
          <span>{percent}%</span>
        </div>
        <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${accentColor}`} 
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function SimpleStatCard({ title, value, icon, gradient, accentColor, link }: any) {
  const { t } = useLang();
  return (
    <Link to={link || '#'} className="relative overflow-hidden rounded-2xl shadow-md border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
          <p className={`mt-2 text-4xl font-extrabold ${accentColor}`}>{value}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
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
