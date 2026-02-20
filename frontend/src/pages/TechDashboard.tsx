import * as React from 'react';
import { useLang } from '../context/LangContext';

const TechDashboard: React.FC = () => {
  const { t } = useLang();
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
      </div>
    </div>
  );
};

export default TechDashboard;
