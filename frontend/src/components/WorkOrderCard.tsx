import * as React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderResponse } from '../types/api';
import { useLang } from '../context/LangContext';

const statusColors: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-gray-200 text-gray-800',
  ASSIGNED: 'bg-blue-200 text-blue-800',
  IN_PROGRESS: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const priorityColors: Record<WorkOrderPriority, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useLang();
  const statusLabels = {
    OPEN: t.statusOpen,
    ASSIGNED: t.statusAssigned,
    IN_PROGRESS: t.statusInProgress,
    COMPLETED: t.statusCompleted,
    CANCELLED: t.statusCancelled,
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status]}`}>{statusLabels[status]}</span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const { t } = useLang();
  const priorityLabels = {
    LOW: t.priorityLow,
    MEDIUM: t.priorityMedium,
    HIGH: t.priorityHigh,
    URGENT: t.priorityUrgent,
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[priority]}`}>{priorityLabels[priority]}</span>
  );
}

export function WorkOrderCard({ workOrder }: { workOrder: WorkOrderResponse }) {
  const avatarUrl = (userId: number) => `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
  return (
    <div
      className="rounded-xl shadow-md bg-gradient-to-br from-white to-blue-50 p-4 flex flex-col gap-2 border border-blue-100"
      tabIndex={0}
      role="group"
      aria-label={`Work order ${workOrder.title}`}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-base truncate">
          <Link to={`./${workOrder.id}`} tabIndex={0} aria-label={`View details for ${workOrder.title}`}>{workOrder.title}</Link>
        </h3>
        <StatusBadge status={workOrder.status} />
      </div>
      <div className="flex gap-2 items-center mb-1">
        <PriorityBadge priority={workOrder.priority} />
        <span className="text-xs text-gray-700" aria-label={`Due date: ${workOrder.dueDate?.slice(0, 10)}`}>Due: {workOrder.dueDate?.slice(0, 10)}</span>
      </div>
      <div className="text-sm text-gray-800 line-clamp-2 mb-1" aria-label={`Description: ${workOrder.description}`}>{workOrder.description}</div>
      <div className="text-xs text-gray-700" aria-label={`Location: ${workOrder.location}`}>Location: {workOrder.location}</div>
      <div className="flex gap-2 mt-2 items-center">
        <img
          src={avatarUrl(workOrder.assignedToUserId || 0)}
          alt="Assignee avatar"
          className="w-7 h-7 rounded-full border-2 border-white shadow"
          title="Assignee"
          tabIndex={0}
        />
        <img
          src={avatarUrl(workOrder.createdByUserId)}
          alt="Creator avatar"
          className="w-7 h-7 rounded-full border-2 border-white shadow"
          title="Creator"
          tabIndex={0}
        />
      </div>
    </div>
  );
}
