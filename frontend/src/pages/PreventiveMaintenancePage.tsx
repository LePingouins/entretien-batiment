import React, { useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { useLang } from '../context/LangContext';
import { getPreventiveTasks, completePreventiveTask, uncompletePreventiveTask } from '../lib/api';
import { PreventiveTaskResponse, TaskSite } from '../types/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SITE_OPTIONS: Array<{ value: TaskSite; label: string; subtitle?: string }> = [
  { value: 'INEWA', label: 'INEWA' },
  { value: 'HORIZON_NATURE', label: 'DHN', subtitle: 'Horizon Nature' },
];

const SITE_LABELS: Record<TaskSite, string> = {
  INEWA: 'INEWA',
  HORIZON_NATURE: 'DHN',
};

function frequencyLabel(freq: string, t: Record<string, string>): string {
  switch (freq) {
    case 'DAILY':       return t.preventiveFreqDaily;
    case 'WEEKLY':      return t.preventiveFreqWeekly;
    case 'MONTHLY':     return t.preventiveFreqMonthly;
    case 'QUARTERLY':   return t.preventiveFreqQuarterly || 'Tous les 3 mois';
    case 'SEMI_ANNUAL': return t.preventiveFreqSemiAnnual;
    case 'YEARLY':      return t.preventiveFreqYearly;
    default:            return freq;
  }
}

function frequencyBadgeColor(freq: string): string {
  switch (freq) {
    case 'DAILY':       return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'WEEKLY':      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'MONTHLY':     return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'QUARTERLY':   return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'SEMI_ANNUAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'YEARLY':      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    default:            return 'bg-gray-100 text-gray-600';
  }
}

