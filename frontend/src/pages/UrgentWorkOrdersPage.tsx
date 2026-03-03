
import React, { Suspense } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DndContext, closestCenter, rectIntersection, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, CollisionDetection, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import api, { getUrgentWorkOrders, updateUrgentWorkOrder, deleteUrgentWorkOrder, archiveUrgentWorkOrder, createUrgentWorkOrder } from '../lib/api';
import { UrgentWorkOrderResponse, UrgentWorkOrderRequest, UrgentWorkOrderStatus } from '../types/api';
import { ColorSchemeType } from './AdminWorkOrders/colorSchemes';
import { useLang } from '../context/LangContext';
import { WorkOrderCard } from '../components/WorkOrderCard';
import { UrgentWorkOrderCard } from '../components/UrgentWorkOrderCard';
import { SharedEditModal } from '../components/SharedEditModal';
import { FilterBar } from './AdminWorkOrders/FilterBar';
import { MaterialsDrawer } from '../components/MaterialsDrawer';
import { getColorSchemeClass } from './AdminWorkOrders/colorSchemes';
import styles from './AdminWorkOrders/AdminWorkOrdersPage.module.css';
import PageHeader from '../components/PageHeader';

// Reusable modal component for creating/updating
const UrgentWorkOrderModal = ({
  open,
  onClose,
  title,
  children,
  colorScheme,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colorScheme: ColorSchemeType;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-lg rounded-xl shadow-2xl transform transition-all animate-scaleIn max-h-[90vh] overflow-y-auto ${
          colorScheme === 'dark' ? 'bg-surface-800 text-surface-50 border border-surface-700' : 'bg-white text-gray-900'
        }`}
      >
        <div className={`flex justify-between items-center p-5 border-b ${colorScheme === 'dark' ? 'border-surface-700' : 'border-gray-100'}`}>
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${colorScheme === 'dark' ? 'hover:bg-surface-700 text-surface-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const STATUS_IDS = ['IN_PROGRESS', 'COMPLETED'];
const BOTTOM_ZONE_PREFIX = 'bottom-';
const getBottomZoneId = (status: string) => `${BOTTOM_ZONE_PREFIX}${status}`;
const isBottomZone = (id: string) => id.startsWith(BOTTOM_ZONE_PREFIX);
const getStatusFromBottomZone = (id: string) => id.replace(BOTTOM_ZONE_PREFIX, '');

// Use only rectIntersection for reliable column hitboxes
const customCollisionDetection: CollisionDetection = rectIntersection;

function BottomDropZone({ status, colorScheme, hasItems }: { status: string; colorScheme: string; hasItems: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: getBottomZoneId(status) });
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 rounded-lg border-2 border-dashed transition-all duration-200 ${isOver 
        ? colorScheme === 'dark'
          ? 'border-brand-400 bg-brand-500/20 min-h-[60px]'
          : 'border-brand-400 bg-brand-50 min-h-[60px]'
        : colorScheme === 'dark'
          ? 'border-transparent hover:border-gray-600 min-h-[40px]'
          : 'border-transparent hover:border-gray-300 min-h-[40px]'} ${hasItems ? '' : 'hidden'}`}
      style={{ flexShrink: 0 }}
    >
      {isOver && (
        <div className={`text-center py-3 text-sm ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-600'}`}>Drop here to add at end</div>
      )}
    </div>
  );
}

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );
}

