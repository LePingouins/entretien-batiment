

import * as React from 'react';
import { UrgentWorkOrderResponse, WorkOrderPriority, UrgentWorkOrderStatus } from '../types/api';
import { MaterialsButton } from './MaterialsButton';

interface UrgentWorkOrderCardProps {
  workOrder: UrgentWorkOrderResponse;
  colorScheme?: string;
  onEdit?: (workOrder: UrgentWorkOrderResponse) => void;
  onDelete?: (id: number) => void;
}

const statusColorsDark: Record<UrgentWorkOrderStatus, string> = {
  OPEN: 'bg-teal-600/30 text-teal-300 border border-teal-500/30',
  ASSIGNED: 'bg-blue-600/30 text-blue-300 border border-blue-500/30',
  IN_PROGRESS: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30',
  COMPLETED: 'bg-green-600/30 text-green-300 border border-green-500/30',
  CANCELLED: 'bg-red-600/30 text-red-300 border border-red-500/30',
};
const statusColorsLight: Record<UrgentWorkOrderStatus, string> = {
  OPEN: 'bg-teal-500 text-white',
  ASSIGNED: 'bg-blue-200 text-blue-800',
  IN_PROGRESS: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const priorityColorsDark: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-600/30 text-green-300 border border-green-500/30',
  MEDIUM: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30',
  HIGH: 'bg-orange-600/30 text-orange-300 border border-orange-500/30',
  URGENT: 'bg-red-600/30 text-red-300 border border-red-500/30',
};
const priorityColorsLight: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export const UrgentWorkOrderCard: React.FC<UrgentWorkOrderCardProps> = ({ workOrder, colorScheme = 'default', onEdit, onDelete }) => {
  const avatarUrl = (userId: number) => `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  const attachmentUrl = workOrder.attachmentDownloadUrl || (workOrder.attachmentFilename ? `/uploads/urgentworkorders/${workOrder.attachmentFilename}` : undefined);

  const cardClass = colorScheme === 'dark'
    ? 'rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl bg-[#252d3d] p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 border border-[#2d3748] transition-transform duration-200 hover:scale-[1.02] sm:hover:scale-105 hover:border-[#3b82f6] cursor-pointer w-full overflow-hidden'
    : 'rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl bg-gradient-to-br from-white/70 to-blue-100/60 p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 border border-blue-200 backdrop-blur-md transition-transform duration-200 hover:scale-[1.02] sm:hover:scale-105 hover:shadow-blue-400/40 hover:bg-white/80 cursor-pointer w-full overflow-hidden';

  const cardShadow = colorScheme === 'dark'
    ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
    : '0 8px 32px 0 rgba(31, 38, 135, 0.18)';

  return (
    <div
      className={cardClass}
      style={{ boxShadow: cardShadow }}
      tabIndex={0}
      role="group"
      aria-label={`Urgent work order ${workOrder.title}`}
      onClick={() => onEdit?.(workOrder)}
    >
      <div className="flex justify-between items-start sm:items-center mb-1 sm:mb-2 gap-2 flex-wrap">
        <h3 className={`font-bold text-sm sm:text-lg truncate flex items-center gap-1 sm:gap-2 max-w-[70%] ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : ''}`}>{workOrder.title}</h3>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${colorScheme === 'dark' ? statusColorsDark[workOrder.status] : statusColorsLight[workOrder.status]}`}>{workOrder.status}</span>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-1 sm:mb-2">
        <span className={`text-xs flex items-center gap-1 font-semibold ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-700'}`}>Due: {workOrder.dueDate ? workOrder.dueDate.slice(0, 10) : '-'}</span>
      </div>
      <div className={`text-sm line-clamp-2 mb-2 transition-all duration-200 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-800'}`}>{workOrder.description}</div>
      <div className={`text-xs flex items-center gap-1 mb-2 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-700'}`}> 
        <svg width="14" height="14" fill="currentColor" className={colorScheme === 'dark' ? 'text-[#4ade80]' : 'text-green-400'} viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6c0 4.418-6 10-6 10S4 12.418 4 8a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
        Location: {workOrder.location}
      </div>
      {attachmentUrl && (
        <div className="mb-2" style={{ minHeight: isImage ? 32 : undefined }}>
          {isImage ? (
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={attachmentUrl}
                alt={workOrder.attachmentFilename || 'Attachment'}
                className={`max-h-32 rounded shadow mb-1 ${colorScheme === 'dark' ? 'border border-[#2d3748]' : 'border'}`}
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
              className={`underline text-xs ${colorScheme === 'dark' ? 'text-[#60a5fa]' : 'text-blue-700'}`}
              download={workOrder.attachmentFilename}
            >
              {workOrder.attachmentFilename || 'Download attachment'}
            </a>
          )}
        </div>
      )}
      <div className="flex gap-3 mt-2 items-center">
        <div className="flex items-center gap-2">
          <img
            src={avatarUrl(workOrder.assignedToUserId || 0)}
            alt="Assignee avatar"
            className={`w-8 h-8 rounded-full shadow-lg transition-transform duration-200 hover:scale-110 ${colorScheme === 'dark' ? 'border-2 border-[#2d3748]' : 'border-2 border-white'}`}
            title="Assignee"
            tabIndex={0}
          />
          <img
            src={avatarUrl(workOrder.createdByUserId)}
            alt="Creator avatar"
            className={`w-8 h-8 rounded-full shadow-lg transition-transform duration-200 hover:scale-110 ${colorScheme === 'dark' ? 'border-2 border-[#2d3748]' : 'border-2 border-white'}`}
            title="Creator"
            tabIndex={0}
          />
        </div>
        <div className="flex-1" />
        <span className="flex gap-2">
          <button
            title="Edit"
            className={`p-2 rounded-full transition-colors duration-200 ${colorScheme === 'dark' ? 'bg-[#1a1f2e] hover:bg-[#374151] text-[#60a5fa]' : 'bg-blue-100 hover:bg-blue-200'}`}
            onClick={e => {
              e.stopPropagation();
              onEdit?.(workOrder);
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-10 10A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l10-10a2 2 0 012.828 0z"/></svg>
          </button>
          <button
            title="Delete"
            className={`p-2 rounded-full transition-colors duration-200 ${colorScheme === 'dark' ? 'bg-[#1a1f2e] hover:bg-red-900/50 text-red-400' : 'bg-red-100 hover:bg-red-200'}`}
            onClick={e => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this urgent work order?')) {
                onDelete?.(workOrder.id);
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