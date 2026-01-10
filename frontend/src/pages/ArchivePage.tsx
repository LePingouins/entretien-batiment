import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { unarchiveWorkOrder } from '../lib/api';
import { WorkOrderResponse, PageResponse, WorkOrderStatus, WorkOrderPriority } from '../types/api';
import { useLang } from '../context/LangContext';
import { useOutletContext } from 'react-router-dom';
import { ColorSchemeType } from './AdminWorkOrders/colorSchemes';

// Priority label helper
function getPriorityLabel(t: any, priority: string) {
  switch (priority) {
    case 'LOW': return t.priorityLow;
    case 'MEDIUM': return t.priorityMedium;
    case 'HIGH': return t.priorityHigh;
    case 'URGENT': return t.priorityUrgent;
    default: return priority;
  }
}

// Status label helper
function getStatusLabel(t: any, status: string) {
  switch (status) {
    case 'OPEN': return t.statusOpen;
    case 'ASSIGNED': return t.statusAssigned;
    case 'IN_PROGRESS': return t.statusInProgress;
    case 'COMPLETED': return t.statusCompleted;
    case 'CANCELLED': return t.statusCancelled;
    default: return status;
  }
}

// Priority badge colors
function getPriorityColor(priority: string, colorScheme: string) {
  const isDark = colorScheme === 'dark';
  switch (priority) {
    case 'URGENT': return isDark ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-red-100 text-red-800';
    case 'HIGH': return isDark ? 'bg-orange-900/50 text-orange-300 border-orange-700' : 'bg-orange-100 text-orange-800';
    case 'MEDIUM': return isDark ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-800';
    case 'LOW': return isDark ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-green-100 text-green-800';
    default: return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
  }
}

// Status badge colors
function getStatusColor(status: string, colorScheme: string) {
  const isDark = colorScheme === 'dark';
  switch (status) {
    case 'COMPLETED': return isDark ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-green-100 text-green-800';
    case 'CANCELLED': return isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-200 text-gray-700';
    default: return isDark ? 'bg-blue-900/50 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-800';
  }
}

function ArchivePage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { colorScheme } = useOutletContext<{ colorScheme: ColorSchemeType }>();

  // Filters
  const [page, setPage] = React.useState(0);
  const [size] = React.useState(20);
  const [status, setStatus] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('');
  const [q, setQ] = React.useState('');
  const [locationFilter, setLocationFilter] = React.useState('');

  // Fetch archived work orders
  const { data, isLoading, error } = useQuery<PageResponse<WorkOrderResponse>, Error>({
    queryKey: ['archivedWorkOrders', { page, size, status, priority, q, location: locationFilter }],
    queryFn: async () => {
      const params: Record<string, any> = { page, size };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (q) params.q = q;
      if (locationFilter) params.location = locationFilter;
      const res = await api.get<PageResponse<WorkOrderResponse>>('/api/admin/work-orders/archived', { params });
      return res.data;
    },
  });

  // Restore handler
  const handleRestore = async (workOrder: WorkOrderResponse) => {
    if (!window.confirm(t.restoreConfirm)) return;
    try {
      await unarchiveWorkOrder(workOrder.id);
      queryClient.invalidateQueries({ queryKey: ['archivedWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminWorkOrders'] });
    } catch (err) {
      alert('Failed to restore work order');
    }
  };

  const statusOptions = ['', 'COMPLETED', 'CANCELLED'];
  const priorityOptions = ['', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  const locationOptions = [
    { id: '', name: t.allLocations || 'All Locations' },
    { id: 'horizon-nature', name: 'Horizon Nature' },
    { id: 'inewa', name: 'Inewa' },
  ];

  const isDark = colorScheme === 'dark';

  return (
    <div className={`min-h-screen p-4 ${isDark ? 'bg-[#0f1419]' : 'bg-gray-50'}`}>
      <h1 className={`text-3xl md:text-4xl font-extrabold mb-6 text-center ${isDark ? 'text-[#e2e8f0]' : 'text-blue-900'}`}>
        {t.archive}
      </h1>

      {/* Filters */}
      <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-[#1a1f2e] border border-[#2d3748]' : 'bg-white shadow'}`}>
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder={t.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0]' : 'border-gray-300'}`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0]' : 'border-gray-300'}`}
          >
            <option value="">{t.allStatuses}</option>
            {statusOptions.slice(1).map((s) => (
              <option key={s} value={s}>{getStatusLabel(t, s)}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0]' : 'border-gray-300'}`}
          >
            <option value="">{t.allPriorities}</option>
            {priorityOptions.slice(1).map((p) => (
              <option key={p} value={p}>{getPriorityLabel(t, p)}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0]' : 'border-gray-300'}`}
          >
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading/Error states */}
      {isLoading && (
        <div className={`text-center py-8 ${isDark ? 'text-[#94a3b8]' : 'text-gray-500'}`}>
          {t.loading}
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-red-500">
          {t.errorLoading}
        </div>
      )}

      {/* Work orders list */}
      {data && data.content.length === 0 && (
        <div className={`text-center py-8 ${isDark ? 'text-[#94a3b8]' : 'text-gray-500'}`}>
          {t.noArchivedWorkOrders}
        </div>
      )}

      {data && data.content.length > 0 && (
        <div className="space-y-4">
          {data.content.map((wo) => (
            <div
              key={wo.id}
              className={`p-4 rounded-xl ${isDark ? 'bg-[#1a1f2e] border border-[#2d3748]' : 'bg-white shadow'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold truncate ${isDark ? 'text-[#e2e8f0]' : 'text-gray-900'}`}>
                    {wo.title}
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-gray-600'}`}>
                    {wo.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(wo.status, colorScheme)}`}>
                      {getStatusLabel(t, wo.status)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(wo.priority, colorScheme)}`}>
                      {getPriorityLabel(t, wo.priority)}
                    </span>
                    {wo.location && (
                      <span className={`px-2 py-0.5 text-xs rounded ${isDark ? 'bg-[#252d3d] text-[#94a3b8]' : 'bg-gray-100 text-gray-600'}`}>
                        {wo.location}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${isDark ? 'text-[#64748b]' : 'text-gray-400'}`}>
                    {t.archivedAt}: {wo.archivedAt ? new Date(wo.archivedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(wo)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {t.restore}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={`px-4 py-2 rounded-lg ${
              isDark
                ? 'bg-[#252d3d] text-[#e2e8f0] border border-[#2d3748] hover:bg-[#374151] disabled:opacity-50'
                : 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50'
            }`}
          >
            {t.prev}
          </button>
          <span className={isDark ? 'text-[#94a3b8]' : 'text-gray-600'}>
            {t.page} {data.number + 1} {t.of} {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p < data.totalPages - 1 ? p + 1 : p))}
            disabled={page >= data.totalPages - 1}
            className={`px-4 py-2 rounded-lg ${
              isDark
                ? 'bg-[#252d3d] text-[#e2e8f0] border border-[#2d3748] hover:bg-[#374151] disabled:opacity-50'
                : 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50'
            }`}
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}

export default ArchivePage;
