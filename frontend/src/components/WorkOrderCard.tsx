import * as React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderResponse } from '../types/api';

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
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status]}`}>{status}</span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[priority]}`}>{priority}</span>
  );
}

export function WorkOrderCard({ workOrder }: { workOrder: WorkOrderResponse }) {
  return (
    <div className="rounded-xl shadow-md bg-gradient-to-br from-white to-blue-50 p-4 flex flex-col gap-2 border border-blue-100">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-base truncate">
          <Link to={`./${workOrder.id}`}>{workOrder.title}</Link>
        </h3>
        <StatusBadge status={workOrder.status} />
      </div>
      <div className="flex gap-2 items-center mb-1">
        <PriorityBadge priority={workOrder.priority} />
        <span className="text-xs text-gray-500">Due: {workOrder.dueDate?.slice(0, 10)}</span>
      </div>
      <div className="text-sm text-gray-700 line-clamp-2 mb-1">{workOrder.description}</div>
      <div className="text-xs text-gray-400">Location: {workOrder.location}</div>
      {/* Example avatars and badges for Trello look */}
      <div className="flex gap-2 mt-2">
        <span className="inline-block w-6 h-6 rounded-full bg-blue-300 border-2 border-white" title="Assignee"></span>
        <span className="inline-block w-6 h-6 rounded-full bg-green-300 border-2 border-white" title="Creator"></span>
      </div>
    </div>
  );
}
