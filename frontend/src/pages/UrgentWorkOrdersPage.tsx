import { useDroppable } from '@dnd-kit/core';
// --- DnD Board Implementation (Refactored) ---
import { DndContext, closestCenter, rectIntersection, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

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
          ? 'border-blue-400 bg-blue-500/20 min-h-[60px]'
          : 'border-blue-400 bg-blue-100 min-h-[60px]'
        : colorScheme === 'dark'
          ? 'border-transparent hover:border-gray-600 min-h-[40px]'
          : 'border-transparent hover:border-gray-300 min-h-[40px]'} ${hasItems ? '' : 'hidden'}`}
      style={{ flexShrink: 0 }}
    >
      {isOver && (
        <div className={`text-center py-3 text-sm ${colorScheme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>Drop here to add at end</div>
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

function UrgentDndBoard({ columns, workOrders, onMove, onOpenMaterials, onDeleted, onCardClick, onEdit }: any) {
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
// --- End DnD Board Implementation (Refactored) ---
import * as React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUrgentWorkOrders, createUrgentWorkOrder, updateUrgentWorkOrder, deleteUrgentWorkOrder } from '../lib/api';
import { UrgentWorkOrderResponse, UrgentWorkOrderRequest, WorkOrderResponse, UrgentWorkOrderStatus } from '../types/api';
import { arrayMove } from '@dnd-kit/sortable';
// Remove duplicate CSS import
import { FilterBar } from './AdminWorkOrders/FilterBar';
import { ColorSchemeType } from './AdminWorkOrders/colorSchemes';
// Removed duplicate import

const statusOptions = ['IN_PROGRESS', 'COMPLETED'];
import { getColorSchemeClass } from './AdminWorkOrders/colorSchemes';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UrgentWorkOrderCard } from '../components/UrgentWorkOrderCard';
import { SharedEditModal } from '../components/SharedEditModal';
import styles from './AdminWorkOrders/AdminWorkOrdersPage.module.css';
// Sortable wrapper for urgent work order card
function SortableUrgentWorkOrderCard(props: any) {
  const { id, workOrder, colorScheme, activeId, onOpenMaterials, onDeleted, onCardClick, onEdit } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UrgentWorkOrderCard
        workOrder={workOrder}
        colorScheme={colorScheme}
        onDelete={onDeleted ? () => onDeleted(workOrder.id) : undefined}
        onEdit={onEdit ? () => onEdit(workOrder) : undefined}
      />
    </div>
  );
}
import { useOutletContext } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { MaterialsDrawer } from '../components/MaterialsDrawer';

const statusIconsMap: Record<string, React.ReactElement> = {
  IN_PROGRESS: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="text-yellow-500"><path d="M6 4h12M6 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 4c0 4 4 4 4 8s-4 4-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4c0 4-4 4-4 8s4 4 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  COMPLETED: (
    <svg width="24" height="24" fill="none" viewBox="0 0 28 28" className="text-green-500"><path d="M7 15l6 6 8-12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
};

const DroppableColumnComponent = ({ status, children, colorScheme }: { status: string; children: React.ReactNode; colorScheme?: string }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  // Accept only valid ColorSchemeType, fallback to 'default'
  const validSchemes: ColorSchemeType[] = ['current', 'performance', 'default', 'dark'];
  const scheme: ColorSchemeType = validSchemes.includes(colorScheme as ColorSchemeType)
    ? (colorScheme as ColorSchemeType)
    : 'default';
  const columnClass = getColorSchemeClass(scheme, 'column');
  const headerClass = getColorSchemeClass(scheme, 'header');
  return (
    <div
      ref={setNodeRef}
      data-droppable={status}
      className={
        columnClass +
        (scheme === 'dark'
          ? (isOver ? ' ring-2 ring-blue-400 bg-blue-900/30' : '')
          : (isOver ? ' ring-2 ring-blue-400 bg-blue-100' : ''))
      }
      style={{ boxSizing: 'border-box', minHeight: 320 }}
    >
      <div className={headerClass}>
        {statusIconsMap[status]}
        <span>{status === 'IN_PROGRESS' ? 'En cours' : 'Terminée'}</span>
      </div>
      <div className="flex flex-col gap-3" style={{ flex: 1, minHeight: 120 }}>
        {children}
      </div>
    </div>
  );
};

