import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionReport,
} from '../lib/api';
import type {
  SubscriptionResponse,
  SubscriptionRequest,
  SubscriptionReportResponse,
  SubscriptionCategory,
  SubscriptionBillingCycle,
} from '../types/api';
import { useConfirm } from '../context/ConfirmContext';
import { FaPrint } from 'react-icons/fa';
import './printable.css';

const CATEGORIES: SubscriptionCategory[] = [
  'ERP','ACCOUNTING','SECURITY','INFRASTRUCTURE','COMMUNICATION',
  'PRODUCTIVITY','DOMAIN','HOSTING','STORAGE','MONITORING','HR','CRM','OTHER',
];

const BILLING_CYCLES: SubscriptionBillingCycle[] = ['MONTHLY','QUARTERLY','SEMI_ANNUAL','YEARLY'];
const STATUSES = ['ACTIVE','TRIAL','CANCELLED','EXPIRED','PAUSED'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  ERP: '#6366f1', ACCOUNTING: '#22c55e', SECURITY: '#ef4444', INFRASTRUCTURE: '#f59e0b',
  COMMUNICATION: '#3b82f6', PRODUCTIVITY: '#8b5cf6', DOMAIN: '#14b8a6', HOSTING: '#f97316',
  STORAGE: '#06b6d4', MONITORING: '#ec4899', HR: '#84cc16', CRM: '#a855f7', OTHER: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e', TRIAL: '#3b82f6', CANCELLED: '#ef4444', EXPIRED: '#f59e0b', PAUSED: '#64748b',
};

