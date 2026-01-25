import * as React from 'react';
import { UrgentWorkOrderResponse } from '../../types/api';
import { UrgentWorkOrderCard } from '../../components/UrgentWorkOrderCard';

interface DragOverlayUrgentProps {
  workOrder: UrgentWorkOrderResponse;
  colorScheme?: string;
}

export const DragOverlayUrgentWorkOrderCard: React.FC<DragOverlayUrgentProps> = ({ workOrder, colorScheme }) => {
  return (
    <div style={{ zIndex: 9999 }}>
      <UrgentWorkOrderCard workOrder={workOrder} colorScheme={colorScheme} />
    </div>
  );
};
