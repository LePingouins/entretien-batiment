// This is a copy of dndBoard.tsx, adapted for urgent work orders
// TODO: Implement urgent work order logic, categories, checkmark, photo, date, and archiving

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { moveWorkOrder, reorderWorkOrders, archiveWorkOrder } from '../../lib/api';
import { WorkOrderResponse, WorkOrderStatus, WorkOrderPriority } from '../../types/api';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkOrderCard } from '../../components/WorkOrderCard';
import { ColorSchemeContext } from '../../context/ColorSchemeContext';
import { useLang } from '../../context/LangContext';

const STATUS_OPTIONS = [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED];

function groupByStatus(workOrders: WorkOrderResponse[]) {
  return STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = workOrders.filter(w => w.status === status);
    return acc;
  }, {} as Record<WorkOrderStatus, WorkOrderResponse[]>);
}

const UrgentDndBoard = () => {
  const queryClient = useQueryClient();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();
  const { data: urgentWorkOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['urgentWorkOrders'],
    queryFn: async () => {
      const res = await api.get<WorkOrderResponse[]>('/api/admin/work-orders');
      return res.data.filter((wo: WorkOrderResponse) => wo.priority === WorkOrderPriority.URGENT && !wo.archived);
    },
  });

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeWorkOrder, setActiveWorkOrder] = React.useState<WorkOrderResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = groupByStatus(urgentWorkOrders);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    const found = urgentWorkOrders.find(wo => wo.id.toString() === event.active.id);
    setActiveWorkOrder(found || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveWorkOrder(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = urgentWorkOrders.find(wo => wo.id.toString() === active.id);
    if (!from) return;
    let newStatus: WorkOrderStatus | null = null;
    if (over.id === WorkOrderStatus.IN_PROGRESS || over.id === WorkOrderStatus.COMPLETED) {
      newStatus = over.id as WorkOrderStatus;
    }
    if (newStatus && from.status !== newStatus) {
      await moveWorkOrder(from.id, newStatus, 0);
      queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    }
  };

  const handleCheckmark = async (wo: WorkOrderResponse) => {
    if (wo.status !== WorkOrderStatus.COMPLETED) {
      await moveWorkOrder(wo.id, WorkOrderStatus.COMPLETED, 0);
      queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    }
  };

  const handleArchive = async (wo: WorkOrderResponse) => {
    await archiveWorkOrder(wo.id);
    queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    queryClient.invalidateQueries({ queryKey: ['archivedWorkOrders'] });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 pb-12 px-2 sm:px-4 pt-4 w-full justify-evenly overflow-x-auto md:overflow-x-visible">
      {STATUS_OPTIONS.map(status => (
        <div className="flex-shrink-0 w-full sm:w-[280px] flex flex-col" key={status}>
          <div className="font-bold text-lg mb-2 text-center">
            {status === WorkOrderStatus.IN_PROGRESS ? 'In Progress' : 'Completed'}
          </div>
          <SortableContext
            id={status}
            items={grouped[status]?.map(wo => wo.id.toString()) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex-1 flex flex-col gap-4 min-h-[180px]">
              {(grouped[status]?.length ?? 0) === 0 ? (
                <div className="text-gray-400 text-center py-4">{t.noUrgentWorkOrders}</div>
              ) : (
                grouped[status]?.map(wo => (
                  <div key={wo.id} className="relative group">
                    <WorkOrderCard workOrder={wo} />
                    {/* Checkmark for moving to completed */}
                    {status === WorkOrderStatus.IN_PROGRESS && (
                      <button
                        className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow transition-opacity opacity-80 group-hover:opacity-100"
                        title="Mark as completed"
                        onClick={e => { e.stopPropagation(); handleCheckmark(wo); }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                      </button>
                    )}
                    {/* Archive button for completed */}
                    {status === WorkOrderStatus.COMPLETED && (
                      <button
                        className="absolute top-2 right-2 bg-gray-500 hover:bg-gray-700 text-white rounded-full p-2 shadow transition-opacity opacity-80 group-hover:opacity-100"
                        title="Archive work order"
                        onClick={e => { e.stopPropagation(); handleArchive(wo); }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2" /></svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </SortableContext>
        </div>
      ))}
      <DragOverlay>
        {activeWorkOrder ? (
          <div style={{ zIndex: 9999 }}>
            <WorkOrderCard workOrder={activeWorkOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </div>
  );
};

export default UrgentDndBoard;
