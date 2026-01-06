import * as React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderResponse } from '../types/api';
import { useLang } from '../context/LangContext';

const statusColors: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-teal-500 text-white',
  ASSIGNED: 'bg-blue-200 text-blue-800',
  IN_PROGRESS: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const priorityColors: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useLang();
  const statusLabels = {
    OPEN: t.statusOpen,
    ASSIGNED: t.statusAssigned,
    IN_PROGRESS: t.statusInProgress,
    COMPLETED: t.statusCompleted,
    CANCELLED: t.statusCancelled,
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status]}`}>{statusLabels[status]}</span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const { t } = useLang();
  const priorityLabels = {
    LOW: t.priorityLow,
    MEDIUM: t.priorityMedium,
    HIGH: t.priorityHigh,
    URGENT: t.priorityUrgent,
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[priority]}`}>{priorityLabels[priority]}</span>
  );
}

const WorkOrderCardComponent = ({ workOrder }: { workOrder: WorkOrderResponse }) => {
  const avatarUrl = (userId: number) => `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  // Always use backend base URL for attachments (now /api/files/workorders/)
  const backendBaseUrl = 'http://localhost:8080';
  const attachmentUrl = workOrder.attachmentDownloadUrl
    ? backendBaseUrl + workOrder.attachmentDownloadUrl
    : undefined;

  // Robust image fallback logic
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(
    isImage && attachmentUrl ? attachmentUrl : undefined
  );
  const [triedApi, setTriedApi] = React.useState(false);
  const [triedPlaceholder, setTriedPlaceholder] = React.useState(false);
  const placeholderImg = '/placeholder.png'; // You can provide a real placeholder image

  React.useEffect(() => {
    setImgSrc(isImage && attachmentUrl ? attachmentUrl : undefined);
    setTriedApi(false);
    setTriedPlaceholder(false);
  }, [workOrder.attachmentFilename, workOrder.attachmentDownloadUrl, workOrder.attachmentContentType]);

  return (
    <div
      className="rounded-2xl shadow-2xl bg-gradient-to-br from-white/70 to-blue-100/60 p-5 flex flex-col gap-3 border border-blue-200 backdrop-blur-md transition-transform duration-200 hover:scale-105 hover:shadow-blue-400/40 hover:bg-white/80 cursor-pointer"
      style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      tabIndex={0}
      role="group"
      aria-label={`Work order ${workOrder.title}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg truncate flex items-center gap-2">
          <span className="inline-block text-blue-500"><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z"/></svg></span>
          <Link to={`./${workOrder.id}`} tabIndex={0} aria-label={`View details for ${workOrder.title}`}>{workOrder.title}</Link>
        </h3>
        <StatusBadge status={workOrder.status} />
      </div>
      <div className="flex gap-3 items-center mb-2">
        <PriorityBadge priority={workOrder.priority} />
        <span className="text-xs text-gray-700 flex items-center gap-1" aria-label={`Due date: ${workOrder.dueDate?.slice(0, 10)}`}><svg width="14" height="14" fill="currentColor" className="text-blue-400" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 6v10H4V8h12z"/></svg>Due: {workOrder.dueDate?.slice(0, 10)}</span>
      </div>
      <div className="text-sm text-gray-800 line-clamp-2 mb-2 transition-all duration-200" aria-label={`Description: ${workOrder.description}`}>{workOrder.description}</div>
      <div className="text-xs text-gray-700 flex items-center gap-1 mb-2" aria-label={`Location: ${workOrder.location}`}> 
        <svg width="14" height="14" fill="currentColor" className="text-green-400" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6c0 4.418-6 10-6 10S4 12.418 4 8a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
        Location: {workOrder.location}
      </div>

      {/* Attachment preview or download */}
      {attachmentUrl && (
        <div className="mb-2">
          {isImage ? (
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={imgSrc}
                alt={workOrder.attachmentFilename || 'Attachment'}
                className="max-h-32 rounded shadow border mb-1"
                style={{ maxWidth: '100%', objectFit: 'contain' }}
                onError={e => {
                  if (!triedApi && imgSrc !== attachmentUrl) {
                    setImgSrc(attachmentUrl || '');
                    setTriedApi(true);
                  } else if (!triedPlaceholder) {
                    setImgSrc(placeholderImg);
                    setTriedPlaceholder(true);
                  } else {
                    // Hide image if all fail
                    setImgSrc(undefined);
                  }
                }}
              />
            </a>
          ) : (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline text-xs"
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
            className="w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform duration-200 hover:scale-110"
            title="Assignee"
            tabIndex={0}
          />
          <img
            src={avatarUrl(workOrder.createdByUserId)}
            alt="Creator avatar"
            className="w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform duration-200 hover:scale-110"
            title="Creator"
            tabIndex={0}
          />
        </div>
        <span className="ml-auto flex gap-2">
          <button title="Edit" className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors duration-200"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-10 10A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l10-10a2 2 0 012.828 0z"/></svg></button>
          <button title="Delete" className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors duration-200"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 6v10H4V8h12z"/></svg></button>
        </span>
      </div>
    </div>
  );
}

export const WorkOrderCard = React.memo(WorkOrderCardComponent);
