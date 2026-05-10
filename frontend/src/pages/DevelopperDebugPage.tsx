import * as React from 'react';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { useLang } from '../context/LangContext';
import {
  getDevelopperDebugDashboard,
  getDevelopperDebugErrorDetail,
  deleteDevelopperDebugError,
  deleteAllDevelopperDebugErrors,
} from '../lib/api';
import type {
  DebugErrorGroup,
  DevelopperDebugDashboardResponse,
  DevelopperDebugErrorDetailResponse,
} from '../types/api';

const DevelopperDebugPage: React.FC = () => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();
  const isDark = colorScheme === 'dark';

  const [dashboard, setDashboard] = React.useState<DevelopperDebugDashboardResponse | null>(null);
  const [detail, setDetail] = React.useState<DevelopperDebugErrorDetailResponse | null>(null);
  const [selectedFingerprint, setSelectedFingerprint] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [resolvedFingerprints, setResolvedFingerprints] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState(false);

  const handleDeleteOne = React.useCallback(async (fingerprint: string) => {
    setDeleting(true);
    try {
      await deleteDevelopperDebugError(fingerprint);
      if (selectedFingerprint === fingerprint) setSelectedFingerprint('');
      setResolvedFingerprints((prev) => { const next = new Set(prev); next.delete(fingerprint); return next; });
      await loadDashboard();
    } finally {
      setDeleting(false);
    }
  }, [selectedFingerprint]);

  const handleDeleteAll = React.useCallback(async () => {
    setDeleting(true);
    try {
      await deleteAllDevelopperDebugErrors();
      setSelectedFingerprint('');
      setResolvedFingerprints(new Set());
      await loadDashboard();
    } finally {
      setDeleting(false);
    }
  }, []);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDevelopperDebugDashboard(100);
      setDashboard(data);
      if (!selectedFingerprint && data.errors.length > 0) {
        setSelectedFingerprint(data.errors[0].fingerprint);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t.debugDashboardLoadError || 'Failed to load debug dashboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedFingerprint, t.debugDashboardLoadError]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    if (!selectedFingerprint) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setDetailLoading(true);
      try {
        const data = await getDevelopperDebugErrorDetail(selectedFingerprint);
        if (!cancelled) {
          setDetail(data);
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedFingerprint]);

  const visibleErrors = React.useMemo(() => {
    const items = dashboard?.errors || [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => (
      item.exceptionType?.toLowerCase().includes(q)
      || item.errorMessage?.toLowerCase().includes(q)
      || item.methodName?.toLowerCase().includes(q)
      || item.fingerprint?.toLowerCase().includes(q)
    ));
  }, [dashboard, query]);

  const selectedGroup = React.useMemo<DebugErrorGroup | null>(() => {
    return (dashboard?.errors || []).find((item) => item.fingerprint === selectedFingerprint) || null;
  }, [dashboard, selectedFingerprint]);

  return (
    <div className={`p-6 min-h-screen ${isDark ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                {t.debugDashboardTitle || 'Developper Debug Dashboard'}
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                {t.debugDashboardSubtitle || 'Track error counts, inspect context, method names, and full stack traces.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteAll()}
                disabled={visibleErrors.length === 0 || deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.debugDashboardDeleteAll || 'Delete All Errors'}
              </button>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading || deleting}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {t.debugDashboardRefresh || 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title={t.debugDashboardTotalErrors || 'Total Errors'}
            value={dashboard?.totalOccurrences ?? 0}
            isDark={isDark}
          />
          <MetricCard
            title={t.debugDashboardUniqueErrors || 'Unique Error Types'}
            value={dashboard?.uniqueErrors ?? 0}
            isDark={isDark}
          />
          <MetricCard
            title={t.debugDashboardSelectedOccurrences || 'Selected Error Occurrences'}
            value={detail?.occurrences ?? selectedGroup?.occurrences ?? 0}
            isDark={isDark}
          />
        </div>

        {error && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-red-900/20 border-red-900/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className={`xl:col-span-1 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
            <div className={`p-4 border-b ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.debugDashboardSearchPlaceholder || 'Search by exception, method, message, or fingerprint'}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'bg-surface-950 border-surface-700 text-surface-100' : 'bg-white border-surface-200 text-surface-900'}`}
              />
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
              {loading ? (
                <p className={`text-sm px-2 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.loading || 'Loading...'}</p>
              ) : visibleErrors.length === 0 ? (
                <p className={`text-sm px-2 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                  {t.debugDashboardNoErrors || 'No matching errors found.'}
                </p>
              ) : (
                visibleErrors.map((item) => {
                  const selected = item.fingerprint === selectedFingerprint;
                  const isResolved = resolvedFingerprints.has(item.fingerprint);
                  return (
                    <div
                      key={item.fingerprint}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedFingerprint(item.fingerprint)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedFingerprint(item.fingerprint); }}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-colors cursor-pointer ${
                        isResolved
                          ? (isDark ? 'border-green-500 bg-green-900/20' : 'border-green-500 bg-green-50')
                          : selected
                            ? (isDark ? 'border-red-500 bg-red-900/10' : 'border-red-400 bg-red-50/60')
                            : (isDark ? 'border-red-800 hover:bg-surface-800/70' : 'border-red-300 hover:bg-surface-50')
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase truncate ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                          {item.exceptionType || 'Exception'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-surface-800 text-surface-200' : 'bg-surface-100 text-surface-700'}`}>
                            {item.occurrences}x
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResolvedFingerprints((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.fingerprint)) next.delete(item.fingerprint);
                                else next.add(item.fingerprint);
                                return next;
                              });
                            }}
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                              isResolved
                                ? (isDark ? 'bg-green-700 text-green-100 hover:bg-green-800' : 'bg-green-500 text-white hover:bg-green-600')
                                : (isDark ? 'bg-surface-700 text-surface-300 hover:bg-green-900/40 hover:text-green-300' : 'bg-surface-100 text-surface-600 hover:bg-green-100 hover:text-green-700')
                            }`}
                            title={isResolved ? 'Mark as unresolved' : 'Mark as resolved'}
                          >
                            {isResolved ? '✓ Resolved' : 'Resolve'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteOne(item.fingerprint);
                            }}
                            disabled={deleting}
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors disabled:opacity-40 ${isDark ? 'bg-surface-700 text-surface-300 hover:bg-red-900/40 hover:text-red-300' : 'bg-surface-100 text-surface-600 hover:bg-red-100 hover:text-red-600'}`}
                            title="Delete this error"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <p className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                        {item.errorMessage || t.debugDashboardNoMessage || 'No message'}
                      </p>

                      <p className={`text-xs mt-2 break-all ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                        {item.methodName || t.debugDashboardUnknownMethod || 'Unknown method'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className={`xl:col-span-2 rounded-2xl border ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
            <div className={`p-4 border-b ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
              <h2 className={`text-lg font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                {t.debugDashboardErrorDetails || 'Error Details'}
              </h2>
              {selectedGroup && (
                <p className={`text-xs mt-1 break-all ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                  {selectedGroup.fingerprint}
                </p>
              )}
            </div>

            <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
              {!selectedFingerprint ? (
                <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                  {t.debugDashboardSelectError || 'Select an error group to inspect full details.'}
                </p>
              ) : detailLoading ? (
                <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.loading || 'Loading...'}</p>
              ) : !detail || detail.entries.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                  {t.debugDashboardNoEntries || 'No entries found for this fingerprint.'}
                </p>
              ) : (
                detail.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-4 ${isDark ? 'border-surface-800 bg-surface-950/50' : 'border-surface-200 bg-surface-50/70'}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <InfoRow label={t.debugDashboardMethodLabel || 'Method'} value={entry.methodName || '-'} isDark={isDark} />
                      <InfoRow label={t.debugDashboardStatusLabel || 'Status'} value={String(entry.statusCode ?? '-')} isDark={isDark} />
                      <InfoRow label={t.debugDashboardRequestLabel || 'Request'} value={`${entry.requestMethod || '-'} ${entry.requestPath || ''}`.trim()} isDark={isDark} />
                      <InfoRow label={t.debugDashboardOccurredAtLabel || 'Occurred At'} value={new Date(entry.occurredAt).toLocaleString()} isDark={isDark} />
                    </div>

                    <div className="mt-3">
                      <h3 className={`text-xs uppercase tracking-wide font-semibold mb-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                        {t.debugDashboardContextLabel || 'Context'}
                      </h3>
                      <p className={`text-sm whitespace-pre-wrap break-words ${isDark ? 'text-surface-200' : 'text-surface-700'}`}>
                        {entry.context || '-'}
                      </p>
                    </div>

                    <div className="mt-3">
                      <h3 className={`text-xs uppercase tracking-wide font-semibold mb-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                        {t.debugDashboardMessageLabel || 'Error Message'}
                      </h3>
                      <p className={`text-sm whitespace-pre-wrap break-words ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                        {entry.errorMessage || '-'}
                      </p>
                    </div>

                    <div className="mt-3">
                      <h3 className={`text-xs uppercase tracking-wide font-semibold mb-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                        {t.debugDashboardStackTraceLabel || 'Stack Trace'}
                      </h3>
                      <pre className={`text-xs rounded-lg p-3 overflow-x-auto max-h-64 ${isDark ? 'bg-surface-950 text-surface-300' : 'bg-slate-900 text-slate-100'}`}>
                        {entry.stackTrace || '-'}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

type MetricCardProps = {
  title: string;
  value: number;
  isDark: boolean;
};

function MetricCard({ title, value, isDark }: MetricCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
      <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
        {title}
      </p>
      <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>{value}</p>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  isDark: boolean;
};

function InfoRow({ label, value, isDark }: InfoRowProps) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
        {label}
      </p>
      <p className={`text-sm break-words ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>{value}</p>
    </div>
  );
}

export default DevelopperDebugPage;
