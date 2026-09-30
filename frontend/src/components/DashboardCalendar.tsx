import * as React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { usePageAccess } from '../context/PageAccessContext';
import { useAuth } from '../context/AuthContext';
import { getRolePagePath } from '../lib/pageAccess';
import { getWorkOrdersByStatusForKanban, getUrgentWorkOrders, getProjectBoardTasks } from '../lib/api';
import { WorkOrderStatus } from '../types/api';

type EventKind = 'WORK_ORDER' | 'URGENT_WORK_ORDER' | 'PROJECT_BOARD';

interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD (local)
  title: string;
  kind: EventKind;
  priority: string;
  link: string;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateKeyFromIso(iso: string): string {
  // dueDate can be a plain date ('2025-05-21') or a full ISO datetime; either way
  // the first 10 chars are the date portion, which avoids UTC/local shifting.
  return iso.slice(0, 10);
}

function buildMonthGrid(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function priorityDotColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-amber-400';
    default: return 'bg-brand-500';
  }
}

function kindLabel(kind: EventKind, lang: string): string {
  if (kind === 'URGENT_WORK_ORDER') return lang === 'fr' ? 'Urgence' : 'Urgent';
  if (kind === 'PROJECT_BOARD') return lang === 'fr' ? 'Projet' : 'Project';
  return lang === 'fr' ? 'Bon de travail' : 'Work order';
}

/**
 * Role-aware due-date calendar: only fetches the event sources the current
 * user can actually access, so e.g. a REPRESENTANT (no dashboard access at
 * all) or a role without WORK_ORDERS access never sees those due dates.
 */
