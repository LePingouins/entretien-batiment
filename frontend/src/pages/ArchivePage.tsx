import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { unarchiveWorkOrder, getArchivedUrgentWorkOrders, getArchivedMileageEntries, unarchiveUrgentWorkOrder, unarchiveMileageEntry } from '../lib/api';
import { WorkOrderResponse, PageResponse, WorkOrderStatus, WorkOrderPriority, UrgentWorkOrderResponse, MileageEntry } from '../types/api';
import { useLang } from '../context/LangContext';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
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
      if (isDark) return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25';
      if (isCurrent) return 'bg-red-500 text-white shadow-sm';
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'HIGH': 
      if (isDark) return 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25';
      if (isCurrent) return 'bg-orange-500 text-white shadow-sm';
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    case 'MEDIUM': 
      if (isDark) return 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25';
      if (isCurrent) return 'bg-yellow-500 text-yellow-900 shadow-sm';
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    case 'LOW': 
      if (isDark) return 'bg-green-500/15 text-green-300 ring-1 ring-green-500/25';
      if (isCurrent) return 'bg-green-500 text-white shadow-sm';
      return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    default: 
      if (isDark) return 'bg-surface-700 text-surface-300';
      return 'bg-surface-100 text-surface-700';
  }
}

// Status badge colors based on color scheme
function getStatusColor(status: string, colorScheme: ColorSchemeType) {
  const isDark = colorScheme === 'dark';
  const isCurrent = colorScheme === 'current';
  
  switch (status) {
    case 'COMPLETED': 
      if (isDark) return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25';
      if (isCurrent) return 'bg-emerald-500 text-white shadow-sm';
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'CANCELLED': 
      if (isDark) return 'bg-surface-600 text-surface-300 ring-1 ring-surface-500';
      if (isCurrent) return 'bg-surface-500 text-white shadow-sm';
      return 'bg-surface-100 text-surface-600 ring-1 ring-surface-300';
    default: 
      if (isDark) return 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25';
      if (isCurrent) return 'bg-blue-500 text-white shadow-sm';
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  }
}

// Get wrapper/page background based on color scheme
function getPageBackground(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-surface-950';
    case 'current': return 'bg-gradient-to-br from-brand-50 to-purple-100';
    case 'performance': return 'bg-surface-100';
    case 'default': return 'bg-surface-50';
    default: return 'bg-surface-50';
  }
}

// Get card styles based on color scheme
function getCardStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-surface-800 border border-surface-700';
    case 'current': return 'bg-white/80 backdrop-blur border border-brand-200 shadow-card';
    case 'performance': return 'bg-white border border-surface-200 shadow-card';
    case 'default': return 'bg-white border border-surface-200 shadow-card';
    default: return 'bg-white shadow-card';
  }
}

// Get filter bar styles based on color scheme
function getFilterBarStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-surface-800 border border-surface-700';
    case 'current': return 'bg-white/60 backdrop-blur border border-brand-200 shadow-card';
    case 'performance': return 'bg-white border border-surface-200 shadow-card';
    case 'default': return 'bg-white border border-surface-200 shadow-card';
    default: return 'bg-white shadow-card';
  }
}

// Get input styles based on color scheme
function getInputStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-surface-700 border-surface-600 text-surface-100';
    case 'current': return 'bg-white/80 border-brand-300 text-surface-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-200';
    case 'performance': return 'bg-white border-surface-300 text-surface-800';
    case 'default': return 'bg-white border-surface-300 text-surface-800';
    default: return 'border-surface-300';
  }
}

// Get title color based on color scheme
function getTitleColor(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'text-surface-100';
    case 'current': return 'text-brand-900';
    default: return 'text-surface-900';
  }
}

// Get text colors based on color scheme
function getTextColors(colorScheme: ColorSchemeType) {
  const isDark = colorScheme === 'dark';
  return {
    primary: isDark ? 'text-surface-100' : 'text-surface-900',
    secondary: isDark ? 'text-surface-400' : 'text-surface-600',
    muted: isDark ? 'text-surface-500' : 'text-surface-400',
  };
}

