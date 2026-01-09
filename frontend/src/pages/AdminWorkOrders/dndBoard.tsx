// DnD/board logic for AdminWorkOrdersPage
import * as React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkOrderResponse, WorkOrderStatus } from '../../types/api';
import { WorkOrderCard } from '../../components/WorkOrderCard';

export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
}

// Types for props
import type { ColorSchemeType } from './colorSchemes';

type DndBoardProps = {
  grouped: Record<string, WorkOrderResponse[]>;
  statusOptions: string[];
  onDragStart: (event: any) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeWorkOrder: WorkOrderResponse | null;
  colorScheme: ColorSchemeType;
  DroppableColumn: React.ComponentType<{ status: string; colorScheme?: string; children: React.ReactNode }>;
  SortableCard: React.ComponentType<{ workOrder: WorkOrderResponse; colorScheme?: string }>;
};

export function DndBoard({ grouped, statusOptions, onDragStart, onDragEnd, activeWorkOrder, colorScheme, DroppableColumn, SortableCard }: DndBoardProps) {
  return (
    <DndContext
      sensors={useDndSensors()}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 pb-12 px-2 sm:px-4 pt-4 w-full overflow-x-auto">
        {statusOptions.map((status: string) => (
          <div className="flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col" key={status}>
            <DroppableColumn status={status} colorScheme={colorScheme}>
              <SortableContext
                id={status}
                items={grouped[status]?.map((wo: WorkOrderResponse) => wo.id.toString()) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 flex flex-col gap-4 min-h-[180px]">
                  {(grouped[status]?.length ?? 0) === 0 ? (
                    <div className="text-gray-400 text-center py-4">No work orders</div>
                  ) : (
                    grouped[status]?.map((wo: WorkOrderResponse) => (
                      <SortableCard key={wo.id} workOrder={wo} colorScheme={colorScheme} />
                    ))
                  )}
                </div>
              </SortableContext>
            </DroppableColumn>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeWorkOrder ? (
          <div style={{ zIndex: 9999 }}>
            <WorkOrderCard workOrder={activeWorkOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
