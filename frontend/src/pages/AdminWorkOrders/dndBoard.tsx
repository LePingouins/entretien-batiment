// DnD/board logic for AdminWorkOrdersPage
import * as React from 'react';
import { DndContext, closestCenter, rectIntersection, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, CollisionDetection, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkOrderResponse, WorkOrderStatus } from '../../types/api';
import { WorkOrderCard } from '../../components/WorkOrderCard';

// Status column IDs for detection
const STATUS_IDS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// Bottom drop zone IDs (for dropping at end of column)
const BOTTOM_ZONE_PREFIX = 'bottom-';
const getBottomZoneId = (status: string) => `${BOTTOM_ZONE_PREFIX}${status}`;
const isBottomZone = (id: string) => id.startsWith(BOTTOM_ZONE_PREFIX);
const getStatusFromBottomZone = (id: string) => id.replace(BOTTOM_ZONE_PREFIX, '');

// Custom collision detection that properly handles empty columns and bottom drop zones
const customCollisionDetection: CollisionDetection = (args) => {
  // Use rectIntersection to find all droppables the dragged item overlaps with
  const rectCollisions = rectIntersection(args);
  
  // Check for bottom zone collisions first (priority for "drop at end")
  const bottomZoneCollision = rectCollisions.find(
    (collision) => isBottomZone(collision.id.toString())
  );
  if (bottomZoneCollision) {
    return [bottomZoneCollision];
  }
  
  // Find if we're over a column
  const columnCollision = rectCollisions.find(
    (collision) => STATUS_IDS.includes(collision.id.toString())
  );
  
  // Find if we're over any sortable cards
  const cardCollisions = rectCollisions.filter(
    (collision) => !STATUS_IDS.includes(collision.id.toString()) && !isBottomZone(collision.id.toString())
  );
  
  // If we have card collisions, use closestCenter for precise positioning among cards
  if (cardCollisions.length > 0) {
    const closestCollisions = closestCenter(args);
    if (closestCollisions.length > 0) {
      return closestCollisions;
    }
  }
  
  // If we're over a column (including empty ones), return the column
  if (columnCollision) {
    return [columnCollision];
  }
  
  // Fallback to rectIntersection results
  return rectCollisions;
};

// Bottom drop zone component - a larger target area at the bottom of each column
function BottomDropZone({ status, colorScheme, hasItems }: { status: string; colorScheme: string; hasItems: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: getBottomZoneId(status) });
  
  return (
    <div
      ref={setNodeRef}
      className={`
        mt-2 rounded-lg border-2 border-dashed transition-all duration-200
        ${isOver 
          ? colorScheme === 'dark'
            ? 'border-blue-400 bg-blue-500/20 min-h-[60px]'
            : 'border-blue-400 bg-blue-100 min-h-[60px]'
          : colorScheme === 'dark'
            ? 'border-transparent hover:border-gray-600 min-h-[40px]'
            : 'border-transparent hover:border-gray-300 min-h-[40px]'
        }
        ${hasItems ? '' : 'hidden'}
      `}
      style={{ flexShrink: 0 }}
    >
      {isOver && (
        <div className={`text-center py-3 text-sm ${colorScheme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
          Drop here to add at end
        </div>
      )}
    </div>
  );
}

export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
}

// Export helper functions for parent component to detect bottom zone drops
export { isBottomZone, getStatusFromBottomZone };

// Types for props
import type { ColorSchemeType } from './colorSchemes';

type DndBoardProps = {
  grouped: Record<string, WorkOrderResponse[]>;
  statusOptions: string[];
  onDragStart: (event: any) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeWorkOrder: WorkOrderResponse | null;
  activeId: string | null;
  colorScheme: ColorSchemeType;
  DroppableColumn: React.ComponentType<{ status: string; colorScheme?: string; children: React.ReactNode }>;
  SortableCard: React.ComponentType<{ 
    workOrder: WorkOrderResponse; 
    colorScheme?: string;
    activeId: string | null;
    onOpenMaterials: (wo: WorkOrderResponse) => void;
    onDeleted: (id: number) => void;
    onCardClick: (wo: WorkOrderResponse) => void;
  }>;
  onOpenMaterials: (wo: WorkOrderResponse) => void;
  onDeleted: (id: number) => void;
  onCardClick: (wo: WorkOrderResponse) => void;
};

export function DndBoard({ grouped, statusOptions, onDragStart, onDragEnd, activeWorkOrder, activeId, colorScheme, DroppableColumn, SortableCard, onOpenMaterials, onDeleted, onCardClick }: DndBoardProps) {
  // Memoize sensors to prevent recreation
  const sensors = useDndSensors();
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
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
                      <SortableCard 
                        key={wo.id} 
                        workOrder={wo} 
                        colorScheme={colorScheme}
                        activeId={activeId}
                        onOpenMaterials={onOpenMaterials}
                        onDeleted={onDeleted}
                        onCardClick={onCardClick}
                      />
                    ))
                  )}
                </div>
                {/* Bottom drop zone for easy "add at end" */}
                <BottomDropZone 
                  status={status} 
                  colorScheme={colorScheme} 
                  hasItems={(grouped[status]?.length ?? 0) > 0} 
                />
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
