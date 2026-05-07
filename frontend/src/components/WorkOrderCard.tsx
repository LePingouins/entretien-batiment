import * as React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderResponse } from '../types/api';
import { MaterialsButton } from './MaterialsButton';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { SecureImage } from './SecureImage';
import { openSecureFile } from '../lib/secureFile';

// Dark mode color mappings for status badges
const statusColorsDark: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25',
  ASSIGNED: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  CANCELLED: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25',
};

const statusColorsLight: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

// Dark mode color mappings for priority badges
const priorityColorsDark: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/25',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25',
  HIGH: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25',
  URGENT: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25',
};

const priorityColorsLight: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  MEDIUM: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  URGENT: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const statusLabels = {
    OPEN: t.statusOpen,
    ASSIGNED: t.statusAssigned,
    IN_PROGRESS: t.statusInProgress,
    COMPLETED: t.statusCompleted,
    CANCELLED: t.statusCancelled,
  };
  const colors = colorScheme === 'dark' ? statusColorsDark : statusColorsLight;
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}>{statusLabels[status]}</span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const priorityLabels = {
    LOW: t.priorityLow,
    MEDIUM: t.priorityMedium,
    HIGH: t.priorityHigh,
    URGENT: t.priorityUrgent,
  };
  const colors = colorScheme === 'dark' ? priorityColorsDark : priorityColorsLight;
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[priority]}`}>{priorityLabels[priority]}</span>
  );
}

interface WorkOrderCardComponentProps {
  workOrder: WorkOrderResponse;
  onOpenMaterials?: (workOrder: WorkOrderResponse) => void;
  onDeleted?: (id: number) => void;
  onArchived?: (id: number) => void;
}

const WorkOrderCardComponent = ({ workOrder, onOpenMaterials, onDeleted, onArchived }: WorkOrderCardComponentProps) => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();
  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  const attachmentUrl = workOrder.attachmentDownloadUrl
    ? workOrder.attachmentDownloadUrl
    : undefined;

  // Card styles based on color scheme
  const cardClass = colorScheme === 'dark'
    ? 'rounded-xl bg-surface-800 p-4 flex flex-col gap-2.5 border border-surface-700 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg cursor-pointer w-full overflow-hidden'
    : 'rounded-xl bg-white p-4 flex flex-col gap-2.5 border border-surface-200 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-surface-300 cursor-pointer w-full overflow-hidden';

  const cardShadow = undefined;

  const formatUserName = (rawName?: string | null, fallbackId?: number | null) => {
    if (rawName && rawName.trim()) {
      const base = rawName.includes('@') ? rawName.split('@')[0] : rawName;
      return base
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (fallbackId) {
      return `${t.user} #${fallbackId}`;
    }

    return t.unassigned;
  };

  const assigneeName = workOrder.assignedToUserId
    ? formatUserName(workOrder.assignedToName, workOrder.assignedToUserId)
    : t.unassigned;
  const creatorName = formatUserName(workOrder.createdByName, workOrder.createdByUserId);

  return (
    <div
      className={cardClass}
      style={cardShadow ? { boxShadow: cardShadow } : undefined}
      tabIndex={0}
      role="group"
      aria-label={`Work order ${workOrder.title}`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-center gap-2 mb-1">
            <span className={`text-xs font-mono ${colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'}`}>#{workOrder.id}</span>
            <StatusBadge status={workOrder.status} />
          </div>
          <Link to={`./${workOrder.id}`} tabIndex={0} aria-label={`View details for ${workOrder.title}`}>
            <h3 className={`font-semibold text-sm sm:text-base truncate ${colorScheme === 'dark' ? 'text-surface-100 hover:text-white' : 'text-surface-900 hover:text-brand-700'}`}>
              {workOrder.title}
            </h3>
          </Link>
        </div>
        <div className="mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto flex justify-start sm:justify-end">
          <PriorityBadge priority={workOrder.priority} />
        </div>
      </div>
      <p className={`text-sm line-clamp-2 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>{workOrder.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className={`flex items-center gap-1.5 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="opacity-60"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {workOrder.dueDate?.slice(0, 10) || 'No date'}
        </span>
        <span className={`flex items-center gap-1.5 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="opacity-60"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {workOrder.location || 'N/A'}
        </span>
      </div>

      {/* Attachment preview or download */}
      {attachmentUrl && (
        <div className="mb-2">
          {isImage ? (
            <button
              type="button"
              onClick={() => openSecureFile(attachmentUrl)}
              className="block w-full text-left"
            >
              <SecureImage
                src={attachmentUrl}
                alt={workOrder.attachmentFilename || 'Attachment'}
                className={`max-h-32 rounded shadow mb-1 max-w-full object-contain ${
                  colorScheme === 'dark' ? 'border border-surface-700' : 'border'
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openSecureFile(attachmentUrl)}
              className={`underline text-xs ${
                colorScheme === 'dark' ? 'text-brand-400' : 'text-blue-700'
              }`}
            >
              {workOrder.attachmentFilename || 'Download attachment'}
            </button>
          )}
        </div>
      )}

      <div className={`flex items-center gap-2 pt-2 mt-1 border-t ${colorScheme === 'dark' ? 'border-surface-700' : 'border-surface-100'}`}>
        <div className="flex items-center -space-x-1.5">
          <span
            className={`w-6 h-6 rounded-full ring-2 inline-flex items-center justify-center ${colorScheme === 'dark' ? 'ring-surface-800 bg-surface-700 text-surface-300' : 'ring-white bg-surface-100 text-surface-500'}`}
            title={`${t.assignedTechnician}: ${assigneeName}`}
            aria-label={`${t.assignedTechnician}: ${assigneeName}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20a6 6 0 00-12 0" />
              <circle cx="12" cy="9" r="3" />
            </svg>
          </span>
          <span
            className={`w-6 h-6 rounded-full ring-2 inline-flex items-center justify-center ${colorScheme === 'dark' ? 'ring-surface-800 bg-surface-700 text-surface-300' : 'ring-white bg-surface-100 text-surface-500'}`}
            title={`${t.createdBy}: ${creatorName}`}
            aria-label={`${t.createdBy}: ${creatorName}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20a6 6 0 00-12 0" />
              <circle cx="12" cy="9" r="3" />
            </svg>
          </span>
        </div>
        <div className="flex-1" />
        <span className="flex gap-1">
          {/* Archive Button */}
          <button
            title="Archive"
            className={`p-1.5 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-500 hover:text-amber-400 hover:bg-surface-700' : 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'}`}
            onClick={async e => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to archive this work order?')) {
                try {
                  const { archiveWorkOrder } = await import('../lib/api');
                  await archiveWorkOrder(workOrder.id);
                  if (onArchived) onArchived(workOrder.id);
                  else window.location.reload();
                } catch {
                 alert('Failed to archive work order');
                }
              }
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
          
          <button
            title="Edit"
            className={`p-1.5 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-500 hover:text-brand-400 hover:bg-surface-700' : 'text-surface-400 hover:text-brand-600 hover:bg-brand-50'}`}
            onClick={e => {
              e.stopPropagation();
              // Open edit modal by simulating card click
              const click = new MouseEvent('click', { bubbles: true });
              (e.currentTarget.closest('[role="group"]') as HTMLElement)?.dispatchEvent(click);
            }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-10 10A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l10-10a2 2 0 012.828 0z"/></svg>
          </button>
          <button
            title="Delete"
            className={`p-1.5 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-500 hover:text-red-400 hover:bg-surface-700' : 'text-surface-400 hover:text-red-600 hover:bg-red-50'}`}
            onClick={async e => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this work order?')) {
                try {
                  const api = (await import('../lib/api')).default;
                  await api.delete(`/api/admin/work-orders/${workOrder.id}`);
                  try {
                    // notification removed
                  } catch (err) {
                    // ignore notification errors
                  }
                  if (onDeleted) onDeleted(workOrder.id);
                  else window.location.reload();
                } catch {
                  alert('Failed to delete work order');
                }
              }
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 6v10H4V8h12z"/></svg>
          </button>
        </span>
      </div>
      <div className="mt-2 flex justify-center">
        <MaterialsButton
          count={workOrder.materialsCount || 0}
          preview={workOrder.materialsPreview || []}
          onClick={e => onOpenMaterials?.(workOrder)}
          colorScheme={colorScheme}
        />
      </div>
    </div>
  );
}

export const WorkOrderCard = React.memo(WorkOrderCardComponent);
