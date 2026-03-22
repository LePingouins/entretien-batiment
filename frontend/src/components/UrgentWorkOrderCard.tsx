

import * as React from 'react';
import { Link } from 'react-router-dom';
import { UrgentWorkOrderResponse, WorkOrderPriority, UrgentWorkOrderStatus } from '../types/api';
import { MaterialsButton } from './MaterialsButton';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { PriorityBadge } from './WorkOrderCard';
import { useLang } from '../context/LangContext';

interface UrgentWorkOrderCardProps {
  workOrder: UrgentWorkOrderResponse;
  colorScheme?: string;
  onEdit?: (workOrder: UrgentWorkOrderResponse) => void;
  onDelete?: (id: number) => void;
  onArchive?: (id: number) => void;
}

const statusColorsDark: Record<UrgentWorkOrderStatus, string> = {
  OPEN: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25',
  ASSIGNED: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  CANCELLED: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25',
};
const statusColorsLight: Record<UrgentWorkOrderStatus, string> = {
  OPEN: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};


export const UrgentWorkOrderCard: React.FC<UrgentWorkOrderCardProps> = ({ workOrder, colorScheme = 'default', onEdit, onDelete, onArchive }) => {
  const { colorScheme: effectiveColorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();
  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  const attachmentUrl = workOrder.attachmentDownloadUrl || (workOrder.attachmentFilename ? `/api/files/workorders/${workOrder.attachmentFilename}` : undefined);

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

  // Match AdminWorkOrdersPage card style exactly
  const cardClass = effectiveColorScheme === 'dark'
    ? 'rounded-xl bg-surface-800 p-4 flex flex-col gap-2.5 border border-surface-700 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg cursor-pointer w-full overflow-hidden'
    : 'rounded-xl bg-white p-4 flex flex-col gap-2.5 border border-surface-200 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-surface-300 cursor-pointer w-full overflow-hidden';

  const cardShadow = undefined;

  return (
    <div
      className={cardClass}
      style={cardShadow ? { boxShadow: cardShadow } : undefined}
      tabIndex={0}
      role="group"
      aria-label={`Urgent work order ${workOrder.title}`}
      onClick={(e) => {
        if (
          !(e.target instanceof HTMLAnchorElement) &&
          !(e.target instanceof HTMLButtonElement) &&
          !(e.target instanceof HTMLImageElement) &&
          !(e.target as HTMLElement).closest('a') &&
          !(e.target as HTMLElement).closest('button')
        ) {
          onEdit?.(workOrder);
        }
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-center gap-2 mb-1">
            <span className={`text-xs font-mono ${effectiveColorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'}`}>#{workOrder.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${effectiveColorScheme === 'dark' ? statusColorsDark[workOrder.status] : statusColorsLight[workOrder.status]}`}>{workOrder.status.replace('_',' ')}</span>
          </div>
          <Link
            to={`./${workOrder.id}`}
            className={`font-semibold text-sm sm:text-base truncate block ${effectiveColorScheme === 'dark' ? 'text-surface-100 hover:text-white' : 'text-surface-900 hover:text-brand-700'}`}
            onClick={(e) => e.stopPropagation()}
            title={workOrder.title}
          >{workOrder.title}</Link>
        </div>
      </div>
      <p className={`text-sm line-clamp-2 ${effectiveColorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>{workOrder.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className={`flex items-center gap-1.5 ${effectiveColorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="opacity-60"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {workOrder.dueDate && typeof workOrder.dueDate === 'string' && workOrder.dueDate.trim() !== '' ? workOrder.dueDate.slice(0, 10) : 'No date'}
        </span>
        <span className={`flex items-center gap-1.5 ${effectiveColorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="opacity-60"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {workOrder.location || 'N/A'}
        </span>
      </div>
      {attachmentUrl && (
        <div className="mb-2" style={{ minHeight: isImage ? 32 : undefined }}>
          {isImage ? (
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={attachmentUrl}
                alt={workOrder.attachmentFilename || 'Attachment'}
                className={`max-h-32 rounded shadow-sm mb-1 ${colorScheme === 'dark' ? 'border border-surface-700' : 'border border-surface-200'}`}
                style={{ maxWidth: '100%', objectFit: 'contain' }}
                loading="eager"
                decoding="sync"
              />
            </a>
          ) : (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline text-xs ${colorScheme === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}
              download={workOrder.attachmentFilename}
            >
              {workOrder.attachmentFilename || 'Download attachment'}
            </a>
          )}
        </div>
      )}
      <div className={`flex items-center gap-2 pt-2 mt-1 border-t ${effectiveColorScheme === 'dark' ? 'border-surface-700' : 'border-surface-100'}`}>
        <div className="flex items-center -space-x-1.5">
          <span
            className={`w-6 h-6 rounded-full ring-2 inline-flex items-center justify-center ${effectiveColorScheme === 'dark' ? 'ring-surface-800 bg-surface-700 text-surface-300' : 'ring-white bg-surface-100 text-surface-500'}`}
            title={`${t.assignedTechnician}: ${assigneeName}`}
            aria-label={`${t.assignedTechnician}: ${assigneeName}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20a6 6 0 00-12 0" />
              <circle cx="12" cy="9" r="3" />
            </svg>
          </span>
          <span
            className={`w-6 h-6 rounded-full ring-2 inline-flex items-center justify-center ${effectiveColorScheme === 'dark' ? 'ring-surface-800 bg-surface-700 text-surface-300' : 'ring-white bg-surface-100 text-surface-500'}`}
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
          <button
            title="Archive"
            className={`p-1.5 rounded-lg transition-colors ${effectiveColorScheme === 'dark' ? 'text-surface-500 hover:text-amber-400 hover:bg-surface-700' : 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'}`}
            onClick={e => {
              e.stopPropagation();
              onArchive?.(workOrder.id);
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
          <button
            title="Edit"
            className={`p-1.5 rounded-lg transition-colors ${effectiveColorScheme === 'dark' ? 'text-surface-500 hover:text-brand-400 hover:bg-surface-700' : 'text-surface-400 hover:text-brand-600 hover:bg-brand-50'}`}
            onClick={e => {
              e.stopPropagation();
              onEdit?.(workOrder);
            }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-10 10A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l10-10a2 2 0 012.828 0z"/></svg>
          </button>
          <button
            title="Delete"
            className={`p-1.5 rounded-lg transition-colors ${effectiveColorScheme === 'dark' ? 'text-surface-500 hover:text-red-400 hover:bg-surface-700' : 'text-surface-400 hover:text-red-600 hover:bg-red-50'}`}
            onClick={e => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this urgent work order?')) {
                onDelete?.(workOrder.id);
              }
            }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 6v10H4V8h12z"/></svg>
          </button>
        </span>
      </div>
      <div className="mt-2 flex justify-center">
        <MaterialsButton
          count={workOrder.materialsCount || 0}
          preview={workOrder.materialsPreview || []}
          onClick={e => {
            e.stopPropagation();
            if (typeof window !== 'undefined' && window.openMaterialsDrawer) {
              window.openMaterialsDrawer(workOrder);
            }
          }}
          colorScheme={colorScheme}
        />
      </div>
    </div>
  );
};