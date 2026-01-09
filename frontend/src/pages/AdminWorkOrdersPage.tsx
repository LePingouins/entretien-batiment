// Edit modal with Escape key handler
function EditModalWithEscape({ onClose, handleEditSubmit, onEdit, editRegister, editErrors, isEditSubmitting, priorityOptions, editModal, queryClient, colorScheme }: any) {
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

  // Dark mode classes
  const overlayClass = colorScheme === 'dark' ? 'bg-black/60' : 'bg-black/40';
  const containerClass = colorScheme === 'dark' 
    ? 'bg-[#1a1f2e] border border-[#2d3748] text-[#e2e8f0]' 
    : 'bg-white';
  const labelClass = colorScheme === 'dark' ? 'text-[#94a3b8]' : '';
  const inputClass = colorScheme === 'dark' 
    ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' 
    : '';
  const titleClass = colorScheme === 'dark' ? 'text-[#e2e8f0]' : '';
  const closeBtnClass = colorScheme === 'dark' 
    ? 'text-[#94a3b8] hover:text-red-400 bg-transparent' 
    : '';

  return (
    <div className={`${styles.modalOverlay} ${overlayClass}`}>
      <div ref={modalRef} className={`${styles.modalContainer} ${containerClass}`}>
        <button
          className={`${styles.modalCloseBtn} ${closeBtnClass}`}
          onClick={onClose}
        >✕</button>
        <h2 className={`${styles.modalTitle} ${titleClass}`}>{t.editWorkOrder}</h2>
        <form onSubmit={handleEditSubmit(onEdit)} className={styles.formEditModal}>
          <div>
            <label className={`${styles.label} ${labelClass}`}>{t.title}</label>
            <input className={`${styles.input} ${inputClass}`} {...editRegister('title')} />
            {editErrors.title && <div className={styles.errorMsg}>{editErrors.title.message}</div>}
          </div>
          <div>
            <label className={`${styles.label} ${labelClass}`}>{t.description}</label>
            <textarea className={`${styles.input} ${inputClass}`} {...editRegister('description')} />
            {editErrors.description && <div className={styles.errorMsg}>{editErrors.description.message}</div>}
          </div>
          <div>
            <label className={`${styles.label} ${labelClass}`}>{t.location}</label>
            <select className={`${styles.input} ${inputClass}`} {...editRegister('location')}>
              <option value="" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>-- Select Location --</option>
              <option value="horizon-nature" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Horizon Nature</option>
              <option value="inewa" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Inewa</option>
            </select>
            {editErrors.location && <div className={styles.errorMsg}>{editErrors.location.message}</div>}
          </div>
          <div>
            <label className={`${styles.label} ${labelClass}`}>{t.priority}</label>
            <select className={`${styles.input} ${inputClass}`} {...editRegister('priority')}>
              {priorityOptions.map((p: string) => (
                <option key={p} value={p} className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>{getPriorityLabel(t, p)}</option>
              ))}
            </select>
            {editErrors.priority && <div className={styles.errorMsg}>{editErrors.priority.message}</div>}
          </div>
          <div>
            <label className={`${styles.label} ${labelClass}`}>{t.dueDate}</label>
            <input type="date" className={`${styles.input} ${inputClass} ${colorScheme === 'dark' ? '[color-scheme:dark]' : ''}`} {...editRegister('dueDate')} />
            {editErrors.dueDate && <div className={styles.errorMsg}>{editErrors.dueDate.message}</div>}
          </div>
          <div className={styles.modalBtnRow}>
            <button
              type="submit"
              className={colorScheme === 'dark' ? 'bg-[#3b82f6] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2563eb] transition-colors' : styles.saveBtn}
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? t.saveChanges : t.saveChanges}
            </button>
            <button
              type="button"
              className={colorScheme === 'dark' ? 'bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-medium hover:bg-red-600/30 transition-colors' : styles.deleteBtn}
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { WorkOrderResponse, PageResponse, WorkOrderStatus, WorkOrderPriority } from '../types/api';
import { WorkOrderCard } from '../components/WorkOrderCard';
import { MaterialsDrawer } from '../components/MaterialsDrawer';
import { useLang } from '../context/LangContext';
import { useOutletContext } from 'react-router-dom';
import { ColorSchemeType, getColorSchemeClass } from './AdminWorkOrders/colorSchemes';
import styles from './AdminWorkOrders/AdminWorkOrdersPage.module.css';
import { workOrderSchema, WorkOrderFormType } from './AdminWorkOrders/schemas';
import { DndBoard } from './AdminWorkOrders/dndBoard';
import { FilterBar } from './AdminWorkOrders/FilterBar';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';



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

const statusOptions = Object.values(WorkOrderStatus);
const priorityOptions = Object.values(WorkOrderPriority);


function AdminWorkOrdersPage() {
    // Add refs for date inputs
    const startDateInputRef = React.useRef<HTMLInputElement | null>(null);
    const endDateInputRef = React.useRef<HTMLInputElement | null>(null);
  // Materials drawer state
  const [materialsDrawer, setMaterialsDrawer] = React.useState<{ open: boolean; workOrder: WorkOrderResponse | null }>({ open: false, workOrder: null });

  // Handler to open materials drawer
  const handleOpenMaterials = (wo: WorkOrderResponse) => {
    setMaterialsDrawer({ open: true, workOrder: wo });
  };



  // Update board state for materials count/preview after CRUD
  const handleMaterialsChanged = (materials: import('../types/api').MaterialResponse[]) => {
    if (!materialsDrawer.workOrder) return;
    setGrouped((prev: Record<string, WorkOrderResponse[]>) => {
      const updated: Record<string, WorkOrderResponse[]> = { ...prev };
      for (const status of statusOptions) {
        updated[status] = updated[status]?.map((wo: WorkOrderResponse) =>
          wo.id === materialsDrawer.workOrder!.id
            ? { ...wo, materialsCount: materials.length, materialsPreview: materials.slice(0, 2).map((m) => m.name) }
            : wo
        );
      }
      return updated;
    });
  };
  // Modal state for creating work order
  const [showModal, setShowModal] = React.useState(false);
  // Close modal on Escape key
  React.useEffect(() => {
    if (!showModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showModal]);
  const { t } = useLang();
  // Get color scheme from context
  const outlet = useOutletContext<{ colorScheme: ColorSchemeType }>();
  const colorScheme: ColorSchemeType = outlet?.colorScheme || 'default';
  // Modal state for editing work order
  const [editModal, setEditModal] = React.useState<{ open: boolean; workOrder: WorkOrderResponse | null }>({ open: false, workOrder: null });
  const queryClient = useQueryClient();



    // Zod schema for form validation (from extracted module)
    const {
      register,
      handleSubmit,
      reset,
      setValue,
      watch,
      formState: { errors, isSubmitting },
    } = useForm<WorkOrderFormType>({ resolver: zodResolver(workOrderSchema) });

    // Watch files for preview
    const files = watch('files');

    const onCreate: SubmitHandler<WorkOrderFormType> = async (data) => {
      try {
        // Prepare form data for file upload
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('location', data.location);
        formData.append('priority', data.priority);
        formData.append('dueDate', data.dueDate);
        if (data.files && data.files.length > 0) {
          for (let i = 0; i < data.files.length; i++) {
            formData.append('files', data.files[i]);
          }
        }
        // Note: Backend must support multipart/form-data for this to work
        await api.post('/api/admin/work-orders', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setShowModal(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
      } catch (err) {
        alert('Failed to create work order');
      }
    };



    // Edit form state (reuse schema from module)
    const {
      register: editRegister,
      handleSubmit: handleEditSubmit,
      reset: editReset,
      formState: { errors: editErrors, isSubmitting: isEditSubmitting },
      setValue: setEditValue,
    } = useForm<WorkOrderFormType>({ resolver: zodResolver(workOrderSchema) });

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
    const onEdit: SubmitHandler<WorkOrderFormType> = async (data) => {
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
    { id: 'horizon-nature', name: 'Horizon Nature' },
    { id: 'inewa', name: 'Inewa' },
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


  // dnd-kit sensors are now handled in DndBoard module

  // Drag state for DragOverlay

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeWorkOrder = React.useMemo(() => {
    if (!activeId) return null;
    for (const status of statusOptions) {
      const found = grouped[status]?.find((wo: WorkOrderResponse) => wo.id.toString() === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, grouped]);

  // Handle drag start
  const onDragStart = (event: any) => {
    setActiveId(event.active.id);
    console.log('[DnD] Drag Start:', {
      activeId: event.active.id,
      grouped,
    });
  };

  // Handle drag end
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    console.log('[DnD] Drag End:', {
      activeId: active?.id,
      overId: over?.id,
      grouped,
    });
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
  const SortableCard = React.memo(({ workOrder, colorScheme }: { workOrder: WorkOrderResponse, colorScheme?: string }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: workOrder.id.toString(),
    });
    const style = React.useMemo(() => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging || activeId === workOrder.id.toString() ? 0 : 1,
      cursor: 'pointer',
    }), [transform, transition, isDragging, activeId, workOrder.id]);
    const handleClick = React.useCallback((e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      openEditModal(workOrder);
    }, [workOrder]);

    // Dynamic placeholder height logic
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [cardHeight, setCardHeight] = React.useState<number | undefined>(undefined);

    React.useLayoutEffect(() => {
      if (!isDragging && cardRef.current) {
        setCardHeight(cardRef.current.offsetHeight);
      }
    }, [isDragging]);

    if (isDragging || activeId === workOrder.id.toString()) {
      // Render a placeholder with the measured card height
      return <div ref={setNodeRef} style={{ height: cardHeight || 160, marginBottom: 16 }} />;
    }
    return (
      <div
        ref={el => {
          setNodeRef(el);
          cardRef.current = el;
        }}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
      >
        <WorkOrderCard
          workOrder={workOrder}
          onOpenMaterials={handleOpenMaterials}
          onDeleted={() => queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] })}
        />
      </div>
    );
  });

  // Droppable column wrapper
  const DroppableColumn = React.memo(({ status, children, colorScheme }: { status: string; children: React.ReactNode; colorScheme?: string }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const { t } = useLang();
    const statusIcons: Record<string, React.ReactElement> = React.useMemo(() => ({
      OPEN: <svg width="20" height="20" fill="currentColor" className="text-teal-500" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>,
      ASSIGNED: (
        <svg width="24" height="24" fill="none" className="text-blue-500" viewBox="0 0 24 24">
          <rect x="4" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="white"/>
          <path d="M16 18l2-2c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-2 2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M14.5 17.5l-2-2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="18" cy="18" r="0.7" fill="currentColor" />
        </svg>
      ),
      IN_PROGRESS: (
        <svg width="24" height="24" fill="none" className="text-yellow-500" viewBox="0 0 24 24">
          <path d="M6 4h12M6 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 4c0 4 4 4 4 8s-4 4-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 4c0 4-4 4-4 8s4 4 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      COMPLETED: <svg width="28" height="28" fill="none" className="text-green-500" viewBox="0 0 28 28"><path d="M7 15l6 6 8-12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      CANCELLED: <svg width="24" height="24" fill="currentColor" className="text-red-600 font-bold" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M7 7l10 10M7 17L17 7"/></svg>,
    }), []);
    return (
      <div
        ref={setNodeRef}
        className={
          colorScheme === 'dark'
            ? `w-full h-full bg-[#1a1f2e] rounded-2xl shadow-lg p-4 flex flex-col border border-[#2d3748] transition-all duration-200 ${isOver ? 'ring-2 ring-[#3b82f6] scale-[1.02]' : ''}`
            : (colorScheme === 'default' || colorScheme === 'performance')
              ? `w-full h-full bg-white rounded-2xl shadow p-4 flex flex-col border border-gray-200 transition-all duration-200 ${isOver ? 'ring-2 ring-gray-400 scale-[1.02]' : ''}`
              : `w-full h-full bg-gradient-to-br from-blue-200/80 to-purple-100/40 rounded-2xl shadow-xl p-4 flex flex-col border-2 border-blue-300/40 transition-all duration-200 backdrop-blur-md ${isOver ? 'ring-4 ring-blue-400/60 scale-[1.02]' : ''}`
        }
        style={{ minHeight: 350 }}
      >
        <div className={
          colorScheme === 'dark'
            ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-[#252d3d] text-[#e2e8f0] flex items-center gap-2 border-b border-[#2d3748] shadow'
            : colorScheme === 'default'
              ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-white text-gray-800 flex items-center gap-2 border-b border-gray-200 shadow'
              : colorScheme === 'performance'
                ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-gray-100 text-gray-800 flex items-center gap-2 border-b border-gray-200'
                : 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-blue-200/60 text-blue-900 flex items-center gap-2 shadow'
        }>
          {status === 'CANCELLED'
            ? <svg width="20" height="20" fill="currentColor" className="text-red-600 font-bold" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M7 7l10 10M7 17L17 7"/></svg>
            : statusIcons[status]
          }
          <span className="flex items-center gap-1 truncate">
            {getStatusLabel(t, status)}
          </span>
        </div>
        {children}
      </div>
    );
  });

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
    <div className={styles.wrapper + ' ' + getColorSchemeClass(colorScheme, 'wrapper')}>
      <h1 className={`text-3xl md:text-4xl font-extrabold mb-3 text-center tracking-tight drop-shadow-sm mt-2 ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : 'text-blue-900'}`}>Work Order</h1>
      {/* Materials Drawer (should be at root, not inside cards) */}
      <MaterialsDrawer
        isOpen={materialsDrawer.open}
        workOrderId={materialsDrawer.workOrder?.id || 0}
        workOrderTitle={materialsDrawer.workOrder?.title}
        onClose={() => setMaterialsDrawer({ open: false, workOrder: null })}
        onMaterialsChanged={handleMaterialsChanged}
      />
      {/* Modal for creating work order */}
      {showModal && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto ${colorScheme === 'dark' ? 'bg-black/60' : 'bg-black/40'}`}
          onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-md relative my-4 max-h-[90vh] overflow-y-auto ${colorScheme === 'dark' ? 'bg-[#1a1f2e] border border-[#2d3748]' : 'bg-white/95 backdrop-blur-md border border-blue-200'}`}>
            <button
              className={`absolute top-2.5 right-3.5 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors ${colorScheme === 'dark' ? 'text-[#94a3b8] hover:text-red-400 hover:bg-[#252d3d]' : 'text-red-400 hover:bg-red-50 border border-red-200'}`}
              aria-label="Close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : 'text-blue-900'}`}><svg width="18" height="18" fill="currentColor" className={colorScheme === 'dark' ? 'text-[#3b82f6]' : 'text-blue-400'} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>{t.newWorkOrder}</h2>
            <form onSubmit={handleSubmit(onCreate)} className={styles.form + ' flex flex-col gap-4'}>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.title}</label>
                <input className={`${styles.input} ${colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : ''}`} {...register('title')} />
                {errors.title && <div className={styles.errorMsg}>{errors.title.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.description}</label>
                <textarea className={`${styles.input} ${colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : ''}`} rows={3} {...register('description')} />
                {errors.description && <div className={styles.errorMsg}>{errors.description.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.location}</label>
                <select className={`${styles.input} ${colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : ''}`} {...register('location')}>
                  <option value="" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>-- {t.selectLocation || 'Select Location'} --</option>
                  <option value="horizon-nature" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Horizon Nature</option>
                  <option value="inewa" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Inewa</option>
                </select>
                {errors.location && <div className={styles.errorMsg}>{errors.location.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.priority}</label>
                <select className={`${styles.input} ${colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : ''}`} {...register('priority')}>
                  {priorityOptions.map(p => (
                    <option key={p} value={p} className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>{getPriorityLabel(t, p)}</option>
                  ))}
                </select>
                {errors.priority && <div className={styles.errorMsg}>{errors.priority.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.dueDate}</label>
                <input
                  type="date"
                  className={`${styles.input} cursor-pointer ${colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6] [color-scheme:dark]' : ''}`}
                  {...register('dueDate')}
                  onClick={e => {
                    const input = e.target as HTMLInputElement;
                    if (typeof input.showPicker === 'function') input.showPicker();
                  }}
                />
                {errors.dueDate && <div className={styles.errorMsg}>{errors.dueDate.message}</div>}
              </div>
              {/* File/Photo Upload Section */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.attachments}</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 cursor-pointer ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`}
                  onChange={e => setValue('files', e.target.files)}
                  title={t.chooseFiles}
                />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-[#64748b]' : 'text-gray-500'}`}>
                  {files && files.length > 0
                    ? Array.from(files as File[]).map(f => f.name).join(', ')
                    : t.noFileChosen}
                </div>
                {files && files.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {Array.from(files as File[]).map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className={`w-12 h-12 object-cover rounded ${colorScheme === 'dark' ? 'border border-[#2d3748]' : 'border'}`}
                            onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                        ) : (
                          <span className={`w-12 h-12 flex items-center justify-center border rounded text-xs ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#64748b]' : 'bg-gray-100 text-gray-500'}`}>File</span>
                        )}
                        <span className={`truncate text-sm ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : ''}`}>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className={`px-6 py-2 rounded-xl shadow-lg transition-all duration-200 font-semibold text-base mt-2 ${colorScheme === 'dark' ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 hover:shadow-blue-400/40'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.create : t.create}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* New blue background wrapper starts here */}
      <div
        className={styles.boardWrapper + ' ' + (
          colorScheme === 'dark'
            ? 'bg-[#1a1f2e] rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-[#2d3748]'
            : colorScheme === 'performance'
              ? 'bg-gray-100 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-gray-200'
              : colorScheme === 'current'
                ? 'bg-blue-50 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-blue-100'
                : 'bg-blue-100/60 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-blue-200'
        )}
      >
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
            colorScheme={colorScheme}
          />
        )}
        <div className="w-full">
          <div className="w-full flex items-start gap-3 relative">
            {/* Filter bar extracted as a component */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <FilterBar
                status={status}
                setStatus={setStatus}
                statusOptions={statusOptions}
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
                getStatusLabel={getStatusLabel}
                getPriorityLabel={getPriorityLabel}
              />
            </div>
            <div className="flex-shrink-0">
              <button
                className={
                  colorScheme === 'dark'
                    ? 'bg-[#3b82f6] text-white px-3 sm:px-5 py-2 rounded-lg shadow-lg hover:bg-[#2563eb] transition-all duration-200 font-semibold text-sm sm:text-base flex items-center whitespace-nowrap'
                    : (colorScheme === 'performance' || colorScheme === 'default')
                      ? 'bg-white text-gray-800 border border-gray-300 px-3 sm:px-5 py-2 rounded-lg shadow hover:bg-gray-100 transition-all duration-200 font-semibold text-sm sm:text-base flex items-center whitespace-nowrap'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-5 py-2 rounded-lg shadow-lg hover:scale-105 hover:shadow-blue-400/40 transition-all duration-200 font-semibold text-sm sm:text-base flex items-center whitespace-nowrap'
                }
                onClick={() => setShowModal(true)}
              >
                <span className="align-middle">{t.newWorkOrder}</span>
              </button>
            </div>
          </div>
        </div>
        {/* Board and controls inside blue background */}
        {isLoading ? (
          <div>{t.loading}</div>
        ) : error ? (
          <div className={styles.errorMsg}>{t.errorLoading}</div>
        ) : (
          <DndBoard
            grouped={filteredGrouped}
            statusOptions={statusOptions}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            activeWorkOrder={activeWorkOrder}
            colorScheme={colorScheme}
            DroppableColumn={DroppableColumn}
            SortableCard={SortableCard}
          />
        )}
        {/* Hide pagination if only one or zero pages */}
        {(data && data.totalPages > 1) && (
          <div className={styles.paginationRow}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={colorScheme === 'dark' ? 'px-4 py-1.5 rounded-lg bg-[#252d3d] text-[#e2e8f0] border border-[#2d3748] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition-colors' : styles.paginationBtn}
            >{t.prev}</button>
            <span className={colorScheme === 'dark' ? 'text-[#94a3b8]' : styles.paginationText}>{t.page} {data ? data.number + 1 : 1} {t.of} {data ? data.totalPages : 1}</span>
            <button
              onClick={() => setPage(p => (data && p < data.totalPages - 1 ? p + 1 : p))}
              disabled={data ? page >= data.totalPages - 1 : true}
              className={colorScheme === 'dark' ? 'px-4 py-1.5 rounded-lg bg-[#252d3d] text-[#e2e8f0] border border-[#2d3748] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition-colors' : styles.paginationBtn}
            >{t.next}</button>
          </div>
        )}
      </div>
      {/* End blue background wrapper */}
    </div>
  );
}

export default AdminWorkOrdersPage;

// (moved above for correct hoisting)