function UrgentWorkOrdersPage() {
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


    // Example options (customize as needed)
    const technicianOptions = [
      { id: '', name: t.allTechnicians || 'All Technicians' },
    ];
    const locationOptions = [
      { id: '', name: t.allLocations || 'All Locations' },
    ];

    // Query all urgent work orders and group by status
    const [optimisticUrgentData, setOptimisticUrgentData] = React.useState<UrgentWorkOrderResponse[] | undefined>(undefined);
    const {
      data: urgentDataRaw,
      isLoading,
      error
    } = useQuery({
      queryKey: ['urgentWorkOrders'],
      queryFn: getUrgentWorkOrders,
      refetchInterval: 30000,
      staleTime: 0,
    });
    const urgentData = optimisticUrgentData || urgentDataRaw;

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

  // Modal state for creating urgent work order
  const [showModal, setShowModal] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<UrgentWorkOrderRequest & { dueDate?: string }>({
    defaultValues: {},
  });
  const files = watch('files');

  const onCreate: SubmitHandler<any> = async (data) => {
    try {
      // Always send dueDate from the form (not 'date')
      const payload: any = {
        title: data.title,
        description: data.description,
        location: data.location,
        priority: data.priority || 'URGENT',
        files: data.files,
        dueDate: data.dueDate || '',
      };
      const newWorkOrder = await createUrgentWorkOrder(payload);
      setShowModal(false);
      reset();
      // Optimistically add new work order to UI
      setOptimisticUrgentData(prev => {
        const arr = Array.isArray(prev) ? prev.slice() : Array.isArray(urgentDataRaw) ? urgentDataRaw.slice() : [];
        arr.push(newWorkOrder);
        return arr;
      });
      queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    } catch (err) {
      alert('Failed to create urgent work order');
    }
  };
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.attachments || 'Attachments'}</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 cursor-pointer ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`}
                  onChange={e => setValue('files', e.target.files ?? undefined)}
                  title={t.chooseFiles || 'Choose files'}
                />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-[#64748b]' : 'text-gray-500'}`}>
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
    <div className={getColorSchemeClass(colorScheme, 'wrapper')}>
      <div className={
        colorScheme === 'dark'
          ? 'bg-[#1a1f2e] rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-[#2d3748]'
          : colorScheme === 'performance'
            ? 'bg-gray-100 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-gray-200'
            : colorScheme === 'current'
              ? 'bg-blue-50 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-blue-100'
              : 'bg-blue-100/60 rounded-xl sm:rounded-3xl shadow-xl p-3 sm:p-6 lg:p-8 mb-8 border border-blue-200'
      }>
        <div className="w-full flex items-start gap-3 relative mb-4">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <FilterBar
              status={status}
              setStatus={setStatus}
              statusOptions={statusOptions}
              priority={priority}
              setPriority={setPriority}
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
                  ? 'bg-[#3b82f6] text-white px-3 sm:px-4 py-1 rounded-t-lg shadow-lg hover:bg-[#2563eb] transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
                  : (colorScheme === 'performance' || colorScheme === 'default')
                    ? 'bg-white text-gray-800 border border-gray-300 border-b-0 px-3 sm:px-4 py-1 rounded-t-lg shadow hover:bg-gray-100 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-4 py-1 rounded-t-lg shadow-lg hover:scale-105 hover:shadow-blue-400/40 transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center justify-center whitespace-nowrap flex-1'
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
          <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-md relative my-4 max-h-[90vh] overflow-y-auto ${colorScheme === 'dark' ? 'bg-[#1a1f2e] border border-[#2d3748]' : 'bg-white/95 backdrop-blur-md border border-blue-200'}`}>
            <button
              className={`absolute top-2.5 right-3.5 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors ${colorScheme === 'dark' ? 'text-[#94a3b8] hover:text-red-400 hover:bg-[#252d3d]' : 'text-red-400 hover:bg-red-50 border border-red-200'}`}
              aria-label="Close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : 'text-blue-900'}`}>New Urgent Work Order</h2>
            <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-4">
              {/* Due Date field (always use dueDate) */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>Due Date</label>
                <input
                  type="date"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`}
                  {...register('dueDate')}
                />
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.title}</label>
                <input className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`} {...register('title')} />
                {errors.title && <div className="text-red-500 text-xs">{errors.title.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.description}</label>
                <textarea className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`} rows={3} {...register('description')} />
                {errors.description && <div className="text-red-500 text-xs">{errors.description.message}</div>}
              </div>
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.location}</label>
                <select className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`} {...register('location')}>
                  <option value="" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>-- {t.selectLocation || 'Select Location'} --</option>
                  <option value="horizon-nature" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Horizon Nature</option>
                  <option value="inewa" className={colorScheme === 'dark' ? 'bg-[#252d3d]' : ''}>Inewa</option>
                </select>
                {errors.location && <div className="text-red-500 text-xs">{errors.location.message}</div>}
              </div>
              {/* File/Photo Upload Section */}
              <div>
                <label className={`block font-semibold mb-1 text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-800'}`}>{t.attachments || 'Attachments'}</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className={`border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 transition-all duration-200 cursor-pointer ${colorScheme === 'dark' ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0] focus:ring-[#3b82f6]' : 'focus:ring-blue-400'}`}
                  onChange={e => setValue('files', e.target.files ?? undefined)}
                  title={t.chooseFiles || 'Choose files'}
                />
                <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-[#64748b]' : 'text-gray-500'}`}>
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
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-[#94a3b8]' : '')}>{t.title}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : '')} {...editRegister('title')} />
            {editErrors.title && <div className={styles.errorMsg}>{editErrors.title.message}</div>}
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-[#94a3b8]' : '')}>{t.description}</label>
            <textarea className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : '')} rows={3} {...editRegister('description')} />
            {editErrors.description && <div className={styles.errorMsg}>{editErrors.description.message}</div>}
          </div>
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-[#94a3b8]' : '')}>{t.location}</label>
            <input className={styles.input + ' ' + (colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : '')} {...editRegister('location')} />
            {editErrors.location && <div className={styles.errorMsg}>{editErrors.location.message}</div>}
          </div>
          {/* No Priority field for UrgentWorkOrders */}
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-[#94a3b8]' : '')}>{t.dueDate}</label>
            <input type="date" className={styles.input + ' ' + (colorScheme === 'dark' ? '[color-scheme:dark] !bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : '')} {...editRegister('dueDate' as any)} />
            {(editErrors as Record<string, any>).dueDate && <div className={styles.errorMsg}>{(editErrors as Record<string, any>).dueDate.message}</div>}
          </div>
          {/* File/Photo Upload Section */}
          <div>
            <label className={styles.label + ' ' + (colorScheme === 'dark' ? 'text-[#94a3b8]' : '')}>{t.attachments || 'Attachments'}</label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className={styles.input + ' cursor-pointer ' + (colorScheme === 'dark' ? '!bg-[#252d3d] !border-[#2d3748] !text-[#e2e8f0] focus:!border-[#3b82f6]' : '')}
              onChange={e => setEditValue('files', e.target.files ?? undefined)}
              title={t.chooseFiles || 'Choose files'}
            />
            <div className={"text-xs mt-1 " + (colorScheme === 'dark' ? 'text-[#64748b]' : 'text-gray-500')}>
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
        </SharedEditModal>
      )}
    </div>
  );
}

export default UrgentWorkOrdersPage;
