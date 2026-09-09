import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DndContext, rectIntersection, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable, DragOverlay } from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  getProjectBoardTasks,
  createProjectBoardTask,
  updateProjectBoardTask,
  deleteProjectBoardTask,
  archiveProjectBoardTask,
  reorderProjectBoardTasks,
  getAdminUsers,
} from '../lib/api';
import type { ProjectBoardTaskResponse } from '../types/api';
import { WorkOrderPriority } from '../types/api';
import type { ColorSchemeType } from './AdminWorkOrders/colorSchemes';
import { useLang } from '../context/LangContext';
import { ProjectBoardCard } from '../components/ProjectBoardCard';
import { SharedEditModal } from '../components/SharedEditModal';
import { FilterBar } from './AdminWorkOrders/FilterBar';
import styles from './AdminWorkOrders/AdminWorkOrdersPage.module.css';

const STATUS_IDS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const BOTTOM_ZONE_PREFIX = 'bottom-';
const getBottomZoneId = (status: string) => `${BOTTOM_ZONE_PREFIX}${status}`;
const isBottomZone = (id: string) => id.startsWith(BOTTOM_ZONE_PREFIX);
const getStatusFromBottomZone = (id: string) => id.replace(BOTTOM_ZONE_PREFIX, '');

const toFileArray = (files?: FileList | File[] | null): File[] => {
  if (!files) return [];
  if (files instanceof FileList) return Array.from(files);
  if (Array.isArray(files)) return files;
  return [];
};

const customCollisionDetection: CollisionDetection = rectIntersection;

function BottomDropZone({ status, colorScheme, hasItems }: { status: string; colorScheme: string; hasItems: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: getBottomZoneId(status) });
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 rounded-lg border-2 border-dashed transition-all duration-200 ${isOver
        ? colorScheme === 'dark' ? 'border-brand-400 bg-brand-500/20 min-h-[60px]' : 'border-brand-400 bg-brand-50 min-h-[60px]'
        : colorScheme === 'dark' ? 'border-transparent hover:border-gray-600 min-h-[40px]' : 'border-transparent hover:border-gray-300 min-h-[40px]'} ${hasItems ? '' : 'hidden'}`}
      style={{ flexShrink: 0 }}
    >
      {isOver && <div className={`text-center py-3 text-sm ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-600'}`}>Drop here to add at end</div>}
    </div>
  );
}

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );
}

function SortableProjectBoardCard({ id, task, activeId, onDeleted, onArchived, onCardClick }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const isBeingDragged = isDragging || activeId === id;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
    cursor: 'grab',
    touchAction: 'none',
    zIndex: isDragging ? 50 : 'auto',
    boxShadow: isBeingDragged ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onCardClick(task)}>
      <ProjectBoardCard task={task} onDeleted={onDeleted} onArchived={onArchived} />
    </div>
  );
}

