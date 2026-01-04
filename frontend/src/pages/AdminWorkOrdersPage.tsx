// Edit modal with Escape key handler
function EditModalWithEscape({ onClose, handleEditSubmit, onEdit, editRegister, editErrors, isEditSubmitting, priorityOptions, editModal, queryClient }: any) {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const { t } = useLang();
  const modalRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >✕</button>
        <h2 className="text-xl font-bold mb-4">{t.editWorkOrder}</h2>
        <form onSubmit={handleEditSubmit(onEdit)} className="flex flex-col gap-4">
          <div>
            <label className="block font-medium mb-1">{t.title}</label>
            <input className="border rounded px-3 py-2 w-full" {...editRegister('title')} />
            {editErrors.title && <div className="text-red-500 text-sm">{editErrors.title.message}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">{t.description}</label>
            <textarea className="border rounded px-3 py-2 w-full" {...editRegister('description')} />
            {editErrors.description && <div className="text-red-500 text-sm">{editErrors.description.message}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">{t.location}</label>
            <input className="border rounded px-3 py-2 w-full" {...editRegister('location')} />
            {editErrors.location && <div className="text-red-500 text-sm">{editErrors.location.message}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">{t.priority}</label>
            <select className="border rounded px-3 py-2 w-full" {...editRegister('priority')}>
              {priorityOptions.map((p: string) => (
                <option key={p} value={p}>{getPriorityLabel(t, p)}</option>
              ))}
            </select>
            {editErrors.priority && <div className="text-red-500 text-sm">{editErrors.priority.message}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">{t.dueDate}</label>
            <input type="date" className="border rounded px-3 py-2 w-full" {...editRegister('dueDate')} />
            {editErrors.dueDate && <div className="text-red-500 text-sm">{editErrors.dueDate.message}</div>}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? t.saveChanges : t.saveChanges}
            </button>
            <button
              type="button"
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              onClick={async () => {
                if (window.confirm(t.confirmDelete)) {
                  try {
                    await api.delete(`/api/admin/work-orders/${editModal.workOrder.id}`);
                    onClose();
                    queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
                  } catch (err) {
                    alert(t.errorLoading);
                  }
                }
              }}
            >{t.delete}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { WorkOrderResponse, PageResponse, WorkOrderStatus, WorkOrderPriority } from '../types/api';
import { WorkOrderCard, StatusBadge, PriorityBadge } from '../components/WorkOrderCard';
import { useLang } from '../context/LangContext';

const statusOptions = Object.values(WorkOrderStatus);
const priorityOptions = Object.values(WorkOrderPriority);


function AdminWorkOrdersPage() {
  const { t } = useLang();
  // Modal state for creating work order
  const [showModal, setShowModal] = React.useState(false);
  // Modal state for editing work order
  const [editModal, setEditModal] = React.useState<{ open: boolean; workOrder: WorkOrderResponse | null }>({ open: false, workOrder: null });
  const queryClient = useQueryClient();

    // Zod schema for form validation
    const schema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().min(1, 'Description is required'),
      location: z.string().min(1, 'Location is required'),
      priority: z.nativeEnum(WorkOrderPriority),
      dueDate: z.string().min(1, 'Due date is required'),
    });
    type FormType = z.infer<typeof schema>;
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<FormType>({ resolver: zodResolver(schema) });

    const onCreate = async (data: FormType) => {
      try {
        await api.post('/api/admin/work-orders', data);
        setShowModal(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
      } catch (err) {
        alert('Failed to create work order');
      }
    };

    // Edit form state
    const editSchema = schema;
    type EditFormType = z.infer<typeof editSchema>;
    const {
      register: editRegister,
      handleSubmit: handleEditSubmit,
      reset: editReset,
      formState: { errors: editErrors, isSubmitting: isEditSubmitting },
      setValue: setEditValue,
    } = useForm<EditFormType>({ resolver: zodResolver(editSchema) });

    // Open edit modal and prefill form
    const openEditModal = (wo: WorkOrderResponse) => {
      setEditModal({ open: true, workOrder: wo });
      editReset({
        title: wo.title,
        description: wo.description,
        location: wo.location,
        priority: wo.priority,
        dueDate: wo.dueDate?.slice(0, 10) || '',
      });
    };

    // Edit handler
    const onEdit = async (data: EditFormType) => {
      if (!editModal.workOrder) return;
      try {
        await api.put(`/api/admin/work-orders/${editModal.workOrder.id}`, data);
        setEditModal({ open: false, workOrder: null });
        queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
      } catch (err) {
        alert('Failed to update work order');
      }
    };
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(10);
  const [status, setStatus] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('');
  const [q, setQ] = React.useState('');
  // Add technician and location filter dropdowns
  const [technician, setTechnician] = React.useState('');
  const [locationFilter, setLocationFilter] = React.useState('');
  // Add date filters
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Example: technician list and location list (replace with API data if available)
  const technicianOptions = [
    { id: '', name: t.allTechnicians || 'All Technicians' },
    { id: '1', name: 'Tech 1' },
    { id: '2', name: 'Tech 2' },
    // ...add more or fetch from API
  ];
  const locationOptions = [
    { id: '', name: t.allLocations || 'All Locations' },
    { id: 'A', name: 'Building A' },
    { id: 'B', name: 'Building B' },
    // ...add more or fetch from API
  ];

  const { data, isLoading, error } = useQuery<PageResponse<WorkOrderResponse>, Error>({
    queryKey: ['adminWorkOrders', { page, size, status, priority, q, technician, location: locationFilter, startDate, endDate }],
    queryFn: async () => {
      const params: Record<string, any> = { page, size };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (q) params.q = q;
      if (technician) params.technician = technician;
      if (locationFilter) params.location = locationFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get<PageResponse<WorkOrderResponse>>('/api/admin/work-orders', { params });
      return res.data;
    },
    // keepPreviousData is not a valid option in v5, so remove it
  });

  // --- Fix grouped state type ---
  const [grouped, setGrouped] = React.useState<Record<string, WorkOrderResponse[]>>({});

  // --- Fix useEffect grouping logic ---
  React.useEffect(() => {
    const groups: Record<string, WorkOrderResponse[]> = {};
    statusOptions.forEach(status => {
      groups[status] = [];
    });
    if (data && data.content) {
      data.content.forEach((wo: WorkOrderResponse) => {
        groups[wo.status]?.push(wo);
      });
    }
    setGrouped(groups);
  }, [data]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Handle drag end
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    // Find the source column and index
    let sourceCol: string | null = null;
    let sourceIdx = -1;
    for (const status of statusOptions) {
      const idx = grouped[status]?.findIndex((wo: WorkOrderResponse) => wo.id.toString() === active.id) ?? -1;
      if (idx !== -1) {
        sourceCol = status;
        sourceIdx = idx;
        break;
      }
    }
    if (!sourceCol || sourceIdx === -1) return;

    // Determine if dropped on a column or a card
    let destCol: string | null = null;
    let destIdx = 0;
    if (statusOptions.includes(over.id as WorkOrderStatus)) {
      destCol = over.id as string;
      destIdx = grouped[destCol]?.length ?? 0;
    } else {
      for (const status of statusOptions) {
        const idx = grouped[status]?.findIndex((wo: WorkOrderResponse) => wo.id.toString() === over.id) ?? -1;
        if (idx !== -1) {
          destCol = status;
          destIdx = idx;
          break;
        }
      }
      if (destCol && destCol !== sourceCol) {
        if (grouped[destCol] && grouped[destCol][destIdx]?.id.toString() !== active.id) {
          // insert before destIdx
        } else {
          destIdx = grouped[destCol]?.length ?? 0;
        }
      }
    }
    if (!destCol) return;

    if (sourceCol === destCol && sourceIdx === destIdx) return;

    if (sourceCol === destCol) {
      const newItems = [...(grouped[sourceCol] ?? [])];
      const [moved] = newItems.splice(sourceIdx, 1);
      let insertIdx = destIdx;
      if (sourceIdx < destIdx) insertIdx--;
      newItems.splice(insertIdx, 0, moved);
      setGrouped(prev => ({
        ...prev,
        [sourceCol!]: newItems,
      }));
    } else {
      const newSource = [...(grouped[sourceCol] ?? [])];
      const [moved] = newSource.splice(sourceIdx, 1);
      const newDest = [...(grouped[destCol] ?? [])];
      moved.status = destCol as WorkOrderStatus;
      newDest.splice(destIdx, 0, moved);
      setGrouped(prev => ({
        ...prev,
        [sourceCol!]: newSource,
        [destCol!]: newDest,
      }));
      // Persist status change to backend
      try {
        await api.put(`/api/admin/work-orders/${moved.id}`, {
          title: moved.title,
          description: moved.description,
          location: moved.location,
          priority: moved.priority,
          dueDate: moved.dueDate,
          status: moved.status,
        });
        queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
      } catch (err) {
        alert('Failed to update status');
      }
    }
  };

  // Sortable card wrapper for dnd-kit
  function SortableCard({ workOrder }: { workOrder: WorkOrderResponse }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: workOrder.id.toString(),
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      cursor: 'pointer',
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={e => {
          // Prevent drag handle click from opening modal
          if (e.defaultPrevented) return;
          openEditModal(workOrder);
        }}
      >
        <WorkOrderCard workOrder={workOrder} />
      </div>
    );
  }

  // Droppable column wrapper
  function DroppableColumn({ status, children }: { status: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const { t } = useLang();
    // Modern column style: glassmorphism, gradient, icons, transitions
    const statusIcons: Record<string, React.ReactElement> = {
      OPEN: <svg width="20" height="20" fill="currentColor" className="text-gray-400" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>,
      ASSIGNED: <svg width="20" height="20" fill="currentColor" className="text-blue-400" viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="3"/></svg>,
      IN_PROGRESS: <svg width="20" height="20" fill="currentColor" className="text-yellow-400" viewBox="0 0 20 20"><path d="M10 2v8l6 4"/></svg>,
      COMPLETED: <svg width="20" height="20" fill="currentColor" className="text-green-400" viewBox="0 0 20 20"><path d="M5 10l4 4 6-8"/></svg>,
      CANCELLED: <svg width="20" height="20" fill="currentColor" className="text-red-400" viewBox="0 0 20 20"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>,
    };
    return (
      <div
        ref={setNodeRef}
        className={`min-w-[320px] w-80 bg-gradient-to-br from-blue-200/80 to-purple-100/40 rounded-3xl shadow-2xl p-6 flex flex-col border-2 border-blue-300/40 transition-all duration-200 backdrop-blur-md ${isOver ? 'ring-4 ring-blue-400/60 scale-105' : ''}`}
        style={{ minHeight: 400, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      >
        <div className="font-bold text-xl mb-3 px-3 py-2 rounded-2xl bg-blue-200/60 text-blue-900 flex items-center gap-2 shadow">
          {statusIcons[status]}
          {getStatusLabel(t, status)}
        </div>
        {children}
      </div>
    );
  }

  // Filter work orders by date range on frontend
  const filteredGrouped = React.useMemo(() => {
    if (!startDate && !endDate) return grouped;
    const filterFn = (wo: WorkOrderResponse) => {
      const due = wo.dueDate?.slice(0, 10);
      if (startDate && due < startDate) return false;
      if (endDate && due > endDate) return false;
      return true;
    };
    const result: Record<string, WorkOrderResponse[]> = {};
    for (const status of statusOptions) {
      result[status] = (grouped[status] ?? []).filter(filterFn);
    }
    return result;
  }, [grouped, startDate, endDate]);

  return (
    <div className="flex-1 bg-gradient-to-br from-blue-100/80 to-purple-200/60 min-h-screen p-8">
      {/* Remove extra white container, keep only board and controls */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 md:gap-0">
        <h1 className="text-4xl font-extrabold text-center md:text-left text-blue-900 drop-shadow-lg tracking-tight flex items-center gap-3">
          <span className="inline-block"><svg width="32" height="32" fill="currentColor" className="text-blue-400" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg></span>
          {t.workOrders}
        </h1>
        <button
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-2xl shadow-lg hover:scale-105 hover:shadow-blue-400/40 transition-all duration-200 w-full md:w-auto font-semibold text-lg"
          onClick={() => setShowModal(true)}
        >
          <span className="inline-block mr-2 align-middle"><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5v10m5-5H5"/></svg></span>
          {t.newWorkOrder}
        </button>
      </div>
      {/* Modal for creating work order */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white/80 rounded-2xl shadow-2xl p-10 w-full max-w-md relative backdrop-blur-md border border-blue-200">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-blue-700 bg-white/60 rounded-full p-2 shadow transition-colors duration-200"
              onClick={() => setShowModal(false)}
            ><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M6 6l8 8M6 14L14 6"/></svg></button>
            <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2"><svg width="20" height="20" fill="currentColor" className="text-blue-400" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>{t.newWorkOrder}</h2>
            <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-5">
              <div>
                <label className="block font-semibold mb-2 text-blue-800">{t.title}</label>
                <input className="border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition-all duration-200" {...register('title')} />
                {errors.title && <div className="text-red-500 text-sm mt-1">{errors.title.message}</div>}
              </div>
              <div>
                <label className="block font-semibold mb-2 text-blue-800">{t.description}</label>
                <textarea className="border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition-all duration-200" {...register('description')} />
                {errors.description && <div className="text-red-500 text-sm mt-1">{errors.description.message}</div>}
              </div>
              <div>
                <label className="block font-semibold mb-2 text-blue-800">{t.location}</label>
                <input className="border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition-all duration-200" {...register('location')} />
                {errors.location && <div className="text-red-500 text-sm mt-1">{errors.location.message}</div>}
              </div>
              <div>
                <label className="block font-semibold mb-2 text-blue-800">{t.priority}</label>
                <select className="border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition-all duration-200" {...register('priority')}>
                  {priorityOptions.map(p => (
                    <option key={p} value={p}>{getPriorityLabel(t, p)}</option>
                  ))}
                </select>
                {errors.priority && <div className="text-red-500 text-sm mt-1">{errors.priority.message}</div>}
              </div>
              <div>
                <label className="block font-semibold mb-2 text-blue-800">{t.dueDate}</label>
                <input type="date" className="border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition-all duration-200" {...register('dueDate')} />
                {errors.dueDate && <div className="text-red-500 text-sm mt-1">{errors.dueDate.message}</div>}
              </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-xl shadow-lg hover:scale-105 hover:shadow-blue-400/40 transition-all duration-200 font-semibold text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.create : t.create}
                </button>
            </form>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Modal for editing work order */}
        {editModal.open && (
          <EditModalWithEscape
            onClose={() => setEditModal({ open: false, workOrder: null })}
            handleEditSubmit={handleEditSubmit}
            onEdit={onEdit}
            editRegister={editRegister}
            editErrors={editErrors}
            isEditSubmitting={isEditSubmitting}
            priorityOptions={priorityOptions}
            editModal={editModal}
            queryClient={queryClient}
          />
        )}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1 w-full md:w-auto">
            <option value="">{t.allStatuses}</option>
            {statusOptions.map(s => <option key={s} value={s}>{getStatusLabel(t, s)}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="border rounded px-2 py-1 w-full md:w-auto">
            <option value="">{t.allPriorities}</option>
            {priorityOptions.map(p => <option key={p} value={p}>{getPriorityLabel(t, p)}</option>)}
          </select>
          <select value={technician} onChange={e => setTechnician(e.target.value)} className="border rounded px-2 py-1 w-full md:w-auto">
            {technicianOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
          </select>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="border rounded px-2 py-1 w-full md:w-auto">
            {locationOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <label className="font-medium mr-1">{t.startDate || 'Start Date'}:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border rounded px-2 py-1 w-full md:w-auto"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="font-medium mr-1">{t.endDate || 'End Date'}:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border rounded px-2 py-1 w-full md:w-auto"
            />
          </div>
          <input
            type="text"
            placeholder={t.search}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="border rounded px-2 py-1 w-full md:w-auto"
          />
        </div>
      </div>
      {isLoading ? (
        <div>{t.loading}</div>
      ) : error ? (
        <div className="text-red-600">{t.errorLoading}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="flex flex-col md:flex-row gap-8 overflow-x-auto pb-12 px-8 min-w-[1200px] pt-4">
            {statusOptions.map(status => (
              <DroppableColumn status={status} key={status}>
                <SortableContext
                  id={status}
                  items={filteredGrouped[status]?.map((wo: WorkOrderResponse) => wo.id.toString()) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 flex flex-col gap-4">
                    {(filteredGrouped[status]?.length ?? 0) === 0 ? (
                      <div className="text-gray-400 text-center">{t.noWorkOrders}</div>
                    ) : (
                      filteredGrouped[status]?.map((wo: WorkOrderResponse) => (
                        <SortableCard key={wo.id} workOrder={wo} />
                      )))
                    }
                  </div>
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
      <div className="flex flex-col md:flex-row gap-2 mt-4 items-center justify-center md:justify-start">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 w-full md:w-auto"
        >{t.prev}</button>
        <span className="text-center md:text-left">{t.page} {data ? data.number + 1 : 1} {t.of} {data ? data.totalPages : 1}</span>
        <button
          onClick={() => setPage(p => (data && p < data.totalPages - 1 ? p + 1 : p))}
          disabled={data ? page >= data.totalPages - 1 : true}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 w-full md:w-auto"
        >{t.next}</button>
      </div>
    </div>
  );
}

export default AdminWorkOrdersPage;

// --- Priority and Status translation keys ---
// Instead of t.priorityLow, t.statusOpen, etc., use t.priority + ' (Low)', etc., or extend lang.ts
// For now, fallback to English/French labels if not present
const getPriorityLabel = (t: any, p: string) => {
  if (t[`priority_${p.toLowerCase()}`]) return t[`priority_${p.toLowerCase()}`];
  switch (p) {
    case 'LOW': return t.priorityLow || 'Low';
    case 'MEDIUM': return t.priorityMedium || 'Medium';
    case 'HIGH': return t.priorityHigh || 'High';
    case 'URGENT': return t.priorityUrgent || 'Urgent';
    default: return p;
  }
};
const getStatusLabel = (t: any, s: string) => {
  if (t[`status_${s.toLowerCase()}`]) return t[`status_${s.toLowerCase()}`];
  switch (s) {
    case 'OPEN': return t.statusOpen || 'Open';
    case 'ASSIGNED': return t.statusAssigned || 'Assigned';
    case 'IN_PROGRESS': return t.statusInProgress || 'In Progress';
    case 'COMPLETED': return t.statusCompleted || 'Completed';
    case 'CANCELLED': return t.statusCancelled || 'Cancelled';
    default: return s;
  }
};
