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
  return (
    <div
      className={
        `flex flex-wrap md:flex-nowrap items-stretch max-w-full px-4 py-4 rounded-xl shadow-sm border gap-0 mx-auto ` +
        (colorScheme === 'current'
          ? 'bg-gradient-to-r from-blue-100 via-blue-200 to-purple-100 border-gray-100'
          : colorScheme === 'performance'
            ? 'bg-gray-50 border-gray-200'
            : colorScheme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-100'
              : 'bg-blue-50 border-blue-200')
      }
      style={{ minWidth: 'fit-content' }}
    >
      {/* Status Filter */}
      <div className={
        `flex items-center border-y border-l px-3 py-1 gap-2 min-w-[170px] first:rounded-l-lg ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-blue-700"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 8h8v8H8z" fill="currentColor"/></svg></span>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-transparent outline-none w-full px-1 py-1 cursor-pointer">
          <option value="">{t.allStatuses}</option>
          {statusOptions.map(s => <option key={s} value={s}>{getStatusLabel(t, s)}</option>)}
        </select>
      </div>
      {/* Vertical Separator */}
      <div className="w-px bg-gray-300 mx-0" />
      {/* Priority Filter */}
      <div className={
        `flex items-center border-y px-3 py-1 gap-2 min-w-[170px] ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-yellow-600"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></span>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-transparent outline-none w-full px-1 py-1 cursor-pointer">
          <option value="">{t.allPriorities}</option>
          {priorityOptions.map(p => <option key={p} value={p}>{getPriorityLabel(t, p)}</option>)}
        </select>
      </div>
      <div className="w-px bg-gray-300 mx-0" />
      {/* Technician Filter */}
      <div className={
        `flex items-center border-y px-3 py-1 gap-2 min-w-[170px] ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2"/></svg></span>
        <select value={technician} onChange={e => setTechnician(e.target.value)} className="bg-transparent outline-none w-full px-1 py-1 cursor-pointer">
          {technicianOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
      </div>
      <div className="w-px bg-gray-300 mx-0" />
      {/* Location Filter */}
      <div className={
        `flex items-center border-y px-3 py-1 gap-2 min-w-[170px] ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-blue-400"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="bg-transparent outline-none w-full px-1 py-1 cursor-pointer">
          {locationOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
      </div>
      <div className="w-px bg-gray-300 mx-0" />
      {/* Start Date Filter */}
      <div className={
        `flex items-center border-y px-3 py-1 gap-2 min-w-[170px] ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-blue-600 font-medium px-1 whitespace-nowrap">{t.startDate || 'Start Date'}</span>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="bg-transparent outline-none px-1 py-1 w-full cursor-pointer"
          ref={startDateInputRef}
          onClick={e => {
            const input = e.target as HTMLInputElement;
            if (typeof input.showPicker === 'function') input.showPicker();
          }}
        />
      </div>
      <div className="w-px bg-gray-300 mx-0" />
      {/* End Date Filter */}
      <div className={
        `flex items-center border-y px-3 py-1 gap-2 min-w-[170px] ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-blue-600 font-medium px-1 whitespace-nowrap">{t.endDate || 'End Date'}</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="bg-transparent outline-none px-1 py-1 w-full cursor-pointer"
          ref={endDateInputRef}
          onClick={e => {
            const input = e.target as HTMLInputElement;
            if (typeof input.showPicker === 'function') input.showPicker();
          }}
        />
      </div>
      <div className="w-px bg-gray-300 mx-0" />
      {/* Search Filter */}
      <div className={
        `flex items-center border-y border-r px-3 py-1 gap-2 min-w-[170px] last:rounded-r-lg ` +
        (colorScheme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300')
      }>
        <span className="text-gray-400"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
        <input
          type="text"
          placeholder={t.search}
          value={q}
          onChange={e => setQ(e.target.value)}
          className="bg-transparent outline-none px-1 py-1 w-full cursor-pointer"
        />
      </div>
    </div>
  );
}