function UrgentDndBoard({ columns, workOrders, onMove, onOpenMaterials, onDeleted, onCardClick, onEdit, onArchive }: any) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeWorkOrder, setActiveWorkOrder] = React.useState<any>(null);
  const sensors = useDndSensors();

  const findWorkOrder = (id: any) => workOrders.find((w: any) => w.id.toString() === id);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setActiveWorkOrder(findWorkOrder(event.active.id));
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    setActiveWorkOrder(null);
    const { active, over } = event;
    console.log('DnD handleDragEnd', { active, over });
    if (!over || active.id === over.id) return;
    const from = workOrders.find((wo: any) => wo.id.toString() === active.id);
    const overCard = workOrders.find((wo: any) => wo.id.toString() === over.id);
    console.log('DnD debug', {
      activeId: active.id,
      overId: over.id,
      from,
      overCard,
      STATUS_IDS,
      isOverColumn: STATUS_IDS.includes(over.id),
      isOverCard: !!overCard
    });
    // If dropped on a column header, move to top of that column if changing status
    if (STATUS_IDS.includes(over.id)) {
      if (from && from.status !== over.id) {
        console.log('DnD: calling onMove for column', { activeId: active.id, overId: over.id });
        onMove(active.id, over.id, { atTop: true });
      }
      return;
    }
    // If dropped on a card
    if (overCard && from) {
      if (from.status !== overCard.status) {
        // Move to top of new column
        console.log('DnD: calling onMove for card (status change)', { activeId: active.id, overStatus: overCard.status });
        onMove(active.id, overCard.status, { atTop: true });
      } else {
        // Reorder within same column
        console.log('DnD: calling onMove for card (reorder)', { activeId: active.id, overId: over.id });
        onMove(active.id, over.id, { reorder: true });
      }
      return;
    }
    // Ignore other cases
    return;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 pb-12 px-2 sm:px-4 pt-4 w-full justify-evenly overflow-x-auto md:overflow-x-visible">
        {columns.map((column: any) => (
          <div className="flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col" key={column.id}>
            <DroppableColumnComponent status={column.id} colorScheme={column.colorScheme}>
              <SortableContext
                id={column.id}
                items={column.workOrders.map((w: any) => w.id.toString())}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 flex flex-col gap-4 min-h-[180px]">
                  {(column.workOrders.length ?? 0) === 0 ? (
                    <div className="text-gray-400 text-center py-4">No urgent work orders</div>
                  ) : (
                    column.workOrders.map((workOrder: any) => (
                      <SortableUrgentWorkOrderCard
                        key={workOrder.id}
                        id={workOrder.id.toString()}
                        workOrder={workOrder}
                        colorScheme={column.colorScheme}
                        activeId={activeId}
                        onOpenMaterials={onOpenMaterials}
                        onDeleted={onDeleted}
                        onCardClick={onCardClick}
                        onEdit={onEdit}
                        onArchive={onArchive}
                      />
                    ))
                  )}
                </div>
                <BottomDropZone status={column.id} colorScheme={column.colorScheme} hasItems={(column.workOrders.length ?? 0) > 0} />
              </SortableContext>
            </DroppableColumnComponent>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeWorkOrder ? (
          <UrgentWorkOrderCard
            workOrder={activeWorkOrder}
            colorScheme={columns.find((col: any) => col.workOrders.some((w: any) => w.id.toString() === activeWorkOrder.id))?.colorScheme || 'default'}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const statusOptions = ['IN_PROGRESS', 'COMPLETED'];
const statusIconsMap: Record<string, React.ReactElement> = {
  IN_PROGRESS: (
    <svg width="24" height="24" fill="none" className="text-yellow-500" viewBox="0 0 24 24">
      <path d="M6 4h12M6 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 4c0 4 4 4 4 8s-4 4-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 4c0 4-4 4-4 8s4 4 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  COMPLETED: <svg width="28" height="28" fill="none" className="text-green-500" viewBox="0 0 28 28"><path d="M7 15l6 6 8-12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function SortableUrgentWorkOrderCard(props: any) {
  const { id, workOrder, colorScheme, activeId, onOpenMaterials, onDeleted, onCardClick, onEdit, onArchive } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  
  const isActive = activeId === id;
  const isBeingDragged = isDragging || isActive;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isBeingDragged ? 0.3 : 1,
    cursor: 'grab',
    touchAction: 'none',
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UrgentWorkOrderCard
        workOrder={workOrder}
        colorScheme={colorScheme}
        onDelete={onDeleted ? () => onDeleted(workOrder.id) : undefined}
        onEdit={onEdit ? () => onEdit(workOrder) : undefined}
        onArchive={onArchive ? () => onArchive(workOrder.id) : undefined}
      />
    </div>
  );
}

interface DroppableColumnProps {
  status: string;
  children: React.ReactNode;
  colorScheme?: string;
}

const DroppableColumnComponent = ({ status, children, colorScheme }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { t } = useLang();
  
  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'IN_PROGRESS': return t.statusInProgress || 'In Progress';
      case 'COMPLETED': return t.statusCompleted || 'Completed';
      default: return s;
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      className={
        colorScheme === 'dark'
          ? `w-full h-full bg-surface-800 rounded-xl shadow-card p-4 flex flex-col border border-surface-700 transition-all duration-200 ${isOver ? 'ring-2 ring-brand-500' : ''}`
          : (colorScheme === 'default' || colorScheme === 'performance')
            ? `w-full h-full bg-white rounded-xl shadow p-4 flex flex-col border border-gray-200 transition-all duration-200 ${isOver ? 'ring-2 ring-gray-400' : ''}`
            : `w-full h-full bg-white/60 backdrop-blur-md rounded-xl shadow-card p-4 flex flex-col border-2 border-brand-200/40 transition-all duration-200 ${isOver ? 'ring-4 ring-brand-400/60' : ''}`
      }
      style={{ minHeight: 350 }}
    >
      <div className={
        colorScheme === 'dark'
          ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-surface-700 text-surface-100 flex items-center gap-2 border-b border-surface-700 shadow'
          : colorScheme === 'default'
            ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-white text-gray-800 flex items-center gap-2 border-b border-gray-200 shadow'
            : colorScheme === 'performance'
              ? 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-gray-100 text-gray-800 flex items-center gap-2 border-b border-gray-200'
              : 'font-bold text-sm mb-3 px-2 py-2 rounded-lg bg-brand-50/60 text-surface-900 flex items-center gap-2 shadow'
      }>
        {statusIconsMap[status]}
        <span className="flex items-center gap-1 truncate">
          {getStatusLabel(status)}
        </span>
      </div>
      {children}
    </div>
  );
};


function UrgentWorkOrdersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // Modal state for creating urgent work order
    const [showModal, setShowModal] = React.useState(false);
    
    // Auto-open modal if query param is set
    React.useEffect(() => {
      if (searchParams.get('action') === 'create') {
        setShowModal(true);
        // Remove the param so it doesn't reopen on refresh
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('action');
          return newParams;
        }, { replace: true });
      }
    }, [searchParams, setSearchParams]);

    const [editModal, setEditModal] = React.useState<{ open: boolean; workOrder: UrgentWorkOrderResponse | null }>({ open: false, workOrder: null });
    const {
      register: editRegister,
      handleSubmit: handleEditSubmit,
      reset: editReset,
      formState: { errors: editErrors, isSubmitting: isEditSubmitting },
      setValue: setEditValue,
      watch: editWatch,
    } = useForm<UrgentWorkOrderRequest & { dueDate?: string; priority?: string }>({});

    const editFiles = editWatch('files');

    const handleEdit = (workOrder: UrgentWorkOrderResponse) => {
      setEditModal({ open: true, workOrder });
      editReset({
        title: workOrder.title,
        description: workOrder.description,
        location: workOrder.location,
        // files is not set here
      });
      setEditValue('priority' as any, workOrder.priority);
      setEditValue('dueDate' as any, workOrder.dueDate?.slice(0, 10) || '');
    };

    const onEdit: SubmitHandler<UrgentWorkOrderRequest & { dueDate?: string; priority?: string }> = async (data) => {
      if (!editModal.workOrder) return;
      try {
        // Preserve previous sortIndex
        const prevSortIndex = editModal.workOrder.sortIndex;
        const prevStatus = editModal.workOrder.status;
        const updated = await updateUrgentWorkOrder(editModal.workOrder.id, {
          title: data.title,
          description: data.description,
          location: data.location,
          dueDate: data.dueDate || '',
          files: data.files,
        });
        setEditModal({ open: false, workOrder: null });
        editReset();
        // Optimistically update only the edited card, preserving order
        setOptimisticUrgentData((urgentData || []).map(wo =>
          wo.id === updated.id
            ? { ...updated, sortIndex: prevSortIndex, status: prevStatus }
            : wo
        ));
        queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
      } catch (err) {
        alert('Failed to update urgent work order');
      }
    };

    const queryClient = useQueryClient();
    const { colorScheme }: { colorScheme: ColorSchemeType } = useOutletContext() || { colorScheme: 'default' };
    const { t } = useLang();

    // Filters
    const [status, setStatus] = React.useState('');
    const [priority, setPriority] = React.useState('');
    const [q, setQ] = React.useState('');
    const [technician, setTechnician] = React.useState('');
    const [locationFilter, setLocationFilter] = React.useState('');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const startDateInputRef = React.useRef(null);
    const endDateInputRef = React.useRef(null);



    // Query all urgent work orders and group by status
    const [optimisticUrgentData, setOptimisticUrgentData] = React.useState<UrgentWorkOrderResponse[] | undefined>(undefined);
    const {
      data: urgentDataRaw,
      isLoading,
      error
    } = useQuery({
      queryKey: ['urgentWorkOrders', { status, q, location: locationFilter, technician, startDate, endDate }],
      queryFn: () => getUrgentWorkOrders({ status, q, location: locationFilter, technician, startDate, endDate }),
      refetchInterval: 30000,
      staleTime: 0,
    });
    const urgentData = optimisticUrgentData || urgentDataRaw;

    // Fix for "Add Manual" button
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setValue
  } = useForm<UrgentWorkOrderRequest & { dueDate?: string; priority?: string }>();

  const files = watch('files');

  const handleCreate = () => {
    reset();
    setValue('priority', 'URGENT');
    setShowModal(true);
  };



    const onSubmit: SubmitHandler<UrgentWorkOrderRequest & { dueDate?: string; priority?: string }> = async (data) => {
      try {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('location', data.location);
        if (data.priority) formData.append('priority', data.priority);
        // Ensure date is truncated or formatted correctly if needed
        if (data.dueDate) formData.append('dueDate', data.dueDate.length === 10 ? data.dueDate + 'T00:00:00' : data.dueDate);
        const filesArr = data.files instanceof FileList ? Array.from(data.files) : Array.isArray(data.files) ? data.files : [];
        for (let i = 0; i < filesArr.length; i++) {
          formData.append('files', filesArr[i]);
        }
        await api.post('/api/urgent-work-orders', formData);

        reset();
        setShowModal(false);
        queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
      } catch (err) {
        alert('Failed to create urgent work order');
      }
    };


    // Example options (customize as needed)
    const technicianOptions = [
      { id: '', name: t.allTechnicians || 'All Technicians' },
    ];
    // Dynamically extract unique locations from urgentData
    const locationOptions = React.useMemo(() => {
      const locations = Array.isArray(urgentData)
        ? Array.from(new Set(urgentData.map((wo: UrgentWorkOrderResponse) => wo.location).filter(Boolean)))
        : [];
      return [
        { id: '', name: t.allLocations || 'All Locations' },
        ...locations.map(loc => ({ id: loc, name: loc }))
      ];
    }, [urgentData, t.allLocations]);

    // Materials drawer state
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [drawerWorkOrderId, setDrawerWorkOrderId] = React.useState<number | null>(null);
    const [drawerWorkOrderTitle, setDrawerWorkOrderTitle] = React.useState<string | undefined>(undefined);

    // Handler to open drawer from card
    const handleOpenMaterials = (workOrder: UrgentWorkOrderResponse) => {
      setDrawerWorkOrderId(workOrder.id);
      setDrawerWorkOrderTitle(workOrder.title);
      setDrawerOpen(true);
    };

    // Make the materials drawer handler globally accessible for cards
    React.useEffect(() => {
      window.openMaterialsDrawer = handleOpenMaterials;
      return () => { delete window.openMaterialsDrawer; };
    }, []);
    const handleCloseDrawer = () => {
      setDrawerOpen(false);
      setDrawerWorkOrderId(null);
      setDrawerWorkOrderTitle(undefined);
    };


    // Group urgent work orders by status for board rendering
    const grouped = React.useMemo(() => {
      if (!Array.isArray(urgentData)) return { IN_PROGRESS: [], COMPLETED: [] };
      const inProgress = urgentData
        .filter((wo: UrgentWorkOrderResponse) => wo.status === 'IN_PROGRESS')
        .slice()
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      const completed = urgentData
        .filter((wo: UrgentWorkOrderResponse) => wo.status === 'COMPLETED')
        .slice()
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      return {
        IN_PROGRESS: inProgress,
        COMPLETED: completed,
      };
    }, [urgentData]);

    const handleArchive = async (id: number) => {
        // Optimistically remove from UI
        setOptimisticUrgentData((urgentData || []).filter((wo) => wo.id !== id));
        try {
          await archiveUrgentWorkOrder(id);
        } catch (e) {
          alert('Failed to archive urgent work order');
          setOptimisticUrgentData(undefined);
        } finally {
          queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
        }
      };

    // Drag and drop handlers
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeWorkOrder, setActiveWorkOrder] = React.useState<UrgentWorkOrderResponse | null>(null);
    const handleDragStart = (event: any) => {
      setActiveId(event.active.id);
      const found = Array.isArray(urgentData) ? urgentData.find((wo: UrgentWorkOrderResponse) => wo.id.toString() === event.active.id) || null : null;
      setActiveWorkOrder(found);
    };
    const handleDragEnd = async (event: any) => {
      setActiveId(null);
      setActiveWorkOrder(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = Array.isArray(urgentData) ? urgentData.find((wo: UrgentWorkOrderResponse) => wo.id.toString() === active.id) : null;
      if (!from) return;
      let newStatus: string | null = null;
      if (["IN_PROGRESS", "COMPLETED"].includes(over.id)) {
        newStatus = over.id as string;
      }
      if (newStatus && from.status !== newStatus) {
        // Optimistically update UI
        setOptimisticUrgentData(
          Array.isArray(urgentData)
            ? urgentData.map((wo: UrgentWorkOrderResponse) =>
                wo.id === from.id ? { ...wo, status: newStatus as UrgentWorkOrderStatus } : wo
              )
            : undefined
        );
        try {
          await updateUrgentWorkOrder(from.id, { status: newStatus });
        } catch (e) {
          // Revert on error
          setOptimisticUrgentData(undefined);
        } finally {
          queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
        }
      }
    };



    // ...
    // ...



  // Label helpers
  const getStatusLabel = (t: any, s: string) => {
    if (t[`status_${s.toLowerCase()}`]) return t[`status_${s.toLowerCase()}`];
    switch (s) {
      case 'IN_PROGRESS': return t.statusInProgress || 'In Progress';
      case 'COMPLETED': return t.statusCompleted || 'Completed';
      default: return s;
    }
  };
  const getPriorityLabel = (t: any, p: string) => {
    if (t[`priority_${p.toLowerCase()}`]) return t[`priority_${p.toLowerCase()}`];
    switch (p) {
      case 'URGENT': return t.priorityUrgent || 'Urgent';
      default: return p;
    }
  };

  return (
    <div className={(colorScheme === 'dark' ? 'flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8' : 'flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8')}>
      <PageHeader title={t.urgentWorkOrders || 'Urgent Work Orders'} />
      <div className="mb-8">
        <div className="w-full flex items-start gap-3 relative mb-4">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <FilterBar
              status={status}
              setStatus={setStatus}
              statusOptions={statusOptions}
              priority={''}
              setPriority={() => {}}
              priorityOptions={[]}
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
          <div className="flex-shrink-0 flex flex-col gap-0 self-stretch">
            <button
              className={
                colorScheme === 'dark'
                  ? 'bg-brand-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-card hover:bg-brand-700 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
                  : (colorScheme === 'performance' || colorScheme === 'default')
                    ? 'bg-white text-gray-800 border border-gray-300 px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
                    : 'bg-brand-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-card transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
              }
              onClick={() => setShowModal(true)}
            >
              <span className="align-middle">New Urgent Work Order</span>
            </button>
          </div>
        </div>
        {isLoading ? (
          <div>{t.loading}</div>
        ) : error ? (
          <div className="text-red-500 text-center">{t.errorLoading}</div>
        ) : (
          <>
            <UrgentDndBoard
              columns={[
                { id: 'IN_PROGRESS', workOrders: grouped.IN_PROGRESS, colorScheme },
                { id: 'COMPLETED', workOrders: grouped.COMPLETED, colorScheme },
              ]}
              workOrders={urgentData || []}
              onMove={async (activeId: any, overId: any, opts?: { atTop?: boolean; reorder?: boolean }) => {
                const from = (urgentData || []).find((wo) => wo.id.toString() === activeId);
                if (!from) return;
                // Handle status change (move to another column)
                if (["IN_PROGRESS", "COMPLETED"].includes(overId)) {
                  if (from.status !== overId) {
                    const newUrgentData = [
                      { ...from, status: overId },
                      ...((urgentData || []).filter((wo) => wo.status === overId && wo.id !== from.id)),
                      ...((urgentData || []).filter((wo) => wo.status !== overId && wo.id !== from.id)),
                    ];
                    setOptimisticUrgentData(newUrgentData);
                    try {
                      await updateUrgentWorkOrder(from.id, { status: overId });
                      const newOrder = [from.id, ...((urgentData || []).filter((wo) => wo.status === overId && wo.id !== from.id)).map(wo => wo.id)];
                      await import('../lib/api').then(api => api.reorderUrgentWorkOrders(overId, newOrder));
                      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] }), 300);
                    } catch (e) {
                      setOptimisticUrgentData(undefined);
                    } finally {
                      queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
                    }
                  }
                  return;
                }
                const overCard = (urgentData || []).find((wo) => wo.id.toString() === overId);
                if (overCard && from.status === overCard.status) {
                  const col = (urgentData || []).filter((wo) => wo.status === from.status);
                  const oldIndex = col.findIndex((wo) => wo.id.toString() === activeId);
                  const newIndex = col.findIndex((wo) => wo.id.toString() === overId);
                  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
                  const newCol = [...col];
                  const [moved] = newCol.splice(oldIndex, 1);
                  newCol.splice(newIndex, 0, moved);
                  const newUrgentData: UrgentWorkOrderResponse[] = [];
                  (urgentData || []).forEach(wo => {
                    if (wo.status !== from.status) {
                      newUrgentData.push(wo);
                    }
                  });
                  newCol.forEach(wo => {
                    newUrgentData.push(wo);
                  });
                  setOptimisticUrgentData([...newUrgentData]);
                  try {
                    await import('../lib/api').then(api => api.reorderUrgentWorkOrders(from.status, newCol.map(w => w.id)));
                    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] }), 300);
                  } catch (e) {
                    setOptimisticUrgentData(undefined);
                  } finally {
                    queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
                  }
                }
              }}
              onOpenMaterials={handleOpenMaterials}
              onDeleted={async (id: number) => {
                // Optimistically remove from UI
                setOptimisticUrgentData((urgentData || []).filter((wo) => wo.id !== id));
                try {
                  await deleteUrgentWorkOrder(id);
                } catch (e) {
                  alert('Failed to delete urgent work order');
                  setOptimisticUrgentData(undefined);
                } finally {
                  queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
                }
              }}
              onCardClick={() => {}}
              onEdit={handleEdit}
              onArchive={handleArchive}
            />
            {/* Materials Drawer for urgent work orders */}
            {drawerOpen && drawerWorkOrderId !== null && (
              <Suspense fallback={null}>
                <MaterialsDrawer
                  isOpen={drawerOpen}
                  workOrderId={drawerWorkOrderId}
                  workOrderTitle={drawerWorkOrderTitle}
                  onClose={handleCloseDrawer}
                  urgent={true}
                  onMaterialsChanged={(materials) => {
                    setOptimisticUrgentData((prev) => {
                      if (!prev) return prev;
                      return prev.map(wo => {
                        if (wo.id !== drawerWorkOrderId) return wo;
                        return {
                          ...wo,
                          materialsCount: materials.length,
                          materialsPreview: materials.slice(0, 2).map(m => m.name),
                        };
                      });
                    });
                  }}
                />
              </Suspense>
            )}
          </>
        )}
      </div>
      {showModal && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto ${colorScheme === 'dark' ? 'bg-black/60' : 'bg-black/40'}`}
          onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className={`rounded-xl shadow-card p-6 w-full max-w-md relative my-4 max-h-[90vh] overflow-y-auto ${colorScheme === 'dark' ? 'bg-surface-800 border border-surface-700' : 'bg-white/95 backdrop-blur-md border border-brand-200'}`}>
            <button
              className={`absolute top-2.5 right-3.5 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-red-400 hover:bg-surface-700' : 'text-red-400 hover:bg-red-50 border border-red-200'}`}
              aria-label="Close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${colorScheme === 'dark' ? 'text-surface-100' : 'text-surface-900'}`}>{t.urgentWorkOrders || 'Urgent Work Orders'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Due Date field (always use dueDate) */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>Due Date</label>
                <input
                  type="date"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100 focus:ring-brand-500' : 'focus:ring-brand-400'}`}
                  {...register('dueDate')}
                />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>{t.title}</label>
                <input className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100 focus:ring-brand-500' : 'focus:ring-brand-400'}`} {...register('title')} />
                {errors.title && <div className="text-red-500 text-xs">{errors.title.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>{t.description}</label>
                <textarea className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100 focus:ring-brand-500' : 'focus:ring-brand-400'}`} rows={3} {...register('description')} />
                {errors.description && <div className="text-red-500 text-xs">{errors.description.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>{t.location}</label>
                <select className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100 focus:ring-brand-500' : 'focus:ring-brand-400'}`} {...register('location')}>
                  <option value="" className={colorScheme === 'dark' ? 'bg-surface-700' : ''}>-- {t.selectLocation || 'Select Location'} --</option>
                  <option value="horizon-nature" className={colorScheme === 'dark' ? 'bg-surface-700' : ''}>Horizon Nature</option>
                  <option value="inewa" className={colorScheme === 'dark' ? 'bg-surface-700' : ''}>Inewa</option>
                </select>
                {errors.location && <div className="text-red-500 text-xs">{errors.location.message}</div>}
              </div>
              {/* File/Photo Upload Section */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-brand-700'}`}>{t.attachments || 'Attachments'}</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 cursor-pointer ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-100 focus:ring-brand-500' : 'focus:ring-brand-400'}`}
                  onChange={e => setValue('files', e.target.files ?? undefined)}
                  title={t.chooseFiles || 'Choose files'}
                />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>
                  {files && files.length > 0
                    ? Array.from(files as File[]).map(f => f.name).join(', ')
                    : t.noFileChosen || 'No file chosen'}
                </div>
                {files && files.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {Array.from(files as File[]).map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className={`w-12 h-12 object-cover rounded ${colorScheme === 'dark' ? 'border border-surface-700' : 'border'}`}
                            onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                        ) : (
                          <span className={`w-12 h-12 flex items-center justify-center border rounded text-xs ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-500' : 'bg-gray-100 text-gray-500'}`}>File</span>
                        )}
                        <span className={`truncate text-sm ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`px-6 py-2 rounded-xl shadow-card transition-all duration-200 font-semibold text-base mt-2 ${colorScheme === 'dark' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-brand-600 text-white'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.create : t.create}
              </button>
            </form>
          </div>
        </div>
      )}
      {editModal.open && (
        <SharedEditModal
          open={editModal.open}
          onClose={() => setEditModal({ open: false, workOrder: null })}
          title={'Edit Urgent Work Order'}
          onSubmit={handleEditSubmit(onEdit)}
          isSubmitting={isEditSubmitting}
          colorScheme={colorScheme}
          showDelete={true}
          deleteLabel={t.delete}
          onDelete={async () => {
            if (!editModal.workOrder) return;
            if (window.confirm(t.confirmDelete || 'Are you sure you want to delete this urgent work order?')) {
              try {
                await deleteUrgentWorkOrder(editModal.workOrder.id);
                setEditModal({ open: false, workOrder: null });
                queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
              } catch (err) {
                alert(t.errorLoading || 'Failed to delete urgent work order');
              }
            }
          }}
        >
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.title}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('title')} />
            {editErrors.title && <div className={styles.errorMsg}>{editErrors.title.message}</div>}
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.description}</label>
            <textarea className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} rows={3} {...editRegister('description')} />
            {editErrors.description && <div className={styles.errorMsg}>{editErrors.description.message}</div>}
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.location}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('location')} />
            {editErrors.location && <div className={styles.errorMsg}>{editErrors.location.message}</div>}
          </div>
          {/* No Priority field for UrgentWorkOrders */}
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.dueDate}</label>
            <input type="date" className={styles.input + ' ' + (colorScheme === 'dark' ? '[color-scheme:dark] !bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')} {...editRegister('dueDate' as any)} />
            {(editErrors as Record<string, any>).dueDate && <div className={styles.errorMsg}>{(editErrors as Record<string, any>).dueDate.message}</div>}
          </div>
          {/* File/Photo Upload Section */}
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-surface-400' : '')}>{t.attachments || 'Attachments'}</label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className={styles.input + ' cursor-pointer ' + (colorScheme === 'dark' ? '!bg-surface-700 !border-surface-700 !text-surface-100 focus:!border-brand-500' : '')}
              onChange={e => setEditValue('files', e.target.files ?? undefined)}
              title={t.chooseFiles || 'Choose files'}
            />
            <div className={"text-xs mt-1 " + (colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500')}>
              {editFiles && editFiles.length > 0
                ? Array.from(editFiles as File[]).map(f => f.name).join(', ')
                : t.noFileChosen || 'No file chosen'}
            </div>
            {editFiles && editFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
                {Array.from(editFiles as File[]).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className={`w-12 h-12 object-cover rounded ${colorScheme === 'dark' ? 'border border-surface-700' : 'border'}`}
                        onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
                    ) : (
                      <span className={`w-12 h-12 flex items-center justify-center border rounded text-xs ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-700 text-surface-500' : 'bg-gray-100 text-gray-500'}`}>File</span>
                    )}
                    <span className={`truncate text-sm ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SharedEditModal>
      )}
    </div>
  );
}

export default UrgentWorkOrdersPage;
