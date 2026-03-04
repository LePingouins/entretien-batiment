import React, { useEffect, useState, useContext } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../components/AdminLayout';
import { getAnalyticsStats } from '../lib/api';
import type { AnalyticsStatsResponse } from '../types/api';
import PageHeader from '../components/PageHeader';
import { FaPrint } from 'react-icons/fa';
import './printable.css';

export default function AnalyticsPage() {
  const { t } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const [stats, setStats] = useState<AnalyticsStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const isDark = colorScheme === 'dark';
  const textMuted = isDark ? 'text-surface-400' : 'text-slate-500';
  const textMain = isDark ? 'text-surface-100' : 'text-slate-900';
  const cardBase = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200 shadow-sm';
  const cardHeader = isDark ? 'border-surface-700 bg-surface-900/50' : 'border-slate-100 bg-slate-50/50';

  if (loading) return (
      <div className={`p-8 min-h-screen flex items-center justify-center ${isDark ? 'bg-surface-950 text-surface-400' : 'bg-slate-50 text-slate-500'}`}>
          <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium tracking-wide uppercase">{t.loading}</span>
          </div>
      </div>
  );

  if (!stats) return <div className="p-8 text-center text-red-500">Error loading analytics.</div>;

  return (
    <div className={`p-6 min-h-screen printable-content ${isDark ? 'bg-surface-950' : 'bg-slate-50'}`}>
        {/* Print Header */}
        <div className="print-only-header">
            <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="Horizon Nature" className="h-12 w-auto" />
                <h1 className="text-2xl font-bold">Horizon Nature</h1>
            </div>
            <div className="text-sm text-gray-500">Analytics Report - {new Date().toLocaleDateString()}</div>
        </div>

        <PageHeader 
            title={t.analyticsTitle}
            subtitle={t.analyticsSubtitle}
            actions={
                <button 
                    onClick={handlePrint}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
                >
                    <FaPrint className="w-4 h-4" />
                    <span>{t.print}</span>
                </button>
            }
        />
        
        <div className="max-w-7xl mx-auto space-y-8 mt-8">
            
            {/* 1. Hero Metrics - High Level Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tasks Completed (Week) */}
                <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                    <div className="absolute -top-8 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="#4ade80"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className={`text-sm font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t.tasksCompletedThisWeek}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-green-500">{stats.tasksCompletedThisWeek}</span>
                        <span className={`text-sm ${textMuted}`}>tasks</span>
                    </div>
                    <div className="mt-2 text-xs text-green-500 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        ~{stats.averageTasksPerDay?.toFixed(1)} per day
                    </div>
                </div>

                {/* Completion Rate */}
                <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                    <div className="absolute -top-5 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="#facc15"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className={`text-sm font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t.completionRate}</h3>
                    <div className="flex items-baseline gap-2">
                         <span className={`text-4xl font-bold ${stats.completionRate >= 80 ? 'text-green-500' : stats.completionRate >= 50 ? 'text-blue-500' : 'text-amber-500'}`}>{stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 mt-4 ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}>
                        <div className={`h-1.5 rounded-full transition-all duration-1000 ${stats.completionRate >= 80 ? 'bg-green-500' : stats.completionRate >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(stats.completionRate, 100)}%` }}></div>
                    </div>
                </div>

                {/* Urgent Tasks (Week) */}
                <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                    <div className="absolute -top-8 right-0 p-4 opacity-10 text-red-500">
                         <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className={`text-sm font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t.urgentTasksCompletedThisWeek}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-red-500">{stats.urgentTasksCompletedThisWeek}</span>
                        <span className={`text-sm ${textMuted}`}>completed</span>
                    </div>
                     <div className="mt-2 text-xs text-red-500 font-medium">
                        {stats.urgentCount} {t.totalPendingUrgent}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content Column (Left - 2cols) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Time Efficiency Section */}
                    <section>
                        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textMain}`}>
                            <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t.timeEfficiency}
                        </h2>
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border p-4 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-slate-200'}`}>
                             <div className="p-4 text-center">
                                <div className={`text-2xl font-bold ${textMain}`}>{stats.averageCompletionTimeHours.toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-1">h</span></div>
                                <div className={`text-xs uppercase tracking-wider mt-1 ${textMuted}`}>Global Avg</div>
                             </div>
                             <div className={`p-4 text-center border-l border-r ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
                                <div className="text-2xl font-bold text-red-500">{stats.averageCompletionTimeUrgent?.toFixed(1)}<span className="text-sm font-normal text-red-300 ml-1">h</span></div>
                                <div className={`text-xs uppercase tracking-wider mt-1 ${textMuted}`}>Urgent Avg</div>
                             </div>
                             <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-500">{stats.averageCompletionTimeNormal?.toFixed(1)}<span className="text-sm font-normal text-blue-300 ml-1">h</span></div>
                                <div className={`text-xs uppercase tracking-wider mt-1 ${textMuted}`}>Normal Avg</div>
                             </div>
                        </div>
                    </section>

                    {/* Task Flow Section */}
                    <section>
                        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textMain}`}>
                            <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            {t.trainingVolume}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`rounded-xl border p-5 ${cardBase}`}>
                                <h3 className={`text-xs font-semibold uppercase mb-4 ${textMuted}`}>{(t as any).thisWeek}</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={`text-2xl font-bold ${textMain}`}>{stats.tasksCreatedThisWeek}</div>
                                        <div className="text-xs text-green-500 font-medium">{t.created}</div>
                                    </div>
                                    <div className={`h-8 w-px ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}></div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${textMain}`}>{stats.tasksCancelledThisWeek}</div>
                                        <div className="text-xs text-red-400 font-medium">{t.cancelled}</div>
                                    </div>
                                </div>
                            </div>
                            <div className={`rounded-xl border p-5 ${cardBase}`}>
                                <h3 className={`text-xs font-semibold uppercase mb-4 ${textMuted}`}>{(t as any).thisMonth}</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={`text-2xl font-bold ${textMain}`}>{stats.tasksCreatedThisMonth}</div>
                                        <div className="text-xs text-green-500 font-medium">{t.created}</div>
                                    </div>
                                    <div className={`h-8 w-px ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}></div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${textMain}`}>{stats.tasksCancelledThisMonth}</div>
                                        <div className="text-xs text-red-400 font-medium">{t.cancelled}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                     {/* Status Distribution */}
                     <section>
                        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textMain}`}>
                            <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            {t.activeTasksStatus}
                        </h2>
                        <div className={`rounded-xl border p-6 ${cardBase}`}>
                             <div className="flex flex-wrap gap-4 justify-around">
                                {stats.activeTasksByStatus && Object.keys(stats.activeTasksByStatus).length > 0 ? (
                                    Object.entries(stats.activeTasksByStatus).map(([status, count]) => (
                                        <div key={status} className="flex flex-col items-center min-w-[80px]">
                                            <div className={`h-24 w-4 rounded-full bg-slate-100 dark:bg-surface-700 relative overflow-hidden`}>
                                                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-500" style={{ height: `${Math.min((count / (Math.max(...Object.values(stats.activeTasksByStatus)) || 1)) * 100, 100)}%` }}></div>
                                            </div>
                                            <span className={`text-xl font-bold mt-2 ${textMain}`}>{count}</span>
                                            <span className={`text-[10px] uppercase font-semibold text-center mt-1 ${textMuted}`}>{status.replace('_', ' ')}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className={`text-sm italic ${textMuted}`}>{t.noActiveTasks}</div>
                                )}
                             </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Column (Right - 1col) */}
                <div className="space-y-6">

                    {/* Attention Needed Card */}
                    <div className={`rounded-xl border p-5 ${isDark ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                        <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             {t.attentionNeeded}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className={`text-sm ${isDark ? 'text-red-200' : 'text-slate-700'}`}>{t.overdueActive}</span>
                                <span className="font-bold text-red-600 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded text-sm">{stats.overdueActiveTasks}</span>
                            </div>
                            <div className="h-px bg-red-200 dark:bg-red-900/30"></div>
                            <div className="flex justify-between items-center">
                                <span className={`text-sm ${isDark ? 'text-red-200' : 'text-slate-700'}`}>{t.overdueCompleted}</span>
                                <span className="font-bold text-slate-500 text-sm">{stats.overdueCompletedTasks}</span>
                            </div>
                        </div>
                    </div>

                    {/* Urgent Ratio Card */}
                    <div className={`rounded-xl border p-5 ${cardBase}`}>
                        <h3 className={`text-xs font-semibold uppercase mb-4 ${textMuted}`}>{t.urgentVsNormalRatio}</h3>
                        <div className="flex justify-between text-xs mb-2">
                             <span className="text-red-500 font-bold">{stats.urgentRatio > 0 ? (stats.urgentRatio * 100).toFixed(0) : 0}% Urgent</span>
                             <span className="text-blue-500 font-bold">{stats.urgentRatio > 0 ? ((1 - stats.urgentRatio) * 100).toFixed(0) : 100}% Normal</span>
                        </div>
                        <div className="w-full flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-surface-700 mb-4">
                            <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${stats.urgentRatio * 100}%` }}></div>
                            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(1 - stats.urgentRatio) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-center">
                            <div>
                                <div className="text-lg font-bold text-red-500">{stats.urgentCount}</div>
                                <div className={`text-[10px] uppercase ${textMuted}`}>Urgent</div>
                            </div>
                             <div>
                                <div className="text-lg font-bold text-blue-500">{stats.normalCount}</div>
                                <div className={`text-[10px] uppercase ${textMuted}`}>Normal</div>
                            </div>
                        </div>
                    </div>

                     {/* Top Technicians List */}
                     <div className={`rounded-xl border overflow-hidden ${cardBase}`}>
                        <div className={`p-4 border-b ${cardHeader}`}>
                             <h3 className={`text-sm font-bold ${textMain}`}>{t.topTechnicians}</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-surface-700">
                             {stats.topTechnicians && stats.topTechnicians.length > 0 ? (
                                stats.topTechnicians.map((tech, index) => (
                                    <div key={tech.userId} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'}`}>
                                                {index + 1}
                                            </div>
                                            <div className={`text-sm font-medium ${textMain}`}>{tech.name}</div>
                                        </div>
                                        <div className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">
                                            {tech.completedTasks} tasks
                                        </div>
                                    </div>
                                ))
                             ) : (
                                 <div className={`p-4 text-sm text-center italic ${textMuted}`}>{t.noDataAvailable}</div>
                             )}
                        </div>
                     </div>

                     {/* Mileage Stats */}
                     <div className={`rounded-xl border p-5 ${cardBase}`}>
                        <h3 className={`text-xs font-semibold uppercase mb-4 ${textMuted}`}>{t.mileageOverview}</h3>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className={`text-2xl font-bold ${textMain}`}>{stats.totalMileageThisMonth}</div>
                                <div className={`text-xs ${textMuted}`}>{t.totalKmMonth}</div>
                            </div>
                            <div className="text-right">
                                 <div className={`text-xl font-bold ${textMain}`}>{stats.averageMileagePerTask?.toFixed(1)}</div>
                                 <div className={`text-xs ${textMuted}`}>{t.avgKmPerTask}</div>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
                             <div className="bg-purple-500 h-full w-2/3 opacity-50"></div>
                        </div>
                     </div>

                </div>
            </div>

            {/* Task Frequency Report */}
            <div className={`break-inside-avoid rounded-2xl p-6 border ${cardBase}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-lg font-bold ${textMain}`}>{t.taskFrequencyTitle}</h2>
                        <p className={`text-sm ${textMuted}`}>{t.taskFrequencyDesc}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.taskFrequencies && stats.taskFrequencies.length > 0 ? (
                        stats.taskFrequencies.map((task, index) => (
                            <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index < 3 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : isDark ? 'bg-surface-800 text-surface-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                        {index + 1}
                                    </div>
                                    <span className={`font-medium truncate ${textMain}`} title={task.taskName}>
                                        {task.taskName.charAt(0).toUpperCase() + task.taskName.slice(1)}
                                    </span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-surface-800 text-surface-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                    {task.count}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={`col-span-full text-center py-8 italic ${textMuted}`}>
                            {t.noRepeatedTasks}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
