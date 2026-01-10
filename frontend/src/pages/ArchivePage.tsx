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

// Priority badge colors based on color scheme
function getPriorityColor(priority: string, colorScheme: ColorSchemeType) {
  const isDark = colorScheme === 'dark';
  const isCurrent = colorScheme === 'current';
  
  switch (priority) {
    case 'URGENT': 
      if (isDark) return 'bg-red-900/50 text-red-300 border border-red-700';
      if (isCurrent) return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md';
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'HIGH': 
      if (isDark) return 'bg-orange-900/50 text-orange-300 border border-orange-700';
      if (isCurrent) return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md';
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'MEDIUM': 
      if (isDark) return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700';
      if (isCurrent) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-md';
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'LOW': 
      if (isDark) return 'bg-green-900/50 text-green-300 border border-green-700';
      if (isCurrent) return 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md';
      return 'bg-green-100 text-green-800 border border-green-200';
    default: 
      if (isDark) return 'bg-gray-700 text-gray-300';
      return 'bg-gray-100 text-gray-800';
  }
}

// Status badge colors based on color scheme
function getStatusColor(status: string, colorScheme: ColorSchemeType) {
  const isDark = colorScheme === 'dark';
  const isCurrent = colorScheme === 'current';
  
  switch (status) {
    case 'COMPLETED': 
      if (isDark) return 'bg-green-900/50 text-green-300 border border-green-700';
      if (isCurrent) return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md';
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'CANCELLED': 
      if (isDark) return 'bg-gray-700 text-gray-300 border border-gray-600';
      if (isCurrent) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md';
      return 'bg-gray-200 text-gray-700 border border-gray-300';
    default: 
      if (isDark) return 'bg-blue-900/50 text-blue-300 border border-blue-700';
      if (isCurrent) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md';
      return 'bg-blue-100 text-blue-800 border border-blue-200';
  }
}

// Get wrapper/page background based on color scheme
function getPageBackground(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#0f1419]';
    case 'current': return 'bg-gradient-to-br from-blue-100/80 to-purple-200/60';
    case 'performance': return 'bg-gray-100';
    case 'default': return 'bg-gradient-to-br from-blue-100/80 to-purple-200/60';
    default: return 'bg-gray-50';
  }
}

// Get card styles based on color scheme
function getCardStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#1a1f2e] border border-[#2d3748]';
    case 'current': return 'bg-gradient-to-br from-blue-100/90 via-blue-50/80 to-purple-100/70 border-2 border-blue-200/60 shadow-xl';
    case 'performance': return 'bg-white border border-gray-200 shadow';
    case 'default': return 'bg-white border border-gray-200 shadow';
    default: return 'bg-white shadow';
  }
}

// Get filter bar styles based on color scheme
function getFilterBarStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#1a1f2e] border border-[#2d3748]';
    case 'current': return 'bg-gradient-to-r from-blue-200/60 to-purple-100/60 border-2 border-blue-300/40 shadow-lg';
    case 'performance': return 'bg-white border border-gray-200 shadow';
    case 'default': return 'bg-white border border-gray-200 shadow';
    default: return 'bg-white shadow';
  }
}

// Get input styles based on color scheme
function getInputStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#252d3d] border-[#2d3748] text-[#e2e8f0]';
    case 'current': return 'bg-white/80 border-blue-300 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
    case 'performance': return 'bg-white border-gray-300 text-gray-800';
    case 'default': return 'bg-white border-gray-300 text-gray-800';
    default: return 'border-gray-300';
  }
}

// Get title color based on color scheme
function getTitleColor(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'text-[#e2e8f0]';
    case 'current': return 'text-blue-900 drop-shadow-sm';
    default: return 'text-blue-900';
  }
}

// Get text colors based on color scheme
function getTextColors(colorScheme: ColorSchemeType) {
  const isDark = colorScheme === 'dark';
  return {
    primary: isDark ? 'text-[#e2e8f0]' : 'text-gray-900',
    secondary: isDark ? 'text-[#94a3b8]' : 'text-gray-600',
    muted: isDark ? 'text-[#64748b]' : 'text-gray-400',
  };
}

// Get button styles based on color scheme
function getButtonStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#3b82f6] text-white hover:bg-[#2563eb]';
    case 'current': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg';
    case 'performance': return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'default': return 'bg-blue-600 text-white hover:bg-blue-700';
    default: return 'bg-blue-600 text-white hover:bg-blue-700';
  }
}

// Get pagination button styles based on color scheme
function getPaginationStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-[#252d3d] text-[#e2e8f0] border border-[#2d3748] hover:bg-[#374151] disabled:opacity-50';
    case 'current': return 'bg-white/80 text-blue-800 border-2 border-blue-300 hover:bg-blue-50 disabled:opacity-50 shadow';
    case 'performance': return 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50';
    case 'default': return 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50';
    default: return 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50';
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

  const textColors = getTextColors(colorScheme);
  const inputStyles = getInputStyles(colorScheme);

  return (
    <div className={`min-h-screen p-4 ${getPageBackground(colorScheme)}`}>
      <h1 className={`text-3xl md:text-4xl font-extrabold mb-6 text-center ${getTitleColor(colorScheme)}`}>
        {t.archive}
      </h1>

      {/* Filters */}
      <div className={`mb-6 p-4 rounded-xl ${getFilterBarStyles(colorScheme)}`}>
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder={t.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${inputStyles}`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${inputStyles}`}
          >
            <option value="">{t.allStatuses}</option>
            {statusOptions.slice(1).map((s) => (
              <option key={s} value={s}>{getStatusLabel(t, s)}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${inputStyles}`}
          >
            <option value="">{t.allPriorities}</option>
            {priorityOptions.slice(1).map((p) => (
              <option key={p} value={p}>{getPriorityLabel(t, p)}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${inputStyles}`}
          >
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading/Error states */}
      {isLoading && (
        <div className={`text-center py-8 ${textColors.secondary}`}>
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
        <div className={`text-center py-8 ${textColors.secondary}`}>
          {t.noArchivedWorkOrders}
        </div>
      )}

      {data && data.content.length > 0 && (
        <div className="space-y-4">
          {data.content.map((wo) => (
            <div
              key={wo.id}
              className={`p-4 rounded-xl ${getCardStyles(colorScheme)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold truncate ${textColors.primary}`}>
                    {wo.title}
                  </h3>
                  <p className={`text-sm mt-1 ${textColors.secondary}`}>
                    {wo.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getStatusColor(wo.status, colorScheme)}`}>
                      {getStatusLabel(t, wo.status)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getPriorityColor(wo.priority, colorScheme)}`}>
                      {getPriorityLabel(t, wo.priority)}
                    </span>
                    {wo.location && (
                      <span className={`px-2 py-0.5 text-xs rounded-lg ${
                        colorScheme === 'dark' 
                          ? 'bg-[#252d3d] text-[#94a3b8]' 
                          : colorScheme === 'current'
                            ? 'bg-blue-100/80 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {wo.location}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${textColors.muted}`}>
                    {t.archivedAt}: {wo.archivedAt ? new Date(wo.archivedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(wo)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyles(colorScheme)}`}
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
            className={`px-4 py-2 rounded-lg ${getPaginationStyles(colorScheme)}`}
          >
            {t.prev}
          </button>
          <span className={textColors.secondary}>
            {t.page} {data.number + 1} {t.of} {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p < data.totalPages - 1 ? p + 1 : p))}
            disabled={page >= data.totalPages - 1}
            className={`px-4 py-2 rounded-lg ${getPaginationStyles(colorScheme)}`}
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}

export default ArchivePage;
