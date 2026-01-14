import * as React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderResponse } from '../types/api';
import { MaterialsButton } from './MaterialsButton';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from './AdminLayout';

// Global image cache to prevent flashing when components remount (e.g., during drag)
const loadedImagesCache = new Set<string>();

// Dark mode color mappings for status badges
const statusColorsDark: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-teal-600/30 text-teal-300 border border-teal-500/30',
  ASSIGNED: 'bg-blue-600/30 text-blue-300 border border-blue-500/30',
  IN_PROGRESS: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30',
  COMPLETED: 'bg-green-600/30 text-green-300 border border-green-500/30',
  CANCELLED: 'bg-red-600/30 text-red-300 border border-red-500/30',
};

const statusColorsLight: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-teal-500 text-white',
  ASSIGNED: 'bg-blue-200 text-blue-800',
  IN_PROGRESS: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

// Dark mode color mappings for priority badges
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
}

const WorkOrderCardComponent = ({ workOrder, onOpenMaterials, onDeleted }: WorkOrderCardComponentProps) => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const avatarUrl = (userId: number) => `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  // Use relative URL for attachments (works with proxy in dev/preview)
  const attachmentUrl = workOrder.attachmentDownloadUrl
    ? workOrder.attachmentDownloadUrl
    : undefined;

  // Check if image is already in global cache (prevents flash on remount)
  const isImageCached = attachmentUrl ? loadedImagesCache.has(attachmentUrl) : false;

  // Use refs to track previous values and avoid unnecessary resets
  const prevAttachmentUrlRef = React.useRef<string | undefined>(attachmentUrl);
  const placeholderImg = '/placeholder.png'; // You can provide a real placeholder image

  // Initialize image state - if cached, skip loading state
  const [imgState, setImgState] = React.useState(() => ({
    src: isImage && attachmentUrl ? attachmentUrl : undefined,
    triedApi: false,
    triedPlaceholder: false,
    loaded: isImageCached, // Start as loaded if in cache
  }));

  // Only reset image state when the actual attachment URL changes
  React.useEffect(() => {
    if (prevAttachmentUrlRef.current !== attachmentUrl) {
      prevAttachmentUrlRef.current = attachmentUrl;
      const cached = attachmentUrl ? loadedImagesCache.has(attachmentUrl) : false;
      setImgState({
        src: isImage && attachmentUrl ? attachmentUrl : undefined,
        triedApi: false,
        triedPlaceholder: false,
        loaded: cached,
      });
    }
  }, [attachmentUrl, isImage]);

  const handleImageLoad = React.useCallback(() => {
    if (attachmentUrl) {
      loadedImagesCache.add(attachmentUrl);
    }
    setImgState(prev => ({ ...prev, loaded: true }));
  }, [attachmentUrl]);

  const handleImageError = React.useCallback(() => {
    setImgState(prev => {
      if (!prev.triedApi && prev.src !== attachmentUrl) {
        return { ...prev, src: attachmentUrl || '', triedApi: true, loaded: false };
      } else if (!prev.triedPlaceholder) {
        return { ...prev, src: placeholderImg, triedPlaceholder: true, loaded: false };
      } else {
        // Hide image if all fail
        return { ...prev, src: undefined, loaded: true };
      }
    });
  }, [attachmentUrl]);

  // Card styles based on color scheme
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
      aria-label={`Work order ${workOrder.title}`}
    >
      <div className="flex justify-between items-start sm:items-center mb-1 sm:mb-2 gap-2 flex-wrap">
        <h3 className={`font-bold text-sm sm:text-lg truncate flex items-center gap-1 sm:gap-2 max-w-[70%] ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : ''}`}>
          <span className={`inline-block flex-shrink-0 ${colorScheme === 'dark' ? 'text-[#3b82f6]' : 'text-blue-500'}`}><svg width="16" height="16" className="sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z"/></svg></span>
          <Link to={`./${workOrder.id}`} tabIndex={0} aria-label={`View details for ${workOrder.title}`} className={`truncate ${colorScheme === 'dark' ? 'text-[#e2e8f0] hover:text-white' : ''}`}>{workOrder.title}</Link>
        </h3>
        <StatusBadge status={workOrder.status} />
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-1 sm:mb-2">
        <PriorityBadge priority={workOrder.priority} />
        <span className={`text-xs flex items-center gap-1 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-700'}`} aria-label={`Due date: ${workOrder.dueDate?.slice(0, 10)}`}><svg width="14" height="14" fill="currentColor" className={colorScheme === 'dark' ? 'text-[#60a5fa]' : 'text-blue-400'} viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 6v10H4V8h12z"/></svg>Due: {workOrder.dueDate?.slice(0, 10)}</span>
      </div>
      <div className={`text-sm line-clamp-2 mb-2 transition-all duration-200 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-800'}`} aria-label={`Description: ${workOrder.description}`}>{workOrder.description}</div>
      <div className={`text-xs flex items-center gap-1 mb-2 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-700'}`} aria-label={`Location: ${workOrder.location}`}> 
        <svg width="14" height="14" fill="currentColor" className={colorScheme === 'dark' ? 'text-[#4ade80]' : 'text-green-400'} viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6c0 4.418-6 10-6 10S4 12.418 4 8a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
        Location: {workOrder.location}
      </div>

      {/* Attachment preview or download */}
      {attachmentUrl && (
        <div className="mb-2" style={{ minHeight: isImage && imgState.src ? 32 : undefined }}>
          {isImage ? (
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
              {imgState.src && (
                <img
                  src={imgState.src}
                  alt={workOrder.attachmentFilename || 'Attachment'}
                  className={`max-h-32 rounded shadow mb-1 ${colorScheme === 'dark' ? 'border border-[#2d3748]' : 'border'}`}
                  style={{ 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    // Instant display if cached, otherwise fade in
                    opacity: imgState.loaded ? 1 : 0,
                    transition: imgState.loaded ? 'none' : 'opacity 0.15s ease-in',
                  }}
                  loading="eager"
                  decoding="sync"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
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
              // Open edit modal by simulating card click
              const click = new MouseEvent('click', { bubbles: true });
              (e.currentTarget.closest('[role="group"]') as HTMLElement)?.dispatchEvent(click);
            }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-10 10A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l10-10a2 2 0 012.828 0z"/></svg>
          </button>
          <button
            title="Delete"
            className={`p-2 rounded-full transition-colors duration-200 ${colorScheme === 'dark' ? 'bg-[#1a1f2e] hover:bg-red-900/50 text-red-400' : 'bg-red-100 hover:bg-red-200'}`}
            onClick={async e => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this work order?')) {
                try {
                  const api = (await import('../lib/api')).default;
                  await api.delete(`/api/admin/work-orders/${workOrder.id}`);
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
