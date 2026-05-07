import * as React from 'react';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getAuditStats,
  getAuditLogs,
  getAuditUserStats,
  getAuditActionBreakdown,
  getAuditTimeline,
  getJobs,
  triggerJob,
  getOnlineUsers,
} from '../lib/api';
import type { OnlineUser } from '../lib/api';
import type {
  AuditStatsResponse,
  AuditLogEntry,
  AuditLogsPage,
  AuditUserStat,
  AuditActionEntry,
  AuditTimelineEntry,
  JobStatus,
} from '../types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: 'Today',   value: 1  },
  { label: '7 Days',  value: 7  },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All Time',value: 0  },
];

const ACTION_META: Record<string, { color: string; bg: string; label: string; category: string }> = {
  LOGIN:                      { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Login',                   category: 'Auth' },
  LOGOUT:                     { color: 'text-slate-400',   bg: 'bg-slate-500/15',   label: 'Logout',                  category: 'Auth' },
  CREATE_WORK_ORDER:          { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Create Work Order',       category: 'Work Orders' },
  UPDATE_WORK_ORDER:          { color: 'text-sky-400',     bg: 'bg-sky-500/15',     label: 'Update Work Order',       category: 'Work Orders' },
  DELETE_WORK_ORDER:          { color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Delete Work Order',       category: 'Work Orders' },
  ARCHIVE_WORK_ORDER:         { color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Archive Work Order',      category: 'Work Orders' },
  UNARCHIVE_WORK_ORDER:       { color: 'text-amber-300',   bg: 'bg-amber-400/10',   label: 'Unarchive Work Order',    category: 'Work Orders' },
  MOVE_WORK_ORDER:            { color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    label: 'Move Work Order',         category: 'Work Orders' },
  CREATE_URGENT_WORK_ORDER:   { color: 'text-orange-400',  bg: 'bg-orange-500/15',  label: 'Create Urgent WO',        category: 'Urgent' },
  UPDATE_URGENT_WORK_ORDER:   { color: 'text-orange-300',  bg: 'bg-orange-400/10',  label: 'Update Urgent WO',        category: 'Urgent' },
  DELETE_URGENT_WORK_ORDER:   { color: 'text-red-500',     bg: 'bg-red-600/15',     label: 'Delete Urgent WO',        category: 'Urgent' },
  ARCHIVE_URGENT_WORK_ORDER:  { color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  label: 'Archive Urgent WO',       category: 'Urgent' },
  CREATE_MILEAGE:             { color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Create Mileage',          category: 'Mileage' },
  DELETE_MILEAGE:             { color: 'text-rose-400',    bg: 'bg-rose-500/15',    label: 'Delete Mileage',          category: 'Mileage' },
  INVITE_USER:                { color: 'text-teal-400',    bg: 'bg-teal-500/15',    label: 'Invite User',             category: 'Users' },
  ACTIVATE_USER:              { color: 'text-green-400',   bg: 'bg-green-500/15',   label: 'Activate User',           category: 'Users' },
  DEACTIVATE_USER:            { color: 'text-pink-400',    bg: 'bg-pink-500/15',    label: 'Deactivate User',         category: 'Users' },
  DELETE_USER:                { color: 'text-red-500',     bg: 'bg-red-600/15',     label: 'Delete User',             category: 'Users' },
  PAGE_VIEW:                  { color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Page View',               category: 'Navigation' },
  BUTTON_CLICK:               { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', label: 'Button Click',            category: 'Navigation' },
  CREATE_BUG_REPORT:          { color: 'text-red-300',     bg: 'bg-red-400/10',     label: 'Bug Report',              category: 'System' },
  CREATE_BROADCAST:           { color: 'text-blue-300',    bg: 'bg-blue-400/10',    label: 'Broadcast',               category: 'System' },
};

const ROLE_META: Record<string, { color: string; bg: string }> = {
  ADMIN:      { color: 'text-indigo-400',  bg: 'bg-indigo-500/20'  },
  DEVELOPPER: { color: 'text-violet-400',  bg: 'bg-violet-500/20'  },
  TECH:       { color: 'text-cyan-400',    bg: 'bg-cyan-500/20'    },
  WORKER:     { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

const TABS = ['Overview', 'Activity Feed', 'Users', 'Actions', 'Jobs'] as const;
type Tab = typeof TABS[number];

function actionMeta(action: string) {
  return ACTION_META[action] ?? { color: 'text-slate-400', bg: 'bg-slate-500/15', label: action, category: 'Other' };
}

function roleMeta(role: string | null) {
  return ROLE_META[role ?? ''] ?? { color: 'text-slate-400', bg: 'bg-slate-500/20' };
}

function fmt(n: number) {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + 'k'
    : String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  isDark: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent, isDark }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 border flex flex-col gap-2 transition-all hover:scale-[1.02] ${
    isDark ? 'bg-surface-900 border-surface-800/80' : 'bg-white border-slate-200 shadow-sm'
  }`}>
    <div className={`absolute inset-0 opacity-5 pointer-events-none ${accent}`} />
    <div className="flex items-start justify-between">
      <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{label}</span>
      <div className={`p-2 rounded-xl ${accent} bg-opacity-20`}>{icon}</div>
    </div>
    <div className={`text-3xl font-black tabular-nums ${isDark ? 'text-surface-50' : 'text-slate-900'}`}>{fmt(Number(value))}</div>
    {sub && <div className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{sub}</div>}
  </div>
);

interface ActionBadgeProps { action: string; small?: boolean }
const ActionBadge: React.FC<ActionBadgeProps> = ({ action, small }) => {
  const m = actionMeta(action);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${m.bg} ${m.color} ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      {m.label}
    </span>
  );
};

interface RoleBadgeProps { role: string | null }
const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const m = roleMeta(role);
  return (
    <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 ${m.bg} ${m.color}`}>
      {role ?? '—'}
    </span>
  );
};

// ─── Timeline Bar Chart ───────────────────────────────────────────────────────

interface TimelineChartProps {
  data: AuditTimelineEntry[];
  isDark: boolean;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ data, isDark }) => {
  if (!data.length) return (
    <div className={`flex items-center justify-center h-24 text-sm ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
      No data in range
    </div>
  );

  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-24 w-full" title="Activity Timeline">
      {data.map((d) => {
        const pct = Math.max(2, (d.count / max) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group min-w-0">
            <div className="relative w-full flex items-end justify-center h-20">
              <div
                className="w-full rounded-t-sm bg-brand-500 opacity-80 group-hover:opacity-100 transition-all cursor-default"
                style={{ height: `${pct}%` }}
              />
              {/* Tooltip */}
              <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                isDark ? 'bg-surface-700 text-surface-100' : 'bg-slate-800 text-white'
              }`}>
                {d.count} · {d.date.slice(5)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Horizontal Bar ───────────────────────────────────────────────────────────

const HBar: React.FC<{ label: string; count: number; max: number; color: string; isDark: boolean }> = ({
  label, count, max, color, isDark,
}) => {
  const pct = max > 0 ? Math.max(1, (count / max) * 100) : 0;
  const m = actionMeta(label);
  return (
    <div className="flex items-center gap-3 group">
      <div className={`w-44 shrink-0 text-xs font-semibold truncate ${m.color}`} title={m.label}>{m.label}</div>
      <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-surface-800' : 'bg-slate-100'}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-12 text-right text-xs font-bold tabular-nums shrink-0 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
        {fmt(count)}
      </div>
    </div>
  );
};

// ─── Feed Item ────────────────────────────────────────────────────────────────

const FeedItem: React.FC<{ entry: AuditLogEntry; isDark: boolean; compact?: boolean }> = ({ entry, isDark, compact }) => {
  const m = actionMeta(entry.action);
  const rm = roleMeta(entry.userRole);
  return (
    <div className={`flex items-start gap-3 py-3 border-b last:border-b-0 transition-colors hover:bg-surface-800/30 ${
      isDark ? 'border-surface-800/60' : 'border-slate-100'
    }`}>
      {/* Color dot */}
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${m.bg.replace('/15', '')} opacity-80`} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <ActionBadge action={entry.action} small />
          {entry.entityTitle && (
            <span className={`text-xs truncate max-w-[180px] ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>
              "{entry.entityTitle}"
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
            {entry.userEmail ?? 'anonymous'}
          </span>
          {entry.userRole && <RoleBadge role={entry.userRole} />}
        </div>
        {!compact && entry.ipAddress && (
          <div className={`text-[10px] font-mono ${isDark ? 'text-surface-600' : 'text-slate-400'}`}>{entry.ipAddress}</div>
        )}
      </div>
      <div className={`shrink-0 text-[11px] whitespace-nowrap ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
        {timeAgo(entry.occurredAt)}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DevInsightsPage: React.FC = () => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  // Range
  const [range, setRange] = React.useState(7);
  const [tab, setTab] = React.useState<Tab>('Overview');

  // Data state
  const [stats,     setStats]     = React.useState<AuditStatsResponse | null>(null);
  const [timeline,  setTimeline]  = React.useState<AuditTimelineEntry[]>([]);
  const [actions,   setActions]   = React.useState<AuditActionEntry[]>([]);
  const [users,     setUsers]     = React.useState<AuditUserStat[]>([]);
  const [feed,      setFeed]      = React.useState<AuditLogsPage | null>(null);

  // Online users (refreshed independently every 60s)
  const [onlineUsers, setOnlineUsers] = React.useState<OnlineUser[]>([]);
  const fetchOnlineUsers = React.useCallback(() => {
    getOnlineUsers().then(setOnlineUsers).catch(() => {});
  }, []);
  React.useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 60_000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  // Feed filters
  const [feedPage,   setFeedPage]   = React.useState(0);
  const [feedAction, setFeedAction] = React.useState('');
  const [feedEmail,  setFeedEmail]  = React.useState('');

  // Loading
  const [statsLoading,   setStatsLoading]   = React.useState(true);
  const [timelineLoading,setTimelineLoading]= React.useState(true);
  const [actionsLoading, setActionsLoading] = React.useState(true);
  const [usersLoading,   setUsersLoading]   = React.useState(true);
  const [feedLoading,    setFeedLoading]    = React.useState(false);

  // Load overview data when range changes
  React.useEffect(() => {
    setStatsLoading(true);
    setTimelineLoading(true);
    setActionsLoading(true);
    setUsersLoading(true);

    const effectiveRange = range === 0 ? 36500 : range;

    Promise.all([
      getAuditStats(effectiveRange).then(setStats).finally(() => setStatsLoading(false)),
      getAuditTimeline(effectiveRange).then(setTimeline).finally(() => setTimelineLoading(false)),
      getAuditActionBreakdown(effectiveRange).then(setActions).finally(() => setActionsLoading(false)),
      getAuditUserStats(effectiveRange).then(setUsers).finally(() => setUsersLoading(false)),
    ]);
  }, [range]);

  // Load feed
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const loadFeed = React.useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await getAuditLogs({
        page: feedPage,
        size: 50,
        action: feedAction || null,
      });
      setFeed(data);
    } catch (err: any) {
      setFeedError(err?.response?.data?.message || err?.message || 'Failed to load activity feed');
    } finally {
      setFeedLoading(false);
    }
  }, [feedPage, feedAction]);

  React.useEffect(() => {
    if (tab === 'Activity Feed') loadFeed();
  }, [tab, loadFeed]);

  // Filter feed by email client-side
  const filteredFeed = React.useMemo(() => {
    if (!feed) return [];
    const q = feedEmail.trim().toLowerCase();
    if (!q) return feed.content;
    return feed.content.filter(e => e.userEmail?.toLowerCase().includes(q));
  }, [feed, feedEmail]);

  // Theming
  const card   = isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-slate-200 shadow-sm';
  const muted  = isDark ? 'text-surface-400' : 'text-slate-500';
  const strong = isDark ? 'text-surface-100' : 'text-slate-900';
  const divider= isDark ? 'divide-surface-800' : 'divide-slate-100';

  const maxActionCount = actions.length > 0 ? Math.max(...actions.map(a => a.count)) : 1;

  // bar color cycling
  const barColors = [
    'bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500',
    'bg-cyan-500','bg-rose-500','bg-teal-500','bg-fuchsia-500',
    'bg-orange-500','bg-indigo-500',
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-surface-950' : 'bg-slate-50'}`}>
      {/* ── Hero Header ── */}
      <div className={`sticky top-0 z-20 border-b backdrop-blur-md ${
        isDark ? 'bg-surface-950/90 border-surface-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
              <h1 className={`text-xl font-black tracking-tight ${strong}`}>Dev Insights</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>DEVELOPPER</span>
            </div>
            <p className={`text-xs mt-0.5 ${muted}`}>Full system audit trail — every action, every user, captured.</p>
          </div>

          {/* Range selector */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-slate-100 border-slate-200'}`}>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  range === opt.value
                    ? 'bg-brand-500 text-white shadow'
                    : isDark ? 'text-surface-400 hover:text-surface-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1600px] mx-auto px-6 flex gap-0 border-t overflow-x-auto" style={{ borderColor: 'transparent' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t
                  ? `border-brand-500 ${isDark ? 'text-surface-100' : 'text-slate-900'}`
                  : `border-transparent ${muted} hover:${isDark ? 'text-surface-300' : 'text-slate-700'}`
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ══════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════ */}
        {tab === 'Overview' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard
                label="Total Events"
                value={statsLoading ? '—' : (stats?.totalAll ?? 0)}
                sub="All time"
                isDark={isDark}
                accent="bg-blue-500"
                icon={<svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
              />
              <StatCard
                label="In Range"
                value={statsLoading ? '—' : (stats?.totalInRange ?? 0)}
                sub={RANGE_OPTIONS.find(o => o.value === range)?.label}
                isDark={isDark}
                accent="bg-violet-500"
                icon={<svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18v2H3zM3 10h12v2H3zM3 16h6v2H3z"/></svg>}
              />
              <StatCard
                label="Active Users"
                value={statsLoading ? '—' : (stats?.uniqueUsers ?? 0)}
                sub="Unique in range"
                isDark={isDark}
                accent="bg-emerald-500"
                icon={<svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
              />
              <StatCard
                label="Logins"
                value={statsLoading ? '—' : (stats?.loginsInRange ?? 0)}
                sub="In range"
                isDark={isDark}
                accent="bg-teal-500"
                icon={<svg className="w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>}
              />
              <StatCard
                label="WOs Created"
                value={statsLoading ? '—' : ((stats?.workOrdersCreatedInRange ?? 0) + (stats?.urgentWorkOrdersCreatedInRange ?? 0))}
                sub={statsLoading ? '' : `${stats?.workOrdersCreatedInRange ?? 0} normal · ${stats?.urgentWorkOrdersCreatedInRange ?? 0} urgent`}
                isDark={isDark}
                accent="bg-amber-500"
                icon={<svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}
              />
              <StatCard
                label="Events Today"
                value={statsLoading ? '—' : (stats?.eventsToday ?? 0)}
                sub="Since midnight UTC"
                isDark={isDark}
                accent="bg-rose-500"
                icon={<svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
              />
            </div>

            {/* Most Active + Most Common Action */}
            {!statsLoading && (stats?.mostActiveUserEmail || stats?.mostCommonAction) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats?.mostActiveUserEmail && (
                  <div className={`rounded-2xl border p-5 flex items-center gap-4 ${card}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {stats.mostActiveUserEmail[0].toUpperCase()}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${muted}`}>Most Active User</div>
                      <div className={`font-bold truncate ${strong}`}>{stats.mostActiveUserEmail}</div>
                    </div>
                  </div>
                )}
                {stats?.mostCommonAction && (
                  <div className={`rounded-2xl border p-5 flex items-center gap-4 ${card}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actionMeta(stats.mostCommonAction).bg}`}>
                      <svg className={`w-5 h-5 ${actionMeta(stats.mostCommonAction).color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </div>
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${muted}`}>Top Action</div>
                      <ActionBadge action={stats.mostCommonAction} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Online Now */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className={`text-sm font-semibold ${strong}`}>Online Now</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                    {onlineUsers.length}
                  </span>
                </div>
                <button
                  onClick={fetchOnlineUsers}
                  title="Refresh"
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-surface-500 hover:text-surface-300 hover:bg-surface-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0 1 14.9-2.7M20 15a8 8 0 0 1-14.9 2.7"/></svg>
                </button>
              </div>
              {onlineUsers.length === 0 ? (
                <p className={`text-xs ${muted}`}>No users active in the last 15 min.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {onlineUsers.map(u => {
                    const rm = roleMeta(u.role);
                    const initials = (u.email || '?')[0].toUpperCase();
                    return (
                      <div key={u.id} title={u.email} className="flex items-center gap-2 group">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-xs font-black">
                            {initials}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-900" />
                        </div>
                        <div className="hidden sm:flex flex-col leading-none">
                          <span className={`text-xs font-semibold max-w-[120px] truncate ${strong}`}>{u.email?.split('@')[0]}</span>
                          <span className={`text-[10px] ${rm.color}`}>{u.role}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className={`text-[10px] mt-3 ${muted}`}>Active within the last 5 minutes · refreshes every 60s</p>
            </div>

            {/* Timeline + Action Breakdown side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Activity Timeline */}
              <div className={`xl:col-span-2 rounded-2xl border p-6 ${card}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-semibold ${strong}`}>Activity Timeline</h2>
                  <span className={`text-xs ${muted}`}>{RANGE_OPTIONS.find(o => o.value === range)?.label}</span>
                </div>
                {timelineLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <TimelineChart data={timeline} isDark={isDark} />
                    <div className={`mt-2 text-[11px] text-center ${muted}`}>
                      {timeline.length > 0
                        ? `${timeline[0]?.date} → ${timeline[timeline.length - 1]?.date}  ·  ${timeline.reduce((s,d)=>s+d.count,0)} total events`
                        : 'No activity recorded'}
                    </div>
                  </>
                )}
              </div>

              {/* Top 8 Actions */}
              <div className={`rounded-2xl border p-6 ${card}`}>
                <h2 className={`text-sm font-semibold mb-4 ${strong}`}>Top Actions</h2>
                {actionsLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : actions.length === 0 ? (
                  <p className={`text-sm ${muted}`}>No data</p>
                ) : (
                  <div className="space-y-3">
                    {actions.slice(0, 8).map((a, i) => (
                      <HBar key={a.action} label={a.action} count={a.count} max={maxActionCount} color={barColors[i % barColors.length]} isDark={isDark} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Feed preview */}
            <div className={`rounded-2xl border p-6 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-sm font-semibold ${strong}`}>Recent Activity</h2>
                <button
                  onClick={() => setTab('Activity Feed')}
                  className="text-xs text-brand-500 hover:text-brand-400 font-semibold"
                >
                  View all →
                </button>
              </div>
              <RecentPreview isDark={isDark} />
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            ACTIVITY FEED TAB
        ══════════════════════════════════════════════════════════ */}
        {tab === 'Activity Feed' && (
          <div className={`rounded-2xl border ${card}`}>
            {/* Filters */}
            <div className={`p-5 border-b flex flex-wrap gap-3 ${isDark ? 'border-surface-800' : 'border-slate-100'}`}>
              <input
                type="text"
                placeholder="Filter by email…"
                value={feedEmail}
                onChange={e => setFeedEmail(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border outline-none ${
                  isDark ? 'bg-surface-800 border-surface-700 text-surface-100 placeholder-surface-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
              <select
                value={feedAction}
                onChange={e => { setFeedAction(e.target.value); setFeedPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm border outline-none ${
                  isDark ? 'bg-surface-800 border-surface-700 text-surface-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="">All actions</option>
                {Object.entries(ACTION_META).map(([key, m]) => (
                  <option key={key} value={key}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={() => loadFeed()}
                className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
              >
                Refresh
              </button>
              {feed && (
                <span className={`ml-auto text-xs self-center ${muted}`}>
                  {feed.totalElements.toLocaleString()} total events
                </span>
              )}
            </div>

            {/* Feed list */}
            <div className="px-5 divide-y" style={{ minHeight: 200 }}>
              {feedLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : feedError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-400 font-semibold">Failed to load activity feed</p>
                  <p className={`text-xs mt-1 ${muted}`}>{feedError}</p>
                </div>
              ) : filteredFeed.length === 0 ? (
                <div className={`py-10 text-center text-sm ${muted}`}>No events found</div>
              ) : (
                filteredFeed.map(entry => (
                  <FeedItem key={entry.id} entry={entry} isDark={isDark} />
                ))
              )}
            </div>

            {/* Pagination */}
            {feed && feed.totalPages > 1 && (
              <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-surface-800' : 'border-slate-100'}`}>
                <button
                  disabled={feedPage === 0}
                  onClick={() => setFeedPage(p => p - 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${
                    isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ← Previous
                </button>
                <span className={`text-xs ${muted}`}>Page {feedPage + 1} / {feed.totalPages}</span>
                <button
                  disabled={feedPage >= feed.totalPages - 1}
                  onClick={() => setFeedPage(p => p + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${
                    isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            USERS TAB
        ══════════════════════════════════════════════════════════ */}
        {tab === 'Users' && (
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-surface-800' : 'border-slate-100'}`}>
              <h2 className={`text-sm font-semibold ${strong}`}>Per-User Breakdown</h2>
              <p className={`text-xs mt-0.5 ${muted}`}>
                {RANGE_OPTIONS.find(o => o.value === range)?.label} · {users.length} user{users.length !== 1 ? 's' : ''} active
              </p>
            </div>

            {usersLoading ? (
              <div className="py-16 flex justify-center">
                <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className={`py-12 text-center text-sm ${muted}`}>No user activity in this range</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-surface-500 bg-surface-900' : 'text-slate-500 bg-slate-50'}`}>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3 text-right">Total Actions</th>
                      <th className="px-6 py-3 text-right">Logins</th>
                      <th className="px-6 py-3 text-right">WOs Created</th>
                      <th className="px-6 py-3 text-right">Urgent WOs</th>
                      <th className="px-6 py-3 text-right">Last Seen</th>
                      <th className="px-6 py-3">Activity Bar</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {users.map((u, i) => {
                      const maxTot = users[0].totalActions || 1;
                      const pct = Math.max(2, (u.totalActions / maxTot) * 100);
                      return (
                        <tr key={u.userId} className={`transition-colors ${isDark ? 'hover:bg-surface-800/50' : 'hover:bg-slate-50'}`}>
                          {/* User */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                                {(u.userEmail || '?')[0].toUpperCase()}
                              </div>
                              <span className={`font-medium truncate max-w-[180px] ${strong}`}>{u.userEmail}</span>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-6 py-4"><RoleBadge role={u.userRole} /></td>
                          {/* Total */}
                          <td className={`px-6 py-4 text-right font-bold tabular-nums ${strong}`}>{u.totalActions.toLocaleString()}</td>
                          {/* Logins */}
                          <td className={`px-6 py-4 text-right tabular-nums ${muted}`}>{u.loginCount}</td>
                          {/* WOs */}
                          <td className={`px-6 py-4 text-right tabular-nums ${muted}`}>{u.workOrdersCreated}</td>
                          {/* Urgent */}
                          <td className={`px-6 py-4 text-right tabular-nums ${muted}`}>{u.urgentWorkOrdersCreated}</td>
                          {/* Last seen */}
                          <td className={`px-6 py-4 text-right text-xs whitespace-nowrap ${muted}`}>
                            {u.lastSeen ? timeAgo(u.lastSeen) : '—'}
                          </td>
                          {/* Bar */}
                          <td className="px-6 py-4 w-40">
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-surface-800' : 'bg-slate-100'}`}>
                              <div
                                className={`h-full rounded-full ${barColors[i % barColors.length]}`}
                                style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            ACTIONS TAB
        ══════════════════════════════════════════════════════════ */}
        {tab === 'Actions' && (
          <div className="space-y-6">
            <div className={`rounded-2xl border p-6 ${card}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`text-sm font-semibold ${strong}`}>Action Breakdown</h2>
                <span className={`text-xs ${muted}`}>{RANGE_OPTIONS.find(o => o.value === range)?.label} · {actions.reduce((s,a)=>s+a.count, 0).toLocaleString()} total</span>
              </div>

              {actionsLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : actions.length === 0 ? (
                <p className={`text-sm ${muted}`}>No actions in this range.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((a, i) => {
                    const total = actions.reduce((s, x) => s + x.count, 0) || 1;
                    const pct = (a.count / total * 100).toFixed(1);
                    const m = actionMeta(a.action);
                    return (
                      <div key={a.action} className={`rounded-xl p-4 border flex items-center gap-4 transition-colors ${
                        isDark ? 'border-surface-800 bg-surface-900/50 hover:bg-surface-800/80' : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}>
                        {/* Rank */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isDark ? 'bg-surface-800 text-surface-400' : 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </div>
                        {/* Badge */}
                        <div className="w-44 shrink-0">
                          <ActionBadge action={a.action} />
                        </div>
                        {/* Category tag */}
                        <div className={`w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
                          {m.category}
                        </div>
                        {/* Bar */}
                        <div className="flex-1">
                          <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-surface-800' : 'bg-slate-100'}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColors[i % barColors.length]}`}
                              style={{ width: `${(a.count / maxActionCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        {/* Count + % */}
                        <div className="text-right shrink-0 w-28">
                          <div className={`text-base font-black tabular-nums ${strong}`}>{a.count.toLocaleString()}</div>
                          <div className={`text-[10px] ${muted}`}>{pct}% of range</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action category summary */}
            {!actionsLoading && actions.length > 0 && (
              <ActionCategorySummary actions={actions} isDark={isDark} card={card} strong={strong} muted={muted} />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            JOBS TAB
        ════════════════════════════════════════════════════════ */}
        {tab === 'Jobs' && <JobsTab isDark={isDark} />}
      </div>
    </div>
  );
};

// ─── Recent-preview inner component ──────────────────────────────────────────

const RecentPreview: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [data, setData] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getAuditLogs({ page: 0, size: 15 })
      .then(r => setData(r.content))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="py-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data.length) return (
    <p className={`py-4 text-sm ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>No events yet.</p>
  );

  return (
    <div>
      {data.map(e => <FeedItem key={e.id} entry={e} isDark={isDark} compact />)}
    </div>
  );
};

// ─── Action category summary ──────────────────────────────────────────────────

const ActionCategorySummary: React.FC<{
  actions: AuditActionEntry[];
  isDark: boolean;
  card: string;
  strong: string;
  muted: string;
}> = ({ actions, isDark, card, strong, muted }) => {
  type Bucket = { count: number; actions: string[] };
  const cats = actions.reduce<Record<string, Bucket>>((acc, a) => {
    const cat = actionMeta(a.action).category;
    if (!acc[cat]) acc[cat] = { count: 0, actions: [] };
    acc[cat].count += a.count;
    acc[cat].actions.push(a.action);
    return acc;
  }, {});

  const entries = Object.entries(cats).sort((a, b) => b[1].count - a[1].count);
  const maxCat = entries[0]?.[1].count || 1;

  const catColors: Record<string, string> = {
    'Auth': 'bg-emerald-500/20 border-emerald-500/30',
    'Work Orders': 'bg-blue-500/20 border-blue-500/30',
    'Urgent': 'bg-orange-500/20 border-orange-500/30',
    'Mileage': 'bg-violet-500/20 border-violet-500/30',
    'Users': 'bg-teal-500/20 border-teal-500/30',
    'Navigation': 'bg-indigo-500/20 border-indigo-500/30',
    'System': 'bg-rose-500/20 border-rose-500/30',
  };

  return (
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`text-sm font-semibold mb-4 ${strong}`}>By Category</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {entries.map(([cat, data]) => (
          <div key={cat} className={`rounded-xl border p-4 ${catColors[cat] ?? 'bg-slate-500/20 border-slate-500/30'}`}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>{cat}</div>
            <div className={`text-2xl font-black tabular-nums ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>{data.count.toLocaleString()}</div>
            <div className={`text-[10px] mt-1 ${muted}`}>{data.actions.length} action type{data.actions.length !== 1 ? 's' : ''}</div>
            <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-surface-800' : 'bg-white/50'}`}>
              <div className={`h-full rounded-full bg-current opacity-60`} style={{ width: `${(data.count / maxCat) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Jobs Tab ──────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  IDLE:    { color: 'text-slate-400',   bg: 'bg-slate-500/15',   label: 'Idle'    },
  RUNNING: { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Running' },
  SUCCESS: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Success' },
  FAILED:  { color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Failed'  },
} as const;

const JobsTab: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [jobs, setJobs]           = React.useState<JobStatus[]>([]);
  const [loadingJobs, setLoading] = React.useState(true);
  const [triggering, setTriggering] = React.useState<string | null>(null);
  const [now, setNow]             = React.useState(() => Date.now());

  const card   = isDark ? 'bg-surface-900 border-surface-800/80' : 'bg-white border-slate-200 shadow-sm';
  const strong = isDark ? 'text-surface-100' : 'text-slate-900';
  const muted  = isDark ? 'text-surface-400' : 'text-slate-500';

  // 1s ticker for countdown display
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch + smart polling (2s while running, 10s when idle)
  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        if (!active) return;
        setJobs(data);
        setLoading(false);
        timer = setTimeout(fetchJobs, data.some(j => j.running) ? 2000 : 10000);
      } catch {
        if (active) {
          setLoading(false);
          timer = setTimeout(fetchJobs, 15000);
        }
      }
    };

    fetchJobs();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const handleTrigger = async (id: string) => {
    if (triggering) return;
    setTriggering(id);
    try {
      await triggerJob(id);
    } catch { /* 409 = already running, that’s fine */ }
    try { setJobs(await getJobs()); } catch { /* ignore */ }
    setTriggering(null);
  };

  function countdown(isoStr: string | null): string {
    if (!isoStr) return '—';
    const diff = new Date(isoStr).getTime() - now;
    if (diff <= 0) return 'now';
    const s = Math.floor(diff / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function fmtBytes(bytes: number): string {
    if (bytes === 0) return '—';
    if (bytes < 1024)           return `${bytes} B`;
    if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
    return                              `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function fmtTime(isoStr: string | null): string {
    if (!isoStr) return 'Never';
    return new Date(isoStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  if (loadingJobs) return (
    <div className="py-20 flex justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (jobs.length === 0) return (
    <div className={`rounded-2xl border p-12 text-center ${card}`}>
      <div className="text-5xl mb-3">⚙️</div>
      <p className={`text-sm ${muted}`}>No jobs registered.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between ${card}`}>
        <div>
          <h2 className={`text-sm font-semibold uppercase tracking-widest ${muted} mb-0.5`}>Scheduled Jobs</h2>
          <p className={`text-xs ${muted}`}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} registered
            · Click “Run Now” to trigger any job manually
          </p>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full font-semibold ${
          jobs.some(j => j.running)
            ? 'bg-blue-500/15 text-blue-400 animate-pulse'
            : isDark ? 'bg-surface-800 text-surface-400' : 'bg-slate-100 text-slate-500'
        }`}>
          {jobs.some(j => j.running) ? 'Job running...' : 'All idle'}
        </div>
      </div>

      {/* Job cards */}
      {jobs.map(job => {
        const sc = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.IDLE;
        const isTriggering = triggering === job.id;
        const progressBarColor = job.status === 'SUCCESS' ? 'bg-emerald-500'
                                : job.status === 'FAILED'  ? 'bg-red-500'
                                : 'bg-blue-500';

        return (
          <div
            key={job.id}
            className={`rounded-2xl border overflow-hidden transition-all ${card} ${
              job.running ? (isDark ? 'border-blue-500/40 shadow-lg shadow-blue-500/5' : 'border-blue-400/50 shadow-md') : ''
            }`}
          >
            {/* Top progress bar */}
            <div className={`h-1.5 w-full ${isDark ? 'bg-surface-800' : 'bg-slate-100'}`}>
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${progressBarColor}`}
                style={{
                  width: `${
                    job.running ? job.progressPercent :
                    job.status === 'SUCCESS' ? 100 :
                    job.status === 'FAILED' ? 100 : 0
                  }%`,
                  opacity: job.status === 'IDLE' ? 0 : 1,
                }}
              />
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-5">

                {/* === Left: info === */}
                <div className="flex-1 min-w-0">

                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-surface-800' : 'bg-slate-100'}`}>
                      {/* DB icon */}
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                           className={isDark ? 'text-violet-400' : 'text-violet-600'}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`font-bold text-base leading-tight ${strong}`}>{job.name}</h3>
                      <span className={`text-xs font-mono ${muted}`}>{job.id}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${sc.bg} ${sc.color} ${
                      job.running ? 'animate-pulse' : ''
                    }`}>
                      {job.running ? `Running — ${job.progressPercent}%` : sc.label}
                    </span>
                  </div>

                  <p className={`text-sm mb-4 leading-relaxed ${muted}`}>{job.description}</p>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: 'Schedule',   value: job.schedule },
                      { label: 'Next Run',   value: countdown(job.nextRunAt), mono: true, accent: !!job.nextRunAt },
                      { label: 'Last Run',   value: fmtTime(job.lastRunAt) },
                      { label: 'Last Size',  value: fmtBytes(job.lastBackupSizeBytes) },
                    ].map(({ label, value, mono, accent }) => (
                      <div key={label} className={`rounded-xl p-3 ${
                        isDark ? 'bg-surface-800' : 'bg-slate-50 border border-slate-100'
                      }`}>
                        <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>{label}</div>
                        <div className={`text-sm font-semibold ${
                          accent ? 'text-brand-400' : strong
                        } ${mono ? 'font-mono' : ''}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status message */}
                  {job.lastRunMessage && (
                    <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
                      job.status === 'FAILED'
                        ? (isDark ? 'bg-red-500/10 text-red-300'     : 'bg-red-50 text-red-700 border border-red-100')
                        : job.status === 'SUCCESS'
                        ? (isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')
                        : (isDark ? 'bg-surface-800 text-surface-400' : 'bg-slate-50 text-slate-500 border border-slate-100')
                    }`}>
                      <span className="font-mono leading-relaxed">{job.lastRunMessage}</span>
                    </div>
                  )}

                  {/* Recent backup files */}
                  {job.recentBackups.length > 0 && (
                    <div className="mt-3">
                      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${muted}`}>
                        Recent Backups
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.recentBackups.map(f => (
                          <span key={f} className={`text-[11px] font-mono px-2 py-1 rounded-lg ${
                            isDark ? 'bg-surface-800 text-surface-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* === Right: Run Now button === */}
                <div className="flex sm:flex-col justify-end sm:justify-start items-center sm:items-stretch gap-2 shrink-0 sm:w-32">
                  <button
                    onClick={() => handleTrigger(job.id)}
                    disabled={job.running || !!triggering}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      job.running || triggering
                        ? (isDark
                            ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow hover:shadow-md active:scale-95'
                    }`}
                  >
                    {job.running || isTriggering ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Running
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        Run Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DevInsightsPage;
