// Filter bar and filter logic for AdminWorkOrdersPage
import * as React from 'react';

// Types for props
import type { ColorSchemeType } from './colorSchemes';

type Option = { id: string; name: string };

type FilterBarProps = {
  status: string;
  setStatus: (v: string) => void;
  statusOptions: string[];
  priority: string;
  setPriority: (v: string) => void;
  priorityOptions: string[];
  technician: string;
  setTechnician: (v: string) => void;
  technicianOptions: Option[];
  locationFilter: string;
  setLocationFilter: (v: string) => void;
  locationOptions: Option[];
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  q: string;
  setQ: (v: string) => void;
  t: any;
  colorScheme: ColorSchemeType;
  startDateInputRef: React.RefObject<HTMLInputElement | null>;
  endDateInputRef: React.RefObject<HTMLInputElement | null>;
  getStatusLabel: (t: any, s: string) => string;
  getPriorityLabel: (t: any, p: string) => string;
};

export function FilterBar({
  status,
  setStatus,
  statusOptions,
  priority,
  setPriority,
  priorityOptions,
  technician,
  setTechnician,
  technicianOptions,
  locationFilter,
  setLocationFilter,
  locationOptions,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  q,
  setQ,
  t,
  colorScheme,
  startDateInputRef,
  endDateInputRef,
  getStatusLabel,
  getPriorityLabel
}: FilterBarProps) {
  // Common dark mode classes
  const darkFilterItem = 'bg-surface-800 border-surface-700 text-surface-100';
  const lightFilterItem = 'bg-white border-surface-300';

  return (
    <div
      className={
        `flex items-stretch px-3 py-2 rounded-xl shadow-sm border gap-2 overflow-x-auto ` +
        (colorScheme === 'current'
          ? 'bg-white/60 backdrop-blur border-brand-200'
          : colorScheme === 'performance'
            ? 'bg-surface-50 border-surface-200'
            : colorScheme === 'dark'
              ? 'bg-surface-800 border-surface-700 text-surface-100'
              : 'bg-white border-surface-200')
      }
    >
      {/* Status Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={colorScheme === 'dark' ? 'text-brand-500' : 'text-brand-700'}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 8h8v8H8z" fill="currentColor"/></svg></span>
        <select value={status} onChange={e => setStatus(e.target.value)} className={`bg-transparent outline-none px-1 py-1 cursor-pointer text-sm min-w-[120px] ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>
          <option value="" className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{t.allStatuses}</option>
          {statusOptions.map(s => <option key={s} value={s} className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{getStatusLabel(t, s)}</option>)}
        </select>
      </div>
      {/* Priority Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={colorScheme === 'dark' ? 'text-amber-400' : 'text-yellow-600'}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></span>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={`bg-transparent outline-none px-1 py-1 cursor-pointer text-sm min-w-[120px] ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>
          <option value="" className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{t.allPriorities}</option>
          {priorityOptions.map(p => <option key={p} value={p} className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{getPriorityLabel(t, p)}</option>)}
        </select>
      </div>
      {/* Technician Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2"/></svg></span>
        <select value={technician} onChange={e => setTechnician(e.target.value)} className={`bg-transparent outline-none px-1 py-1 cursor-pointer text-sm min-w-[120px] ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>
          {technicianOptions.map(opt => <option key={opt.id} value={opt.id} className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{opt.name}</option>)}
        </select>
      </div>
      {/* Location Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={colorScheme === 'dark' ? 'text-brand-400' : 'text-brand-500'}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className={`bg-transparent outline-none px-1 py-1 cursor-pointer text-sm min-w-[140px] ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>
          {locationOptions.map(opt => <option key={opt.id} value={opt.id} className={colorScheme === 'dark' ? 'bg-surface-800 text-surface-100' : ''}>{opt.name}</option>)}
        </select>
      </div>
      {/* Start Date Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={`font-medium text-xs whitespace-nowrap ${colorScheme === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}>{t.startDate || 'Start'}</span>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className={`bg-transparent outline-none py-1 cursor-pointer text-sm w-[110px] ${colorScheme === 'dark' ? 'text-surface-100 [color-scheme:dark]' : ''}`}
          ref={startDateInputRef}
          onClick={e => {
            const input = e.target as HTMLInputElement;
            if (typeof input.showPicker === 'function') input.showPicker();
          }}
        />
      </div>
      {/* End Date Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={`font-medium text-xs whitespace-nowrap ${colorScheme === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}>{t.endDate || 'End'}</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className={`bg-transparent outline-none py-1 cursor-pointer text-sm w-[110px] ${colorScheme === 'dark' ? 'text-surface-100 [color-scheme:dark]' : ''}`}
          ref={endDateInputRef}
          onClick={e => {
            const input = e.target as HTMLInputElement;
            if (typeof input.showPicker === 'function') input.showPicker();
          }}
        />
      </div>
      {/* Search Filter */}
      <div className={
        `flex items-center border px-2 py-1 gap-1 rounded-lg flex-shrink-0 ` +
        (colorScheme === 'dark' ? darkFilterItem : lightFilterItem)
      }>
        <span className={colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-400'}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
        <input
          type="text"
          placeholder={t.search}
          value={q}
          onChange={e => setQ(e.target.value)}
          className={`bg-transparent outline-none py-1 cursor-pointer text-sm w-[80px] ${colorScheme === 'dark' ? 'text-surface-100 placeholder-surface-500' : ''}`}
        />
      </div>
    </div>
  );
}