const statusIconsMap: Record<string, React.ReactElement> = {
  OPEN: <svg width="20" height="20" fill="currentColor" className="text-teal-500" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>,
  ASSIGNED: (
    <svg width="24" height="24" fill="none" className="text-blue-500" viewBox="0 0 24 24">
      <rect x="4" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="white"/>
    </svg>
  ),
  IN_PROGRESS: (
    <svg width="24" height="24" fill="none" className="text-yellow-500" viewBox="0 0 24 24">
      <path d="M6 4h12M6 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 4c0 4 4 4 4 8s-4 4-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  COMPLETED: <svg width="28" height="28" fill="none" className="text-green-500" viewBox="0 0 28 28"><path d="M7 15l6 6 8-12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  CANCELLED: <svg width="24" height="24" fill="currentColor" className="text-red-600 font-bold" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M7 7l10 10M7 17L17 7"/></svg>,
};

function DroppableColumn({ status, colorScheme, children }: { status: string; colorScheme: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { t } = useLang();
  const getStatusLabel = (s: string) => {
    if ((t as any)[`status_${s.toLowerCase()}`]) return (t as any)[`status_${s.toLowerCase()}`];
    switch (s) {
      case 'OPEN': return t.statusOpen || 'Open';
      case 'ASSIGNED': return t.statusAssigned || 'Assigned';
      case 'IN_PROGRESS': return t.statusInProgress || 'In Progress';
      case 'COMPLETED': return t.statusCompleted || 'Completed';
      case 'CANCELLED': return t.statusCancelled || 'Cancelled';
      default: return s;
    }
  };
  return (
    <div
      ref={setNodeRef}
      className={colorScheme === 'dark'
        ? `w-full h-full bg-surface-800 rounded-xl shadow-card p-4 flex flex-col border border-surface-700 transition-all duration-200 ${isOver ? 'ring-2 ring-brand-500' : ''}`
        : `w-full h-full bg-white rounded-xl shadow p-4 flex flex-col border border-gray-200 transition-all duration-200 ${isOver ? 'ring-2 ring-gray-400' : ''}`}
      style={{ minHeight: 350 }}
    >
      <div className={colorScheme === 'dark'
        ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-surface-700 text-surface-100 flex items-center gap-2 border-b border-surface-700 shadow'
        : 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-white text-gray-800 flex items-center gap-2 border-b border-gray-200 shadow'}
      >
        {statusIconsMap[status]}
        <span className="flex items-center gap-1 truncate">{getStatusLabel(status)}</span>
      </div>
      {children}
    </div>
  );
}

const getPriorityLabel = (t: any, p: string) => {
  switch (p) {
    case 'LOW': return t.priorityLow || 'Low';
    case 'MEDIUM': return t.priorityMedium || 'Medium';
    case 'HIGH': return t.priorityHigh || 'High';
    case 'URGENT': return t.priorityUrgent || 'Urgent';
    default: return p;
  }
};

const priorityOptions = Object.values(WorkOrderPriority);

function ProjectBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = React.useState(false);
  const queryClient = useQueryClient();
  const { colorScheme }: { colorScheme: ColorSchemeType } = useOutletContext() || { colorScheme: 'default' };
  const { t } = useLang();

  React.useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowModal(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('action');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    if (!showModal) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const [assignableUsers, setAssignableUsers] = React.useState<Array<{ id: number; email: string }>>([]);
  React.useEffect(() => {
    let cancelled = false;
    getAdminUsers()
      .then((users) => {
        if (cancelled) return;
        setAssignableUsers(users.filter(u => u.enabled).sort((a, b) => a.email.localeCompare(b.email)).map(u => ({ id: u.id, email: u.email })));
      })
      .catch(() => { if (!cancelled) setAssignableUsers([]); });
    return () => { cancelled = true; };
  }, []);

  const [status, setStatus] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [q, setQ] = React.useState('');
  const [technician, setTechnician] = React.useState('');
  const [locationFilter, setLocationFilter] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const startDateInputRef = React.useRef(null);
  const endDateInputRef = React.useRef(null);

  const [optimisticData, setOptimisticData] = React.useState<ProjectBoardTaskResponse[] | undefined>(undefined);
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['projectBoardTasks', { status, q, location: locationFilter, technician }],
    queryFn: () => getProjectBoardTasks({ status, q, location: locationFilter, assignedToUserId: technician }),
    refetchInterval: 30000,
    staleTime: 0,
  });
  const data = optimisticData || rawData;

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    if (!startDate && !endDate) return data;
    return data.filter(task => {
      const due = task.dueDate?.slice(0, 10);
      if (startDate && due < startDate) return false;
      if (endDate && due > endDate) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, ProjectBoardTaskResponse[]> = {};
    STATUS_IDS.forEach(s => { groups[s] = []; });
    filteredData.forEach(task => { groups[task.status]?.push(task); });
    STATUS_IDS.forEach(s => {
      groups[s]?.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
    });
    return groups;
  }, [filteredData]);

  const technicianOptions = React.useMemo(() => [
    { id: '', name: t.allTechnicians || 'All' },
    ...assignableUsers.map(u => ({ id: u.id.toString(), name: u.email })),
  ], [assignableUsers, t.allTechnicians]);

  const locationOptions = React.useMemo(() => {
    const locations = Array.from(new Set(filteredData.map(t => t.location).filter(Boolean)));
    return [{ id: '', name: t.allLocations || 'All Locations' }, ...locations.map(loc => ({ id: loc, name: loc }))];
  }, [filteredData, t.allLocations]);

  // --- Create form ---
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { isSubmitting },
  } = useForm<any>({ defaultValues: { priority: 'MEDIUM' } });
  const files = watch('files');
  const createFileArray = React.useMemo(() => toFileArray(files), [files]);
  const [createInvoiceFiles, setCreateInvoiceFiles] = React.useState<File[]>([]);

  const handleCreateFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('files', e.target.files ? Array.from(e.target.files) : undefined);
  };
  const removeCreateSelectedFileAt = (idx: number) => {
    const next = createFileArray.filter((_, i) => i !== idx);
    setValue('files', next.length > 0 ? next : undefined);
  };
  const handleCreateInvoiceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateInvoiceFiles(e.target.files ? Array.from(e.target.files) : []);
  };
  const removeCreateInvoiceFileAt = (idx: number) => setCreateInvoiceFiles(prev => prev.filter((_, i) => i !== idx));

  const onCreate: SubmitHandler<any> = async (formData) => {
    try {
      const created = await createProjectBoardTask({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        dueDate: formData.dueDate,
        priority: formData.priority,
        files: createFileArray,
        invoiceFiles: createInvoiceFiles,
      });
      // Optimistically show the created task immediately
      setOptimisticData(prev => prev ? [created, ...prev] : [created]);
      reset({ priority: 'MEDIUM' });
      setCreateInvoiceFiles([]);
      setShowModal(false);
      // Ensure a background refetch to reconcile server state
      queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
    } catch (err) {
      alert('Failed to create task');
    }
  };

  // --- Edit form ---
  const [editModal, setEditModal] = React.useState<{ open: boolean; task: ProjectBoardTaskResponse | null }>({ open: false, task: null });
  const {
    register: editRegister, handleSubmit: handleEditSubmit, reset: editReset, setValue: setEditValue, watch: editWatch,
    formState: { isSubmitting: isEditSubmitting },
  } = useForm<any>();
  const editFiles = editWatch('files');
  const editFileArray = React.useMemo(() => toFileArray(editFiles), [editFiles]);
  const [removeEditAttachment, setRemoveEditAttachment] = React.useState(false);
  const [editInvoiceFiles, setEditInvoiceFiles] = React.useState<File[]>([]);
  const [removeEditInvoice, setRemoveEditInvoice] = React.useState(false);

  const existingEditAttachmentUrl = React.useMemo(() => {
    if (!editModal.task) return undefined;
    return editModal.task.attachmentDownloadUrl;
  }, [editModal.task]);

  const handleEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files ? Array.from(e.target.files) : undefined;
    setEditValue('files', next);
    if (next && next.length > 0) setRemoveEditAttachment(false);
  };
  const removeEditSelectedFileAt = (idx: number) => {
    const next = editFileArray.filter((_, i) => i !== idx);
    setEditValue('files', next.length > 0 ? next : undefined);
  };
  const handleEditInvoiceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files ? Array.from(e.target.files) : [];
    setEditInvoiceFiles(next);
    if (next.length > 0) setRemoveEditInvoice(false);
  };
  const removeEditInvoiceFileAt = (idx: number) => setEditInvoiceFiles(prev => prev.filter((_, i) => i !== idx));

  const openEditModal = (task: ProjectBoardTaskResponse) => {
    setEditModal({ open: true, task });
    setRemoveEditAttachment(false);
    setEditInvoiceFiles([]);
    setRemoveEditInvoice(false);
    editReset({
      title: task.title,
      description: task.description,
      location: task.location,
      priority: task.priority,
      dueDate: task.dueDate?.slice(0, 10) || '',
      assignedToUserId: task.assignedToUserId ? task.assignedToUserId.toString() : '',
    });
  };

  const onEdit: SubmitHandler<any> = async (formData) => {
    if (!editModal.task) return;
    try {
      const updated = await updateProjectBoardTask(editModal.task.id, {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        priority: formData.priority,
        dueDate: formData.dueDate,
        assignedToUserId: formData.assignedToUserId || null,
        files: editFileArray,
        removeAttachment: removeEditAttachment,
        invoiceFiles: editInvoiceFiles,
        removeInvoice: removeEditInvoice,
      });
      setOptimisticData((data || []).map(t => t.id === updated.id ? { ...updated, sortIndex: t.sortIndex, status: t.status } : t));
      setEditModal({ open: false, task: null });
      setRemoveEditAttachment(false);
      setEditInvoiceFiles([]);
      setRemoveEditInvoice(false);
      queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const handleDeleted = async (id: number) => {
    setOptimisticData((data || []).filter(t => t.id !== id));
    try {
      await deleteProjectBoardTask(id);
    } catch {
      alert('Failed to delete task');
      setOptimisticData(undefined);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
    }
  };

  const handleArchived = async (id: number) => {
    setOptimisticData((data || []).filter(t => t.id !== id));
    try {
      await archiveProjectBoardTask(id);
    } catch {
      alert('Failed to archive task');
      setOptimisticData(undefined);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
    }
  };

  // --- Drag & drop ---
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useDndSensors();

  const handleDragStart = (event: any) => {
    setActiveId(String(event.active.id));
  };

  const activeTask = React.useMemo(() => {
    if (!activeId || !data) return null;
    return (data || []).find(t => t.id.toString() === activeId) || null;
  }, [activeId, data]);

  const handleDragEnd = async (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();
    const from = (data || []).find(t => t.id.toString() === activeIdStr);
    if (!from) return;

    let destStatus: string | null = null;
    let atEnd = false;
    if (isBottomZone(overIdStr)) {
      destStatus = getStatusFromBottomZone(overIdStr);
      atEnd = true;
    } else if (STATUS_IDS.includes(overIdStr)) {
      destStatus = overIdStr;
    } else {
      const overTask = (data || []).find(t => t.id.toString() === overIdStr);
      if (overTask) destStatus = overTask.status;
    }
    if (!destStatus) return;

    if (from.status !== destStatus) {
      const others = (data || []).filter(t => t.status === destStatus && t.id !== from.id);
      const updatedFrom = { ...from, status: destStatus as any };
      const destColumn = atEnd ? [...others, updatedFrom] : [updatedFrom, ...others];
      const newData = [
        ...(data || []).filter(t => t.status !== destStatus && t.id !== from.id),
        ...destColumn,
      ];
      setOptimisticData(newData);
      try {
        await updateProjectBoardTask(from.id, { status: destStatus });
        await reorderProjectBoardTasks(destStatus, destColumn.map(t => t.id));
      } catch {
        setOptimisticData(undefined);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
      }
      return;
    }

    // Same-column reorder
    const overTask = (data || []).find(t => t.id.toString() === overIdStr);
    if (overTask && overTask.status === from.status) {
      const col = grouped[from.status] || [];
      const oldIdx = col.findIndex(t => t.id === from.id);
      const newIdx = col.findIndex(t => t.id === overTask.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const newCol = [...col];
      const [moved] = newCol.splice(oldIdx, 1);
      newCol.splice(newIdx, 0, moved);
      const newData = [
        ...(data || []).filter(t => t.status !== from.status),
        ...newCol,
      ];
      setOptimisticData(newData);
      try {
        await reorderProjectBoardTasks(from.status, newCol.map(t => t.id));
      } catch {
        setOptimisticData(undefined);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
      }
    }
  };

  return (
    <div className="flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8">
      <div className="mb-8">
        <div className="w-full flex items-start gap-3 relative mb-4">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <FilterBar
              status={status}
              setStatus={setStatus}
              statusOptions={STATUS_IDS}
              priority={priority}
              setPriority={setPriority}
              priorityOptions={priorityOptions}
              technician={technician}
              setTechnician={setTechnician}
              technicianOptions={technicianOptions}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              locationOptions={locationOptions}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              q={q}
              setQ={setQ}
              t={t}
              colorScheme={colorScheme}
              startDateInputRef={startDateInputRef}
              endDateInputRef={endDateInputRef}
              getStatusLabel={(t: any, s: string) => {
                switch (s) {
                  case 'OPEN': return t.statusOpen || 'Open';
                  case 'ASSIGNED': return t.statusAssigned || 'Assigned';
                  case 'IN_PROGRESS': return t.statusInProgress || 'In Progress';
                  case 'COMPLETED': return t.statusCompleted || 'Completed';
                  case 'CANCELLED': return t.statusCancelled || 'Cancelled';
                  default: return s;
                }
              }}
              getPriorityLabel={getPriorityLabel}
            />
          </div>
          <div className="flex-shrink-0 flex flex-col gap-0 self-stretch">
            <button
              className={colorScheme === 'dark'
                ? 'bg-brand-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-card hover:bg-brand-700 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
                : 'bg-white text-gray-800 border border-gray-300 px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'}
              onClick={() => { reset({ priority: 'MEDIUM' }); setCreateInvoiceFiles([]); setShowModal(true); }}
            >
              <span className="align-middle">{t.newProjectBoardTask || 'New Task'}</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div>{t.loading}</div>
        ) : error ? (
          <div className="text-red-500 text-center">{t.errorLoading}</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col sm:flex-row gap-4 pb-12 px-2 sm:px-4 pt-4 w-full justify-evenly overflow-x-auto md:overflow-x-visible">
              {STATUS_IDS.map(statusId => (
                <div className="flex-shrink-0 w-full sm:w-[220px] flex flex-col" key={statusId}>
                  <DroppableColumn status={statusId} colorScheme={colorScheme}>
                    <SortableContext id={statusId} items={(grouped[statusId] || []).map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                      <div className="flex-1 flex flex-col gap-4 min-h-[180px]">
                        {(grouped[statusId] || []).length === 0 ? (
                          <div className="text-gray-400 text-center py-4">{t.noProjectBoardTasks || 'No tasks'}</div>
                        ) : (
                          (grouped[statusId] || []).map(task => (
                            <SortableProjectBoardCard
                              key={task.id}
                              id={task.id.toString()}
                              task={task}
                              colorScheme={colorScheme}
                              activeId={activeId}
                              onDeleted={handleDeleted}
                              onArchived={handleArchived}
                              onCardClick={openEditModal}
                            />
                          ))
                        )}
                      </div>
                      <BottomDropZone status={statusId} colorScheme={colorScheme} hasItems={(grouped[statusId] || []).length > 0} />
                    </SortableContext>
                  </DroppableColumn>
                </div>
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div style={{ width: 220 }}>
                  <ProjectBoardCard task={activeTask} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {showModal && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto ${colorScheme === 'dark' ? 'bg-black/60' : 'bg-black/40'}`} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={`rounded-xl shadow-card p-6 w-full max-w-md relative my-4 max-h-[90vh] overflow-y-auto ${colorScheme === 'dark' ? 'bg-surface-800 border border-surface-700' : 'bg-white/95 backdrop-blur-md border border-blue-200'}`}>
            <button className={`absolute top-2.5 right-3.5 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-red-400 hover:bg-surface-700' : 'text-red-400 hover:bg-red-50 border border-red-200'}`} aria-label="Close" onClick={() => setShowModal(false)}>×</button>
            <h2 className={`text-xl font-bold mb-4 ${colorScheme === 'dark' ? 'text-surface-100' : 'text-surface-900'}`}>{t.newProjectBoardTask || 'New Task'}</h2>
            <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-4">
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.title}</label>
                <input className={`${styles.input} ${colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : ''}`} {...register('title', { required: true })} />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.description}</label>
                <textarea className={`${styles.input} ${colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : ''}`} rows={3} {...register('description')} />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.location}</label>
                <input className={`${styles.input} ${colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : ''}`} {...register('location')} />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.priority}</label>
                <select className={`${styles.input} ${colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : ''}`} {...register('priority')}>
                  {priorityOptions.map(p => <option key={p} value={p}>{getPriorityLabel(t, p)}</option>)}
                </select>
              </div>
              {/* Assigned technician intentionally omitted from create form per UX request */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.dueDate}</label>
                <input type="date" className={`${styles.input} cursor-pointer ${colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500 [color-scheme:dark]' : ''}`} {...register('dueDate')} onClick={e => { const input = e.target as HTMLInputElement; if (typeof input.showPicker === 'function') input.showPicker(); }} />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-blue-800'}`}>{t.attachments}</label>
                <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className={`border rounded-lg px-3 py-2 w-full text-sm cursor-pointer ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100' : ''}`} onChange={handleCreateFilesChange} />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>{createFileArray.length > 0 ? createFileArray.map(f => f.name).join(', ') : t.noFileChosen}</div>
                {createFileArray.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {createFileArray.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`truncate text-sm flex-1 ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                        <button type="button" className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100" onClick={() => removeCreateSelectedFileAt(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>{t.invoiceDocument || 'Invoice / Document'}</label>
                <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className={`border rounded-lg px-3 py-2 w-full text-sm cursor-pointer ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100' : ''}`} onChange={handleCreateInvoiceFilesChange} />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>{createInvoiceFiles.length > 0 ? createInvoiceFiles.map(f => f.name).join(', ') : t.noFileChosen}</div>
                {createInvoiceFiles.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {createInvoiceFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`truncate text-sm flex-1 ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                        <button type="button" className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100" onClick={() => removeCreateInvoiceFileAt(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="px-6 py-2 rounded-xl shadow-card font-semibold text-base mt-2 bg-brand-600 text-white" disabled={isSubmitting}>{t.create}</button>
            </form>
          </div>
        </div>
      )}

      {editModal.open && (
        <SharedEditModal
          open={editModal.open}
          onClose={() => setEditModal({ open: false, task: null })}
          title={t.editProjectBoardTask || 'Edit Task'}
          onSubmit={handleEditSubmit(onEdit)}
          isSubmitting={isEditSubmitting}
          colorScheme={colorScheme}
          showDelete={true}
          deleteLabel={t.delete}
          onDelete={async () => {
            if (!editModal.task) return;
            if (window.confirm(t.confirmDeleteProjectBoardTask || 'Are you sure you want to delete this task?')) {
              try {
                await deleteProjectBoardTask(editModal.task.id);
                setEditModal({ open: false, task: null });
                queryClient.invalidateQueries({ queryKey: ['projectBoardTasks'] });
              } catch {
                alert(t.errorLoading);
              }
            }
          }}
        >
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.title}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('title', { required: true })} />
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.description}</label>
            <textarea className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} rows={3} {...editRegister('description')} />
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.location}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('location')} />
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.priority}</label>
            <select className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('priority')}>
              {priorityOptions.map(p => <option key={p} value={p}>{getPriorityLabel(t, p)}</option>)}
            </select>
          </div>
          {/* Assigned technician removed from edit form per request */}
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.dueDate}</label>
            <input type="date" className={styles.input + ' ' + (colorScheme === 'dark' ? '[color-scheme:dark] !bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('dueDate')} />
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.attachments}</label>
            {existingEditAttachmentUrl && !removeEditAttachment && (
              <div className={`mb-2 flex items-center gap-2 p-2 rounded ${colorScheme === 'dark' ? 'bg-surface-700' : 'bg-gray-50 border border-gray-200'}`}>
                <a href={existingEditAttachmentUrl} target="_blank" rel="noopener noreferrer" className={`text-sm truncate underline ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-700'}`}>{editModal.task?.attachmentFilename || 'Current attachment'}</a>
                <button type="button" className={`ml-auto rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold ${colorScheme === 'dark' ? 'text-surface-300 hover:bg-surface-600' : 'text-gray-600 hover:bg-gray-200'}`} onClick={() => setRemoveEditAttachment(true)}>×</button>
              </div>
            )}
            {removeEditAttachment && (
              <div className={`mb-2 text-xs flex items-center gap-2 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-gray-600'}`}>
                <span>Attachment will be removed on save.</span>
                <button type="button" className={`underline ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-700'}`} onClick={() => setRemoveEditAttachment(false)}>Undo</button>
              </div>
            )}
            <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className={styles.input + ' cursor-pointer ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} onChange={handleEditFilesChange} />
            <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>{editFileArray.length > 0 ? editFileArray.map(f => f.name).join(', ') : t.noFileChosen}</div>
            {editFileArray.length > 0 && (
              <div className="mt-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
                {editFileArray.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`truncate text-sm flex-1 ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                    <button type="button" className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100" onClick={() => removeEditSelectedFileAt(idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.invoiceDocument || 'Invoice / Document'}</label>
            {editModal.task?.invoiceFilename && !removeEditInvoice && (
              <div className={`mb-2 flex items-center gap-2 p-2 rounded ${colorScheme === 'dark' ? 'bg-surface-700' : 'bg-green-50 border border-green-200'}`}>
                <span className="text-lg">📄</span>
                <a href={editModal.task.invoiceDownloadUrl} target="_blank" rel="noopener noreferrer" className={`text-sm truncate underline ${colorScheme === 'dark' ? 'text-brand-300' : 'text-green-700'}`}>{editModal.task.invoiceFilename}</a>
                <button type="button" className={`ml-auto rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold ${colorScheme === 'dark' ? 'text-surface-300 hover:bg-surface-600' : 'text-gray-600 hover:bg-gray-200'}`} onClick={() => setRemoveEditInvoice(true)}>×</button>
              </div>
            )}
            {removeEditInvoice && (
              <div className={`mb-2 text-xs flex items-center gap-2 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-gray-600'}`}>
                <span>{t.removeInvoice || 'Invoice will be removed on save.'}</span>
                <button type="button" className={`underline ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-700'}`} onClick={() => setRemoveEditInvoice(false)}>Undo</button>
              </div>
            )}
            <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className={styles.input + ' cursor-pointer ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} onChange={handleEditInvoiceFilesChange} />
            <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>{editInvoiceFiles.length > 0 ? editInvoiceFiles.map(f => f.name).join(', ') : t.noFileChosen}</div>
            {editInvoiceFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {editInvoiceFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`truncate text-sm flex-1 ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                    <button type="button" className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100" onClick={() => removeEditInvoiceFileAt(idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SharedEditModal>
      )}

      <p className={`mt-6 text-center text-sm opacity-70 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-600'}`}>
        {t.pageExplanationProjectBoard}
      </p>
    </div>
  );
}

export default ProjectBoardPage;