/* Pre-built software suggestions for quick add */
const SUGGESTIONS = [
  { name: 'NetSuite', vendor: 'Oracle', category: 'ERP' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Acomba', vendor: 'Fortinet (Acomba)', category: 'ACCOUNTING' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Polprix', vendor: 'Polprix', category: 'ERP' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Microsoft 365', vendor: 'Microsoft', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Google Workspace', vendor: 'Google', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Slack', vendor: 'Salesforce', category: 'COMMUNICATION' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Zoom', vendor: 'Zoom', category: 'COMMUNICATION' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'NordVPN', vendor: 'Nord Security', category: 'SECURITY' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'ExpressVPN', vendor: 'Kape Technologies', category: 'SECURITY' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'AWS', vendor: 'Amazon', category: 'HOSTING' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'DigitalOcean', vendor: 'DigitalOcean', category: 'HOSTING' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Cloudflare', vendor: 'Cloudflare', category: 'INFRASTRUCTURE' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'GoDaddy Domains', vendor: 'GoDaddy', category: 'DOMAIN' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Namecheap', vendor: 'Namecheap', category: 'DOMAIN' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Dropbox Business', vendor: 'Dropbox', category: 'STORAGE' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Jira', vendor: 'Atlassian', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'GitHub', vendor: 'Microsoft', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Salesforce', vendor: 'Salesforce', category: 'CRM' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'HubSpot', vendor: 'HubSpot', category: 'CRM' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Datadog', vendor: 'Datadog', category: 'MONITORING' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'QuickBooks', vendor: 'Intuit', category: 'ACCOUNTING' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'Adobe Creative Cloud', vendor: 'Adobe', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'YEARLY' as SubscriptionBillingCycle },
  { name: 'Notion', vendor: 'Notion Labs', category: 'PRODUCTIVITY' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
  { name: 'BambooHR', vendor: 'BambooHR', category: 'HR' as SubscriptionCategory, billingCycle: 'MONTHLY' as SubscriptionBillingCycle },
];

const emptyForm: SubscriptionRequest = {
  name: '', vendor: '', category: 'OTHER', cost: 0, currency: 'CAD',
  billingCycle: 'MONTHLY', status: 'ACTIVE', startDate: '', nextDueDate: '',
  autoRenew: true, websiteUrl: '', contactEmail: '', notes: '',
};

export default function SubscriptionsPage() {
  const { t, lang } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const confirm = useConfirm();
  const isDark = colorScheme === 'dark';

  const [subs, setSubs] = useState<SubscriptionResponse[]>([]);
  const [report, setReport] = useState<SubscriptionReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'manage' | 'report'>('manage');

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionResponse | null>(null);
  const [form, setForm] = useState<SubscriptionRequest>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [subsData, reportData] = await Promise.all([getSubscriptions(), getSubscriptionReport()]);
      setSubs(subsData);
      setReport(reportData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Category / status label helpers ──────────────────────────────

  const catLabel = (cat: string) => (t as any)[`subCat${cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_./g, m => m[1].toUpperCase())}`] || cat;
  const statusLabel = (s: string) => (t as any)[`subStatus${s.charAt(0) + s.slice(1).toLowerCase()}`] || s;
  const cycleLabel = (c: string) => {
    const map: Record<string, string> = { MONTHLY: t.subCycleMonthly, QUARTERLY: t.subCycleQuarterly, SEMI_ANNUAL: t.subCycleSemiAnnual, YEARLY: t.subCycleYearly };
    return map[c] || c;
  };

  // ─── Filtered list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.vendor?.toLowerCase().includes(q)) return false;
      }
      if (filterCategory && s.category !== filterCategory) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      return true;
    });
  }, [subs, search, filterCategory, filterStatus]);

  // ─── CRUD ─────────────────────────────────────────────────────────

  const openCreateModal = (suggestion?: typeof SUGGESTIONS[0]) => {
    setEditingSub(null);
    setForm(suggestion ? { ...emptyForm, name: suggestion.name, vendor: suggestion.vendor, category: suggestion.category, billingCycle: suggestion.billingCycle } : { ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (sub: SubscriptionResponse) => {
    setEditingSub(sub);
    setForm({
      name: sub.name, vendor: sub.vendor || '', category: sub.category,
      cost: sub.cost, currency: sub.currency, billingCycle: sub.billingCycle,
      status: sub.status, startDate: sub.startDate || '', nextDueDate: sub.nextDueDate || '',
      autoRenew: sub.autoRenew, websiteUrl: sub.websiteUrl || '',
      contactEmail: sub.contactEmail || '', notes: sub.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingSub) {
        await updateSubscription(editingSub.id, form);
      } else {
        await createSubscription(form);
      }
      setShowModal(false);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm(t.subDeleteConfirm);
    if (!ok) return;
    try {
      await deleteSubscription(id);
      await load();
    } catch (e) { console.error(e); }
  };

  // ─── Styling ──────────────────────────────────────────────────────

  const textMuted = isDark ? 'text-surface-400' : 'text-slate-500';
  const textMain = isDark ? 'text-surface-100' : 'text-slate-900';
  const cardBase = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200 shadow-sm';
  const cardHeader = isDark ? 'border-surface-700 bg-surface-900/50' : 'border-slate-100 bg-slate-50/50';
  const inputCls = `w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-surface-900 border-surface-700 text-surface-100' : 'bg-white border-slate-300 text-slate-900'}`;
  const btnPrimary = `px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`;
  const btnSecondary = `px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isDark ? 'bg-surface-700 text-surface-200 hover:bg-surface-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;

  // ─── Due date badge ───────────────────────────────────────────────

  const dueBadge = (sub: SubscriptionResponse) => {
    if (!sub.nextDueDate) return <span className={`text-xs ${textMuted}`}>{t.subNoDueDate}</span>;
    const days = Math.ceil((new Date(sub.nextDueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="text-xs font-semibold text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full">{t.subOverdue}</span>;
    if (days === 0) return <span className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">{t.subDueToday}</span>;
    if (days <= 30) return <span className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">{t.subDueIn} {days} {t.subDays}</span>;
    return <span className={`text-xs ${textMuted}`}>{sub.nextDueDate}</span>;
  };

  // ─── Loading ──────────────────────────────────────────────────────

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

  // ─── Chart helpers ────────────────────────────────────────────────

  const maxCostCat = report ? Math.max(...Object.values(report.costByCategory), 1) : 1;
  const maxCountCat = report ? Math.max(...Object.values(report.countByCategory), 1) : 1;

  return (
    <div className={`p-6 min-h-screen printable-content ${isDark ? 'bg-surface-950' : 'bg-slate-50'}`}>
      {/* Print header */}
      <div className="print-only-header">
        <div className="flex items-center gap-3 mb-2">
          <img src="/logo.png" alt="Horizon Nature" className="h-12 w-auto" />
          <h1 className="text-2xl font-bold">Horizon Nature</h1>
        </div>
        <div className="text-sm text-gray-500">{t.subTitle} - {new Date().toLocaleDateString()}</div>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>{t.subTitle}</h1>
            <p className={`text-sm mt-1 ${textMuted}`}>{t.subSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className={btnSecondary}>
              <FaPrint className="w-4 h-4 inline mr-2" />{t.print}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab('manage')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${tab === 'manage' ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (isDark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')}`}
          >{t.subManage}</button>
          <button
            onClick={() => setTab('report')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${tab === 'report' ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (isDark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')}`}
          >{t.subReport}</button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  REPORTS TAB                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {tab === 'report' && report && (
          <div className="space-y-8">

            {/* Hero metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total monthly */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center opacity-10 pointer-events-none">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="#22c55e"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t.subTotalMonthly}</h3>
                <span className="text-3xl font-bold text-green-500">${report.totalMonthlyCost.toFixed(2)}</span>
                <div className={`text-xs mt-1 ${textMuted}`}>CAD {t.subPerMonth}</div>
              </div>
              {/* Total yearly */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center opacity-10 pointer-events-none">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="#3b82f6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t.subTotalYearly}</h3>
                <span className="text-3xl font-bold text-blue-500">${report.totalYearlyCost.toFixed(2)}</span>
                <div className={`text-xs mt-1 ${textMuted}`}>CAD {t.subPerYear}</div>
              </div>
              {/* Active count */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${cardBase}`}>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center opacity-10 pointer-events-none">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t.subActiveCount}</h3>
                <span className="text-3xl font-bold text-purple-500">{report.activeSubscriptions}</span>
                <div className={`text-xs mt-1 ${textMuted}`}>/ {report.totalSubscriptions} total</div>
              </div>
              {/* Upcoming renewals */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${report.upcomingRenewals30d > 0 ? (isDark ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50 border-amber-200') : cardBase}`}>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center opacity-10 pointer-events-none">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t.subUpcomingRenewals}</h3>
                <span className={`text-3xl font-bold ${report.upcomingRenewals30d > 0 ? 'text-amber-500' : 'text-green-500'}`}>{report.upcomingRenewals30d}</span>
                <div className={`text-xs mt-1 ${textMuted}`}>{t.subUpcoming30d}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Bar chart: Monthly cost by category ─────────────── */}
              <div className={`rounded-2xl p-6 border ${cardBase}`}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-5 ${textMain}`}>{t.subCostByCategory}</h2>
                <div className="space-y-3">
                  {Object.entries(report.costByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, cost]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-medium ${textMain}`}>{catLabel(cat)}</span>
                          <span className={`font-bold ${textMain}`}>${cost.toFixed(2)}{t.subPerMonth}</span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cost / maxCostCat) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] || '#64748b' }} />
                        </div>
                      </div>
                    ))}
                  {Object.keys(report.costByCategory).length === 0 && (
                    <div className={`text-sm text-center italic py-6 ${textMuted}`}>{t.noDataAvailable}</div>
                  )}
                </div>
              </div>

              {/* ── Horizontal bar chart: Count by category ──────────── */}
              <div className={`rounded-2xl p-6 border ${cardBase}`}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-5 ${textMain}`}>{t.subCountByCategory}</h2>
                <div className="space-y-3">
                  {Object.entries(report.countByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className={`text-xs font-medium w-28 truncate ${textMain}`}>{catLabel(cat)}</span>
                        <div className={`flex-1 h-6 rounded-full overflow-hidden ${isDark ? 'bg-surface-700' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2" style={{ width: `${Math.max((count / maxCountCat) * 100, 12)}%`, backgroundColor: CATEGORY_COLORS[cat] || '#64748b' }}>
                            <span className="text-[10px] font-bold text-white">{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  {Object.keys(report.countByCategory).length === 0 && (
                    <div className={`text-sm text-center italic py-6 ${textMuted}`}>{t.noDataAvailable}</div>
                  )}
                </div>
              </div>

              {/* ── Donut-style: Status Distribution ─────────────────── */}
              <div className={`rounded-2xl p-6 border ${cardBase}`}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-5 ${textMain}`}>{t.subStatusDistribution}</h2>
                {Object.keys(report.countByStatus).length > 0 ? (
                  <>
                    <div className="flex justify-center mb-6">
                      <div className="relative w-40 h-40">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          {(() => {
                            const total = Object.values(report.countByStatus).reduce((a, b) => a + b, 0);
                            let offset = 0;
                            return Object.entries(report.countByStatus).map(([status, count]) => {
                              const pct = (count / total) * 100;
                              const dash = `${pct} ${100 - pct}`;
                              const el = (
                                <circle
                                  key={status}
                                  cx="18" cy="18" r="15.9155"
                                  fill="transparent"
                                  stroke={STATUS_COLORS[status] || '#64748b'}
                                  strokeWidth="3.5"
                                  strokeDasharray={dash}
                                  strokeDashoffset={`${-offset}`}
                                  strokeLinecap="round"
                                />
                              );
                              offset += pct;
                              return el;
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-bold ${textMain}`}>{report.totalSubscriptions}</span>
                          <span className={`text-[10px] uppercase ${textMuted}`}>total</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                      {Object.entries(report.countByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#64748b' }} />
                          <span className={`text-xs font-medium ${textMain}`}>{statusLabel(status)}</span>
                          <span className={`text-xs font-bold ${textMuted}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`text-sm text-center italic py-6 ${textMuted}`}>{t.noDataAvailable}</div>
                )}
              </div>

              {/* ── Billing Cycle Breakdown ──────────────────────────── */}
              <div className={`rounded-2xl p-6 border ${cardBase}`}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-5 ${textMain}`}>{t.subCostByBillingCycle}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(report.costByBillingCycle)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cycle, cost]) => (
                      <div key={cycle} className={`rounded-xl p-4 text-center border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-xl font-bold ${textMain}`}>${cost.toFixed(2)}</div>
                        <div className={`text-xs font-medium mt-1 ${textMuted}`}>{cycleLabel(cycle)}</div>
                      </div>
                    ))}
                  {Object.keys(report.costByBillingCycle).length === 0 && (
                    <div className={`col-span-2 text-sm text-center italic py-6 ${textMuted}`}>{t.noDataAvailable}</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Upcoming Renewals List ──────────────────────────── */}
            {report.upcomingRenewals.length > 0 && (
              <div className={`rounded-2xl p-6 border ${cardBase}`}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-5 ${textMain}`}>
                  <svg className="w-5 h-5 inline mr-2 opacity-70 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t.subRenewalCalendar}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.upcomingRenewals.map(sub => {
                    const days = Math.ceil((new Date(sub.nextDueDate!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={sub.id} className={`rounded-xl p-4 border flex items-center gap-4 ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-slate-100'}`}>
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${days <= 7 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                          {days}d
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold truncate ${textMain}`}>{sub.name}</div>
                          <div className={`text-xs ${textMuted}`}>{sub.nextDueDate} · ${sub.cost} {cycleLabel(sub.billingCycle)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  MANAGE TAB                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {tab === 'manage' && (
          <div className="space-y-6">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                placeholder={t.subSearch}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`${inputCls} sm:max-w-xs`}
              />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`${inputCls} sm:max-w-[180px]`}>
                <option value="">{t.subAllCategories}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${inputCls} sm:max-w-[160px]`}>
                <option value="">{t.subAllStatuses}</option>
                {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <div className="sm:ml-auto">
                <button onClick={() => openCreateModal()} className={btnPrimary}>+ {t.subAdd}</button>
              </div>
            </div>

            {/* Quick-add suggestions */}
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-surface-900/50 border-surface-800' : 'bg-blue-50/50 border-blue-100'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>{t.subSuggestions}</h3>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => openCreateModal(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${isDark ? 'border-surface-700 text-surface-300 hover:bg-surface-700 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-white hover:text-blue-600 hover:border-blue-300'}`}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscription Cards */}
            {filtered.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border ${cardBase}`}>
                <svg className="mx-auto w-16 h-16 opacity-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <h3 className={`font-semibold text-lg ${textMain}`}>{t.subNoSubscriptions}</h3>
                <p className={`text-sm mt-1 ${textMuted}`}>{t.subNoSubscriptionsHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(sub => (
                  <div key={sub.id} className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-lg ${cardBase}`}>
                    {/* Card header with color band */}
                    <div className="h-1.5" style={{ backgroundColor: CATEGORY_COLORS[sub.category] || '#64748b' }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className={`font-bold truncate ${textMain}`}>{sub.name}</h3>
                          <p className={`text-xs truncate ${textMuted}`}>{sub.vendor || '—'}</p>
                        </div>
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: `${STATUS_COLORS[sub.status]}20`, color: STATUS_COLORS[sub.status] }}>
                          {statusLabel(sub.status)}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className={`text-2xl font-bold ${textMain}`}>${sub.cost.toFixed(2)}</span>
                        <span className={`text-xs ${textMuted}`}>{cycleLabel(sub.billingCycle)}</span>
                      </div>

                      <div className={`grid grid-cols-2 gap-2 text-xs mb-4 ${textMuted}`}>
                        <div>
                          <span className="block font-medium">{t.subMonthlyCost}</span>
                          <span className={`font-bold ${textMain}`}>${sub.monthlyCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block font-medium">{t.subYearlyCost}</span>
                          <span className={`font-bold ${textMain}`}>${sub.yearlyCost.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${CATEGORY_COLORS[sub.category]}18`, color: CATEGORY_COLORS[sub.category] }}>
                          {catLabel(sub.category)}
                        </span>
                        {dueBadge(sub)}
                      </div>

                      {sub.autoRenew && (
                        <div className={`text-[10px] uppercase font-semibold mb-3 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          {t.subAutoRenew}
                        </div>
                      )}

                      <div className={`flex gap-2 pt-3 border-t ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
                        <button onClick={() => openEditModal(sub)} className={`flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-surface-700' : 'text-blue-600 hover:bg-blue-50'}`}>
                          {t.subEdit}
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className={`flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-surface-700' : 'text-red-600 hover:bg-red-50'}`}>
                          {t.delete}
                        </button>
                        {sub.websiteUrl && (
                          <a href={sub.websiteUrl} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors ${isDark ? 'text-surface-400 hover:bg-surface-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            ↗ {t.subWebsite}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  CREATE / EDIT MODAL                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div
            className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${cardHeader}`}>
              <h2 className={`text-lg font-bold ${textMain}`}>{editingSub ? t.subEdit : t.subAdd}</h2>
              <button onClick={() => setShowModal(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-surface-800 text-surface-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subName} *</label>
                <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              {/* Vendor */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subVendor}</label>
                <input className={inputCls} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
              </div>
              {/* Category + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subCategory}</label>
                  <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subStatus}</label>
                  <select className={inputCls} value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              </div>
              {/* Cost + Currency + Billing Cycle */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subCost} *</label>
                  <input className={inputCls} type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subCurrency}</label>
                  <select className={inputCls} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subBillingCycle}</label>
                  <select className={inputCls} value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })}>
                    {BILLING_CYCLES.map(c => <option key={c} value={c}>{cycleLabel(c)}</option>)}
                  </select>
                </div>
              </div>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subStartDate}</label>
                  <input className={inputCls} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subNextDueDate}</label>
                  <input className={inputCls} type="date" value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} />
                </div>
              </div>
              {/* Auto-renew */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.autoRenew} onChange={e => setForm({ ...form, autoRenew: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className={`text-sm ${textMain}`}>{t.subAutoRenew}</span>
              </label>
              {/* Website + Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subWebsite}</label>
                  <input className={inputCls} type="url" placeholder="https://..." value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subContactEmail}</label>
                  <input className={inputCls} type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>{t.subNotes}</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
              <button onClick={() => setShowModal(false)} className={btnSecondary}>{t.cancel}</button>
              <button onClick={handleSave} disabled={saving || !form.name} className={`${btnPrimary} disabled:opacity-50`}>
                {saving ? '...' : (editingSub ? t.save : t.subAdd)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