// Get button styles based on color scheme
function getButtonStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-brand-600 text-white hover:bg-brand-700';
    case 'current': return 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm';
    case 'performance': return 'bg-brand-600 text-white hover:bg-brand-700';
    case 'default': return 'bg-brand-600 text-white hover:bg-brand-700';
    default: return 'bg-brand-600 text-white hover:bg-brand-700';
  }
}

// Get pagination button styles based on color scheme
function getPaginationStyles(colorScheme: ColorSchemeType) {
  switch (colorScheme) {
    case 'dark': return 'bg-surface-700 text-surface-100 border border-surface-600 hover:bg-surface-600 disabled:opacity-50';
    case 'current': return 'bg-white/80 text-brand-800 border border-brand-300 hover:bg-brand-50 disabled:opacity-50 shadow-sm';
    case 'performance': return 'bg-white border border-surface-300 hover:bg-surface-50 disabled:opacity-50';
    case 'default': return 'bg-white border border-surface-300 hover:bg-surface-50 disabled:opacity-50';
    default: return 'bg-white border border-surface-300 hover:bg-surface-50 disabled:opacity-50';
  }
}

function ArchivePage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { colorScheme } = useOutletContext<{ colorScheme: ColorSchemeType }>();

  const [activeTab, setActiveTab] = React.useState<'work-orders' | 'urgent' | 'mileage'>('work-orders');

  // Filters
  const [page, setPage] = React.useState(0);
  const [size] = React.useState(20);
  const [status, setStatus] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('');
  const [q, setQ] = React.useState('');
  const [locationFilter, setLocationFilter] = React.useState('');

  // Urgent Filters
  const [urgentQ, setUrgentQ] = React.useState('');
  const [urgentStatus, setUrgentStatus] = React.useState('');
  const [urgentLocation, setUrgentLocation] = React.useState('');

  // Mileage Filters
  const [mileageQ, setMileageQ] = React.useState('');
  const [mileageStartDate, setMileageStartDate] = React.useState('');
  const [mileageEndDate, setMileageEndDate] = React.useState('');


  // Fetch archived work orders
  const { data: workOrdersData, isLoading: isLoadingWO, error: errorWO } = useQuery<PageResponse<WorkOrderResponse>, Error>({
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
    enabled: activeTab === 'work-orders',
  });

  // Fetch archived urgent work orders
  const { data: urgentData, isLoading: isLoadingUrgent } = useQuery<UrgentWorkOrderResponse[]>({
    queryKey: ['archivedUrgentWorkOrders', { q: urgentQ, status: urgentStatus, location: urgentLocation }],
    queryFn: () => getArchivedUrgentWorkOrders({ q: urgentQ, status: urgentStatus, location: urgentLocation }),
    enabled: activeTab === 'urgent',
  });

  // Fetch archived mileage
  const { data: mileageData, isLoading: isLoadingMileage } = useQuery<MileageEntry[]>({
    queryKey: ['archivedMileage', { q: mileageQ, startDate: mileageStartDate, endDate: mileageEndDate }],
    queryFn: () => getArchivedMileageEntries({ q: mileageQ, startDate: mileageStartDate, endDate: mileageEndDate }),
    enabled: activeTab === 'mileage',
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

  const handleRestoreUrgent = async (id: number) => {
    // if (!window.confirm(t.restoreConfirm)) return;
    try {
      await unarchiveUrgentWorkOrder(id);
      queryClient.invalidateQueries({ queryKey: ['archivedUrgentWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    } catch (err) {
      alert('Failed to restore urgent work order');
    }
  };

  const handleRestoreMileage = async (id: number) => {
    // if (!window.confirm(t.restoreConfirm)) return;
    try {
      await unarchiveMileageEntry(id);
      queryClient.invalidateQueries({ queryKey: ['archivedMileage'] });
      queryClient.invalidateQueries({ queryKey: ['mileage'] }); // Assuming 'mileage' key for mileage page
    } catch (err) {
      alert('Failed to restore mileage entry');
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
    <div className={`${getPageBackground(colorScheme)} flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8`}>
      <PageHeader title={t.archive} />

      {/* Tabs */}
      <div className="flex gap-4 mb-6 justify-center flex-wrap">
        <button
          onClick={() => setActiveTab('work-orders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'work-orders' ? getButtonStyles(colorScheme) : colorScheme === 'dark' ? 'text-surface-400 hover:text-surface-200 bg-surface-800' : 'text-surface-500 hover:text-surface-700 bg-surface-100'}`}
        >
          {t.workOrders || 'Work Orders'}
        </button>
        <button
          onClick={() => setActiveTab('urgent')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'urgent' ? getButtonStyles(colorScheme) : colorScheme === 'dark' ? 'text-surface-400 hover:text-surface-200 bg-surface-800' : 'text-surface-500 hover:text-surface-700 bg-surface-100'}`}
        >
          {t.urgentWorkOrders || 'Urgent Work Orders'}
        </button>
        <button
          onClick={() => setActiveTab('mileage')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'mileage' ? getButtonStyles(colorScheme) : colorScheme === 'dark' ? 'text-surface-400 hover:text-surface-200 bg-surface-800' : 'text-surface-500 hover:text-surface-700 bg-surface-100'}`}
        >
          {t.mileage || 'Mileage'}
        </button>
      </div>

      {activeTab === 'work-orders' && (
      <>
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
      {isLoadingWO && (
        <div className={`text-center py-8 ${textColors.secondary}`}>
          {t.loading}
        </div>
      )}
      {errorWO && (
        <div className="text-center py-8 text-red-500">
          {t.errorLoading}
        </div>
      )}

      {/* Work orders list */}
      {workOrdersData && workOrdersData.content.length === 0 && (
        <div className={`text-center py-8 ${textColors.secondary}`}>
          {t.noArchivedWorkOrders}
        </div>
      )}

      {workOrdersData && workOrdersData.content.length > 0 && (
        <div className="space-y-4">
          {workOrdersData.content.map((wo) => (
            <div
              key={wo.id}
              className={`p-4 rounded-xl ${getCardStyles(colorScheme)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 select-all">ID: {wo.id}</span>
                  </div>
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
                          ? 'bg-surface-700 text-surface-400' 
                          : colorScheme === 'current'
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-surface-100 text-surface-600'
                      }`}>
                        {wo.location}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${textColors.muted}`}>
                    <span className={`text-xs ${colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'} select-all mr-2`}>ID: {wo.id}</span>
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
      {workOrdersData && workOrdersData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={`px-4 py-2 rounded-lg ${getPaginationStyles(colorScheme)}`}
          >
            {t.prev}
          </button>
          <span className={textColors.secondary}>
            {t.page} {workOrdersData.number + 1} {t.of} {workOrdersData.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p < workOrdersData.totalPages - 1 ? p + 1 : p))}
            disabled={page >= workOrdersData.totalPages - 1}
            className={`px-4 py-2 rounded-lg ${getPaginationStyles(colorScheme)}`}
          >
            {t.next}
          </button>
        </div>
      )}
      </>
      )}

      {/* Urgent Work Orders Content */}
      {activeTab === 'urgent' && (
        <>
          {/* Urgent Filters */}
          <div className={`mb-6 p-4 rounded-xl ${getFilterBarStyles(colorScheme)}`}>
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder={t.search}
                value={urgentQ}
                onChange={(e) => setUrgentQ(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${inputStyles}`}
              />
              <select
                value={urgentStatus}
                onChange={(e) => setUrgentStatus(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${inputStyles}`}
              >
                <option value="">{t.allStatuses}</option>
                <option value="IN_PROGRESS">{getStatusLabel(t, 'IN_PROGRESS')}</option>
                <option value="COMPLETED">{getStatusLabel(t, 'COMPLETED')}</option>
              </select>
              <select
                value={urgentLocation}
                onChange={(e) => setUrgentLocation(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${inputStyles}`}
              >
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingUrgent && (
            <div className={`text-center py-8 ${textColors.secondary}`}>
              {t.loading}
            </div>
          )}
          {!isLoadingUrgent && (!urgentData || urgentData.length === 0) && (
            <div className={`text-center py-8 ${textColors.secondary}`}>
              {t.noArchivedWorkOrders}
            </div>
          )}
          {urgentData && urgentData.length > 0 && (
            <div className="space-y-4">
              {urgentData.map((wo) => (
                <div
                  key={wo.id}
                  className={`p-4 rounded-xl ${getCardStyles(colorScheme)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 select-all">ID: {wo.id}</span>
                      </div>
                      <h3 className={`text-lg font-semibold truncate ${textColors.primary}`}>
                        {wo.title}
                      </h3>
                      <p className={`text-sm mt-1 ${textColors.secondary}`}>
                        {wo.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {wo.status && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getStatusColor(wo.status, colorScheme)}`}>
                            {getStatusLabel(t, wo.status)}
                          </span>
                        )}
                        {wo.priority && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getPriorityColor(wo.priority, colorScheme)}`}>
                            {getPriorityLabel(t, wo.priority)}
                          </span>
                        )}
                        {wo.location && (
                          <span className={`px-2 py-0.5 text-xs rounded-lg ${
                            colorScheme === 'dark' 
                              ? 'bg-surface-700 text-surface-400' 
                              : colorScheme === 'current'
                                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                : 'bg-surface-100 text-surface-600'
                          }`}>
                            {wo.location}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs mt-2 ${textColors.muted}`}>
                        <span className={`text-xs ${colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'} select-all mr-2`}>ID: {wo.id}</span>
                        {t.archivedAt}: {wo.archivedAt ? new Date(wo.archivedAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreUrgent(wo.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyles(colorScheme)}`}
                    >
                      {t.restore}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Mileage Content */}
      {activeTab === 'mileage' && (
        <>
          {/* Mileage Filters */}
          <div className={`mb-6 p-4 rounded-xl ${getFilterBarStyles(colorScheme)}`}>
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder={t.supplier || 'Supplier'}
                value={mileageQ}
                onChange={(e) => setMileageQ(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${inputStyles}`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={mileageStartDate}
                  onChange={(e) => setMileageStartDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${inputStyles} ${colorScheme === 'dark' ? '[color-scheme:dark]' : ''}`}
                  placeholder={t.startDate || 'Start Date'}
                  title={t.startDate || 'Start Date'}
                />
                <span className={colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>-</span>
                <input
                  type="date"
                  value={mileageEndDate}
                  onChange={(e) => setMileageEndDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${inputStyles} ${colorScheme === 'dark' ? '[color-scheme:dark]' : ''}`}
                  placeholder={t.endDate || 'End Date'}
                  title={t.endDate || 'End Date'}
                />
              </div>
            </div>
          </div>
          {isLoadingMileage && (
            <div className={`text-center py-8 ${textColors.secondary}`}>
              {t.loading}
            </div>
          )}
          {!isLoadingMileage && (!mileageData || mileageData.length === 0) && (
            <div className={`text-center py-8 ${textColors.secondary}`}>
              No archived mileage entries
            </div>
          )}
          {mileageData && mileageData.length > 0 && (
            <div className="space-y-4">
              {mileageData.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl ${getCardStyles(colorScheme)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 select-all">ID: {m.id}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`font-semibold ${textColors.primary}`}>
                          {new Date(m.date).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-lg ${
                          colorScheme === 'dark' 
                            ? 'bg-surface-700 text-surface-400' 
                            : 'bg-surface-100 text-surface-600'
                        }`}>
                          {m.totalKm} km
                        </span>
                      </div>
                      <div className={`text-sm ${textColors.secondary} font-medium`}>
                        {m.supplier}
                      </div>
                      {m.notes && (
                        <p className={`text-sm mt-1 ${textColors.muted}`}>
                          {m.notes}
                        </p>
                      )}
                      <div className={`text-xs mt-2 ${textColors.muted}`}>
                        <span className={`text-xs ${colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'} select-all mr-2`}>ID: {m.id}</span>
                        {t.archivedAt}: {m.archivedAt ? new Date(m.archivedAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreMileage(m.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyles(colorScheme)}`}
                    >
                      {t.restore}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ArchivePage;