/** Returns a human-friendly "due again in X" string */
function dueAgainIn(lastCompletedAt: string | undefined, freq: string, t: Record<string, string>): string | null {
  if (!lastCompletedAt) return null;
  const periodDays: Record<string, number> = {
    DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90, SEMI_ANNUAL: 183, YEARLY: 365,
  };
  const period = periodDays[freq];
  if (!period) return null;
  const completedMs = new Date(lastCompletedAt).getTime();
  const dueMs = completedMs + period * 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((dueMs - Date.now()) / (24 * 60 * 60 * 1000));
  const dueDate = new Date(dueMs);
  const dueLabel = dueDate.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (diffDays === 0) {
    return `${t.preventiveDueAgainIn} ${dueLabel} (aujourd'hui)`;
  }
  if (diffDays < 0) {
    return `${t.preventiveDueAgainIn} ${dueLabel} (en retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''})`;
  }
  return `${t.preventiveDueAgainIn} ${dueLabel} (dans ${diffDays} jour${diffDays > 1 ? 's' : ''})`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TaskCardProps {
  task: PreventiveTaskResponse;
  isDark: boolean;
  t: Record<string, string>;
  onComplete: (id: number) => void;
  onUndo: (taskId: number, completionId: number) => void;
  completing: boolean;
  undoing: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDark, t, onComplete, onUndo, completing, undoing }) => {
  const isDue = task.isDue;

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-xl p-3.5 border transition-all duration-200 ${
        isDue
          ? isDark
            ? 'bg-surface-800 border-surface-700 hover:border-surface-500'
            : 'bg-white border-gray-200 hover:border-brand-300 hover:shadow-sm'
          : isDark
            ? 'bg-surface-900 border-surface-700/50 opacity-75 hover:opacity-90'
            : 'bg-gray-50 border-gray-200 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Completion toggle button */}
      <button
        disabled={completing || undoing}
        onClick={() =>
          isDue
            ? onComplete(task.id)
            : task.lastCompletionId != null && onUndo(task.id, task.lastCompletionId)
        }
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          isDue
            ? isDark
              ? 'border-surface-500 hover:border-brand-400 hover:bg-brand-900/30'
              : 'border-gray-300 hover:border-brand-500 hover:bg-brand-50'
            : 'bg-emerald-500 border-emerald-500 text-white hover:bg-red-400 hover:border-red-400'
        } ${completing || undoing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isDue ? t.preventiveMarkDone : t.preventiveUndo}
        aria-label={isDue ? t.preventiveMarkDone : t.preventiveUndo}
      >
        {!isDue && (
          <svg className="w-3.5 h-3.5 group-hover:hidden block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {!isDue && (
          <svg className="w-3 h-3 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span
            className={`text-sm font-medium leading-snug ${
              isDue
                ? isDark ? 'text-surface-100' : 'text-gray-800'
                : isDark ? 'text-surface-400 line-through' : 'text-gray-400 line-through'
            }`}
          >
            <span className={`inline-block mr-1.5 text-xs font-normal tabular-nums ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>
              #{task.displayOrder}
            </span>
            {task.name}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${frequencyBadgeColor(task.frequency)}`}>
            {frequencyLabel(task.frequency, t)}
          </span>
        </div>

        {/* Completion info */}
        {!isDue && task.lastCompletedAt && (
          <p className={`mt-1 text-xs ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>
            {t.preventiveCompletedOn} {formatDate(task.lastCompletedAt)}
            {task.lastCompletedByEmail && ` · ${t.preventiveBy} ${task.lastCompletedByEmail}`}
            {dueAgainIn(task.lastCompletedAt, task.frequency, t) && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-gray-100 text-gray-500'}`}>
                {dueAgainIn(task.lastCompletedAt, task.frequency, t)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PreventiveMaintenancePage: React.FC = () => {
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';
  const { t } = useLang();
  const queryClient = useQueryClient();

  const [selectedSite, setSelectedSite] = React.useState<TaskSite>('INEWA');
  const [completingId, setCompletingId] = React.useState<number | null>(null);
  const [undoingId, setUndoingId] = React.useState<number | null>(null);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['preventive-tasks'],
    queryFn: getPreventiveTasks,
    staleTime: 30_000,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: number) => completePreventiveTask(taskId),
    onMutate: (taskId) => setCompletingId(taskId),
    onSuccess: (updated) => {
      queryClient.setQueryData<PreventiveTaskResponse[]>(['preventive-tasks'], (old = []) =>
        old.map((t) => (t.id === updated.id ? updated : t))
      );
    },
    onSettled: () => setCompletingId(null),
  });

  const undoMutation = useMutation({
    mutationFn: ({ taskId, completionId }: { taskId: number; completionId: number }) =>
      uncompletePreventiveTask(taskId, completionId),
    onMutate: ({ taskId }) => setUndoingId(taskId),
    onSuccess: (_data, { taskId }) => {
      queryClient.setQueryData<PreventiveTaskResponse[]>(['preventive-tasks'], (old = []) =>
        old.map((t) =>
          t.id === taskId
            ? { ...t, isDue: true, lastCompletedAt: undefined, lastCompletionId: undefined, lastCompletedByEmail: undefined }
            : t
        )
      );
    },
    onSettled: () => setUndoingId(null),
  });

  const handleComplete = (taskId: number) => completeMutation.mutate(taskId);
  const handleUndo = (taskId: number, completionId: number) => undoMutation.mutate({ taskId, completionId });

  const selectedSiteTasks = useMemo(
    () => tasks
      .filter((task) => task.site === selectedSite)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [tasks, selectedSite]
  );

  // Split selected site tasks into to-do and done
  const { todoTasks, doneTasks, totalTodo, totalDone } = useMemo(() => {
    const todoTasks: PreventiveTaskResponse[] = [];
    const doneTasks: PreventiveTaskResponse[] = [];
    for (const task of selectedSiteTasks) {
      if (task.isDue) todoTasks.push(task);
      else doneTasks.push(task);
    }
    return {
      todoTasks,
      doneTasks,
      totalTodo: todoTasks.length,
      totalDone: doneTasks.length,
    };
  }, [selectedSiteTasks]);

  const selectedSiteLabel = SITE_LABELS[selectedSite];
  const selectedTotal = selectedSiteTasks.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  const colBase = `rounded-2xl border flex-1 min-w-0 overflow-hidden ${
    isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-gray-200 shadow-sm'
  }`;

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 ${isDark ? 'bg-surface-950' : 'bg-slate-100'}`}>
      {/* Page header */}
      <div className="mb-6 text-center">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t.preventiveTitle}
        </h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-surface-400' : 'text-gray-500'}`}>
          Suivi de l'entretien préventif des équipements · {selectedTotal} tâche{selectedTotal !== 1 ? 's' : ''} pour {selectedSiteLabel}
        </p>
      </div>

      <div className={`mb-5 flex flex-wrap gap-2 rounded-2xl p-2 border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        {SITE_OPTIONS.map((site) => {
          const active = selectedSite === site.value;
          const count = tasks.filter((task) => task.site === site.value).length;
          return (
            <button
              key={site.value}
              type="button"
              onClick={() => setSelectedSite(site.value)}
              className={`flex min-w-[160px] flex-1 items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                active
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : isDark
                    ? 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>
                <span className="block text-sm font-semibold tracking-wide">{site.label}</span>
                {site.subtitle && <span className={`block text-xs ${active ? 'text-white/80' : isDark ? 'text-surface-500' : 'text-slate-500'}`}>{site.subtitle}</span>}
              </span>
              <span className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-white/20' : isDark ? 'bg-surface-700 text-surface-300' : 'bg-white text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isError && (
        <div className={`rounded-xl p-4 text-sm text-red-600 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
          Erreur lors du chargement des tâches.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          <div className={colBase}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-surface-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t.preventiveTodo}
                </h2>
              </div>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                totalTodo > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : isDark ? 'bg-surface-800 text-surface-400' : 'bg-gray-100 text-gray-500'
              }`}>
                {totalTodo}
              </span>
            </div>
            <div className="p-5">
              {totalTodo === 0 ? (
                <div className={`text-center py-10 text-sm ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>
                  <div className="text-3xl mb-2">✅</div>
                  Aucune tâche à faire pour {selectedSiteLabel}.
                </div>
              ) : (
                todoTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDark={isDark}
                    t={t as Record<string, string>}
                    onComplete={handleComplete}
                    onUndo={handleUndo}
                    completing={completingId === task.id}
                    undoing={undoingId === task.id}
                  />
                ))
              )}
            </div>
          </div>

          <div className={colBase}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-surface-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t.preventiveDone}
                </h2>
              </div>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                totalDone > 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isDark ? 'bg-surface-800 text-surface-400' : 'bg-gray-100 text-gray-500'
              }`}>
                {totalDone}
              </span>
            </div>
            <div className="p-5">
              {totalDone === 0 ? (
                <div className={`text-center py-10 text-sm ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>
                  <div className="text-3xl mb-2">📋</div>
                  Aucune tâche complétée pour {selectedSiteLabel}.
                </div>
              ) : (
                doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDark={isDark}
                    t={t as Record<string, string>}
                    onComplete={handleComplete}
                    onUndo={handleUndo}
                    completing={completingId === task.id}
                    undoing={undoingId === task.id}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PreventiveMaintenancePage;