export default function DashboardCalendar() {
  const { t, lang } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';
  const { canAccess } = usePageAccess();
  const { role } = useAuth();

  const canWorkOrders = canAccess('WORK_ORDERS');
  const canUrgent = canAccess('URGENT_WORK_ORDERS');
  const canProjectBoard = canAccess('PROJECT_BOARD');

  const [events, setEvents] = React.useState<CalEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState<string | null>(dateKey(new Date()));
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results: CalEvent[] = [];
      try {
        if (canWorkOrders) {
          const statuses = [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS];
          const lists = await Promise.all(statuses.map((s) => getWorkOrdersByStatusForKanban(s).catch(() => [])));
          lists.flat().forEach((wo) => {
            if (!wo.dueDate) return;
            results.push({
              id: `wo-${wo.id}`,
              date: toDateKeyFromIso(wo.dueDate),
              title: wo.title,
              kind: 'WORK_ORDER',
              priority: wo.priority,
              link: `${getRolePagePath(role, 'WORK_ORDERS')}/${wo.id}`,
            });
          });
        }
        if (canUrgent) {
          const list = await getUrgentWorkOrders().catch(() => []);
          list
            .filter((wo) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED')
            .forEach((wo) => {
              if (!wo.dueDate) return;
              results.push({
                id: `uwo-${wo.id}`,
                date: toDateKeyFromIso(wo.dueDate),
                title: wo.title,
                kind: 'URGENT_WORK_ORDER',
                priority: wo.priority,
                link: `${getRolePagePath(role, 'URGENT_WORK_ORDERS')}/${wo.id}`,
              });
            });
        }
        if (canProjectBoard) {
          const list = await getProjectBoardTasks().catch(() => []);
          list
            .filter((task) => task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
            .forEach((task) => {
              if (!task.dueDate) return;
              results.push({
                id: `pb-${task.id}`,
                date: toDateKeyFromIso(task.dueDate),
                title: task.title,
                kind: 'PROJECT_BOARD',
                priority: task.priority,
                link: getRolePagePath(role, 'PROJECT_BOARD'),
              });
            });
        }
      } finally {
        if (!cancelled) {
          setEvents(results);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [canWorkOrders, canUrgent, canProjectBoard, role]);

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((e) => {
      (map[e.date] ||= []).push(e);
    });
    return map;
  }, [events]);

  // Nothing at all to show a calendar for (no relevant page access) — hide the widget.
  if (!canWorkOrders && !canUrgent && !canProjectBoard) {
    return null;
  }

  const monthFormatter = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-US', { month: 'long', year: 'numeric' });
  const weekdayLabels = lang === 'fr'
    ? ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const goToPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];
  const todayKey = dateKey(new Date());

  const renderGrid = (large: boolean) => {
    const cells = buildMonthGrid(viewDate);
    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayLabels.map((w, i) => (
            <div key={i} className={`text-center text-[11px] font-semibold uppercase ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className={large ? 'h-16' : 'h-8'} />;
            const key = dateKey(d);
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(key);
                  if (!expanded) setExpanded(true);
                }}
                className={`relative rounded-lg flex flex-col items-center justify-center transition-colors ${large ? 'h-16' : 'h-8'} ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : isToday
                      ? (isDark ? 'bg-brand-900/40 text-brand-300' : 'bg-brand-50 text-brand-700')
                      : (isDark ? 'text-surface-300 hover:bg-surface-800' : 'text-surface-700 hover:bg-surface-100')
                }`}
              >
                <span className={large ? 'text-sm font-medium' : 'text-xs'}>{d.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`inline-block rounded-full ${large ? 'w-1.5 h-1.5' : 'w-1 h-1'} ${isSelected ? 'bg-white' : priorityDotColor(ev.priority)}`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailPanel = () => (
    <div className={`rounded-lg border p-3 ${isDark ? 'border-surface-700 bg-surface-900' : 'border-surface-200 bg-surface-50'}`}>
      <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-surface-100' : 'text-surface-800'}`}>
        {selectedDate
          ? new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(selectedDate + 'T00:00:00'))
          : (lang === 'fr' ? 'Sélectionnez une date' : 'Select a date')}
      </h4>
      {selectedEvents.length === 0 ? (
        <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
          {lang === 'fr' ? 'Rien à faire ce jour-là.' : 'Nothing due that day.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {selectedEvents.map((ev) => (
            <li key={ev.id}>
              <Link
                to={ev.link}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'hover:bg-surface-800' : 'hover:bg-white'}`}
              >
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${priorityDotColor(ev.priority)}`} />
                <span className={`flex-1 truncate ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>{ev.title}</span>
                <span className={`text-[11px] flex-shrink-0 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{kindLabel(ev.kind, lang)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPrevMonth(); }} className={`p-1 rounded ${isDark ? 'hover:bg-surface-700 text-surface-300' : 'hover:bg-surface-100 text-surface-600'}`} aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h3 className={`text-sm font-bold capitalize ${isDark ? 'text-surface-100' : 'text-slate-800'}`}>{monthFormatter.format(viewDate)}</h3>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToNextMonth(); }} className={`p-1 rounded ${isDark ? 'hover:bg-surface-700 text-surface-300' : 'hover:bg-surface-100 text-surface-600'}`} aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`p-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-surface-400 hover:bg-surface-700 hover:text-surface-100' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'}`}
            aria-label={lang === 'fr' ? 'Agrandir le calendrier' : 'Expand calendar'}
            title={lang === 'fr' ? 'Agrandir' : 'Expand'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
        </div>
        {loading ? (
          <div className={`text-sm text-center py-6 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.dashboardLoading}</div>
        ) : (
          renderGrid(false)
        )}
      </div>

      {expanded && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto border ${isDark ? 'bg-surface-900 text-surface-100 border-surface-700' : 'bg-white text-surface-900 border-surface-200'}`}
          >
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${isDark ? 'bg-surface-900/95 border-surface-800' : 'bg-white/95 border-surface-200'}`}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goToPrevMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-surface-800 text-surface-300' : 'hover:bg-surface-100 text-surface-600'}`} aria-label="Previous month">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h2 className="text-lg font-bold capitalize">{monthFormatter.format(viewDate)}</h2>
                <button type="button" onClick={goToNextMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-surface-800 text-surface-300' : 'hover:bg-surface-100 text-surface-600'}`} aria-label="Next month">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'}`} onClick={() => setExpanded(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderGrid(true)}
              {renderDetailPanel()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
