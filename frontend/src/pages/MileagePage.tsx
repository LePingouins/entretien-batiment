import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import api, { archiveMileageEntry, getUrgentWorkOrders } from '../lib/api';
import { getRoleBasePath } from '../lib/pageAccess';
import { NotificationsContext } from '../context/NotificationsContext';
import type { WorkOrderResponse, UrgentWorkOrderResponse } from '../types/api';

interface MileageEntry {
  id?: number;
  date: string;
  supplier: string;
  startKm: string;
  endKm: string;
  workOrderId?: number;
  urgentWorkOrderId?: number;
  workOrderTitle?: string;
  urgentWorkOrderTitle?: string;
}

const computeTotalKm = (startKm: string, endKm: string) => {
  const start = parseFloat(startKm);
  const end = parseFloat(endKm);
  if (isNaN(start) || isNaN(end)) return '';
  const total = end - start;
  return total < 0 ? 0 : total;
};

const API_URL = '/api/mileage';

const MileagePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const creatingRef = React.useRef(false);
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([]);
  const [urgentWorkOrders, setUrgentWorkOrders] = useState<UrgentWorkOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const { t, lang } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const basePath = getRoleBasePath(role);

  useEffect(() => {
    // If action=create, auto-create a new entry
    if (searchParams.get('action') === 'create' && !creatingRef.current) {
      creatingRef.current = true;
      const newEntry: MileageEntry = {
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        startKm: '',
        endKm: '',
        workOrderId: undefined,
        urgentWorkOrderId: undefined,
      };
      // Send request immediately
      api.post('/api/mileage', newEntry)
        .then(res => {
          const created = res.data;
          setEntries(prev => [...prev, {
            id: created.id,
            date: created.date || '',
            supplier: created.supplier || '',
            startKm: created.startKm?.toString() || '',
            endKm: created.endKm?.toString() || '',
            workOrderId: created.workOrderId,
            urgentWorkOrderId: created.urgentWorkOrderId,
          }]);
            try {
              // notification removed
            } catch (err) {
              // ignore notification errors
            }
          // Remove param
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('action');
            return next;
          }, { replace: true });
        })
        .catch(err => console.error("Auto-create mileage failed", err));
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    api.get(API_URL)
      .then(res => {
        setEntries(res.data.map((e: any) => ({
          id: e.id,
          date: e.date || '',
          supplier: e.supplier || '',
          startKm: e.startKm?.toString() || '',
          endKm: e.endKm?.toString() || '',
          workOrderId: e.workOrderId,
          urgentWorkOrderId: e.urgentWorkOrderId,
        })));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load mileage entries", err);
        setLoading(false);
      });
    // Fetch work orders (non-archived, all statuses)
    api.get('/api/admin/work-orders', { params: { archived: false } })
      .then(res => setWorkOrders(res.data?.content || []))
      .catch(() => setWorkOrders([]));
    // Fetch urgent work orders (non-archived)
    getUrgentWorkOrders({ status: '', q: '', location: '', technician: '' })
      .then(data => setUrgentWorkOrders(data.filter(w => !w.archived)))
      .catch(() => setUrgentWorkOrders([]));
  }, []);

  const handleCreate = () => {
    const newEntry: MileageEntry = {
      date: '',
      supplier: '',
      startKm: '',
      endKm: '',
      workOrderId: undefined,
      urgentWorkOrderId: undefined,
    };
    api.post(API_URL, newEntry)
      .then(res => {
        const created = res.data;
        setEntries([...entries, {
          id: created.id,
          date: created.date || '',
          supplier: created.supplier || '',
          startKm: created.startKm?.toString() || '',
          endKm: created.endKm?.toString() || '',
          workOrderId: created.workOrderId,
          urgentWorkOrderId: created.urgentWorkOrderId,
        }]);
          try {
            // notification removed
          } catch (err) {
            // ignore
          }
      });
  };

  const handleUpdate = (id: number | undefined, field: keyof MileageEntry, value: string | number | undefined) => {
    // Optimistic update
    setEntries(prevEntries => prevEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));

    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    // IMPORTANT: use the 'value' passed to the function, not the 'entry' from closure which is stale
    const updated = { ...entry, [field]: value };

    const payload = {
      date: updated.date,
      supplier: updated.supplier,
      startKm: updated.startKm ? parseInt(updated.startKm as string) : null,
      endKm: updated.endKm ? parseInt(updated.endKm as string) : null,
      workOrderId: updated.workOrderId ? Number(updated.workOrderId) : null,
      urgentWorkOrderId: updated.urgentWorkOrderId ? Number(updated.urgentWorkOrderId) : null
    };
    
    api.put(`${API_URL}/${id}`, payload).then(res => {
      // Only sync workOrderId/urgentWorkOrderId from backend to avoid overwriting user typing
      setEntries(currentEntries => currentEntries.map(e => {
        if (e.id === id) {
          // If we are currently editing text fields, don't overwrite them
          if (document.activeElement?.tagName === 'INPUT' && (
              field === 'supplier' || field === 'startKm' || field === 'endKm' || field === 'date'
          )) {
              return {
                 ...e,
                  // Only update IDs that might have changed on backend side logic
                  workOrderId: res.data.workOrderId,
                  urgentWorkOrderId: res.data.urgentWorkOrderId
              };
          }
          // If we just changed a select (dropdown), we want to make sure we have the latest state
          return {
            ...e,
            workOrderId: res.data.workOrderId,
            urgentWorkOrderId: res.data.urgentWorkOrderId
          };
        }
        return e;
      }));
    }).catch(err => console.error("Failed to save mileage entry", err));
  };

  const handleChange = (id: number | undefined, field: keyof MileageEntry, value: string | number | undefined) => {
     handleUpdate(id, field, value);
  };

  const handleDelete = (id: number | undefined) => {
    if (!id) return;
    api.delete(`${API_URL}/${id}`)
      .then(() => {
        setEntries(entries.filter(e => e.id !== id));
        try {
          // notification removed
        } catch (err) {
          // ignore
        }
      });
  };

  const handleArchive = (id: number | undefined) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to archive this mileage entry?')) {
      archiveMileageEntry(id).then(() => {
        setEntries(entries.filter(e => e.id !== id));
      });
    }
  };


  // Fallback translations for status and empty state
  const fallback = {
    noMileageEntriesYet: lang === 'fr' ? 'Aucune entrée de kilométrage pour le moment' : 'No mileage entries yet',
    startTrackingMileage: lang === 'fr' ? 'Commencez à suivre le kilométrage de votre véhicule en cliquant sur "Créer un kilométrage".' : 'Start tracking your vehicle mileage by clicking "Create Mileage".'
  };
  if (loading) return <div className="p-6">{t.loading}</div>;

  let bg = '';
  let card = '';
  let button = '';
  if (colorScheme === 'dark') {
    bg = 'bg-surface-950';
    card = 'bg-surface-800 border border-surface-700 text-surface-100';
    button = 'bg-brand-600 hover:bg-brand-700';
  } else if (colorScheme === 'performance') {
    bg = 'bg-surface-100';
    card = 'bg-white border border-surface-300';
    button = 'bg-green-600 hover:bg-green-700';
  } else if (colorScheme === 'current') {
    bg = 'bg-gradient-to-br from-brand-50 to-purple-100';
    card = 'bg-white/80 backdrop-blur border border-brand-200 text-surface-900';
    button = 'bg-brand-600 hover:bg-brand-700';
  } else {
    bg = 'bg-surface-50';
    card = 'bg-white border border-surface-200 shadow-card';
    button = 'bg-brand-600 hover:bg-brand-700';
  }
  // Helper for supplier avatar
  const getSupplierAvatar = (supplier: string) => {
    if (!supplier) return (
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${colorScheme === 'dark' ? 'bg-surface-700 text-brand-400' : 'bg-brand-50 text-brand-600'}`}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1" stroke="currentColor" strokeWidth="2"/></svg>
      </span>
    );
    const initials = supplier.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    return (
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${colorScheme === 'dark' ? 'bg-brand-600 text-white' : 'bg-brand-500 text-white'}`}>
        {initials}
      </span>
    );
  };

  // Helper for circular progress meter
  const CircularMeter = ({ value, max }: { value: number, max: number }) => {
    const radius = 18;
    const stroke = 4;
    const normalized = Math.min(value, max);
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalized / max) * circumference;
    const trackColor = colorScheme === 'dark' ? '#334155' : '#e0e7ff';
    const progressColor = colorScheme === 'dark' ? '#3b82f6' : '#3b82f6';
    const textColor = colorScheme === 'dark' ? '#93c5fd' : '#3b82f6';
    return (
      <svg width="44" height="44" className="block" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle cx="22" cy="22" r={radius} stroke={progressColor} strokeWidth={stroke} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{transition: 'stroke-dashoffset 0.5s'}} />
        <text x="22" y="26" textAnchor="middle" fontSize="12" fill={textColor} fontWeight="bold">{value}</text>
      </svg>
    );
  };

  return (
    <main className={`${bg} flex flex-col w-full`}>
      <div className={(colorScheme === 'dark' ? 'flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8' : 'flex-1 pt-2 px-2 sm:px-4 lg:px-8 pb-8')}>
          <div className="flex justify-center mb-4">
            <button
              className={`mt-2 w-full sm:w-auto px-5 py-2.5 text-white rounded-lg shadow-sm font-semibold transition-colors duration-150 ${colorScheme === 'dark' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-brand-600 hover:bg-brand-700'}`}
              onClick={handleCreate}
            >
              {t.create} {t.mileage}
            </button>
          </div>
          <div className="grid gap-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                {/* Friendly empty state illustration */}
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" className={`mb-4 ${colorScheme === 'dark' ? 'text-surface-700' : 'text-surface-300'}`}><path d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5M5 13v4a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-4M7 16h.01M17 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div className={`text-lg font-medium ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-600'}`}>{(t as any).noMileageEntriesYet || fallback.noMileageEntriesYet}</div>
                <div className={`text-sm mb-2 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'}`}>{(t as any).startTrackingMileage || fallback.startTrackingMileage}</div>
              </div>
            ) : [...entries].sort((a, b) => {
                // Sort by date ascending (earliest first)
                if (!a.date) return 1;
                if (!b.date) return -1;
                return a.date.localeCompare(b.date);
              }).map(entry => (
              <div
                key={entry.id}
                className={`${card} rounded-xl p-3 shadow-card hover:shadow-card-hover transition-shadow duration-150 relative overflow-x-auto w-full`}
              >
                <div className="mb-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500 select-all">ID: {entry.id}</span>
                </div>
                {/* Animated gradient shimmer for current mode */}
                {colorScheme === 'current' && (
                  <div className="absolute inset-0 z-0 animate-gradient-move pointer-events-none" style={{background: 'linear-gradient(120deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)'}}></div>
                )}
                <div className="flex items-center justify-between gap-3 z-10 relative min-w-max">
                  {/* Left side - all inputs and controls */}
                  <div className="flex items-center gap-3">
                    {/* Supplier avatar/icon */}
                    <div className="flex-shrink-0">{getSupplierAvatar(entry.supplier)}</div>
                    {/* Date input */}
                    <div className="flex-shrink-0 w-[140px]">
                      {(() => {
                        const dateInputRef = React.createRef<HTMLInputElement>();
                        return (
                          <div
                            className={`border rounded-lg flex items-center cursor-pointer h-10 px-2 ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100' : colorScheme === 'current' ? 'bg-white/60 text-surface-900' : 'bg-surface-50 border-surface-200'}`}
                            onClick={() => dateInputRef.current && dateInputRef.current.showPicker && dateInputRef.current.showPicker()}
                          >
                            <input
                              ref={dateInputRef}
                              type="date"
                              className={`outline-none w-full bg-transparent h-8 text-sm ${colorScheme === 'dark' ? '[color-scheme:dark]' : ''}`}
                              value={entry.date}
                              onChange={e => handleChange(entry.id, 'date', e.target.value)}
                              placeholder={t.startDate}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    {/* Supplier */}
                    <input
                      type="text"
                      className={`border rounded-lg transition-colors h-10 px-2 text-sm flex-shrink-0 w-[140px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100 focus:border-brand-500 focus:bg-surface-800' : colorScheme === 'current' ? 'bg-white/60 focus:bg-white text-surface-900' : 'bg-surface-50 border-surface-200 focus:bg-white focus:border-brand-400'}`}
                      value={entry.supplier}
                      onChange={e => handleChange(entry.id, 'supplier', e.target.value)}
                      placeholder={t.supplier || 'Supplier'}
                    />
                    <input
                      type="number"
                      className={`border rounded-lg transition-colors h-10 px-2 text-sm flex-shrink-0 w-[100px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100 focus:border-brand-500 focus:bg-surface-800' : colorScheme === 'current' ? 'bg-white/60 focus:bg-white text-surface-900' : 'bg-surface-50 border-surface-200 focus:bg-white focus:border-brand-400'}`}
                      value={entry.startKm}
                      onChange={e => handleChange(entry.id, 'startKm', e.target.value)}
                      placeholder={t.startKm || 'Start Km'}
                      min="0"
                    />
                    <input
                      type="number"
                      className={`border rounded-lg transition-colors h-10 px-2 text-sm flex-shrink-0 w-[100px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100 focus:border-brand-500 focus:bg-surface-800' : colorScheme === 'current' ? 'bg-white/60 focus:bg-white text-surface-900' : 'bg-surface-50 border-surface-200 focus:bg-white focus:border-brand-400'}`}
                      value={entry.endKm}
                      onChange={e => handleChange(entry.id, 'endKm', e.target.value)}
                      placeholder={t.endKm || 'End Km'}
                      min="0"
                    />
                    {/* Work Order Link Dropdown */}
                    <div className="flex flex-col">
                      <select
                        className={`border rounded-lg h-10 px-2 text-sm flex-shrink-0 w-[180px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100' : 'bg-white border-surface-200'}`}
                        value={entry.workOrderId || ''}
                        onChange={e => handleChange(entry.id, 'workOrderId', e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">{t.linkWorkOrder}</option>
                        {workOrders.map(wo => (
                          <option key={wo.id} value={wo.id}>{wo.title}</option>
                        ))}
                      </select>
                      {entry.workOrderId && (
                        <a
                          href={`${basePath}/work-orders/${entry.workOrderId}`}
                          className="text-xs text-blue-600 underline mt-1 hover:text-blue-800"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {workOrders.find(wo => wo.id === entry.workOrderId)?.title || (t as any).viewWorkOrder || 'View Work Order'}
                        </a>
                      )}
                    </div>
                    {/* Urgent Work Order Link Dropdown */}
                    <div className="flex flex-col">
                      <select
                        className={`border rounded-lg h-10 px-2 text-sm flex-shrink-0 w-[180px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-surface-100' : 'bg-white border-surface-200'}`}
                        value={entry.urgentWorkOrderId || ''}
                        onChange={e => handleChange(entry.id, 'urgentWorkOrderId', e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">{t.linkUrgentWorkOrder}</option>
                        {urgentWorkOrders.map(uwo => (
                          <option key={uwo.id} value={uwo.id}>{uwo.title}</option>
                        ))}
                      </select>
                      {entry.urgentWorkOrderId && (
                        <a
                          href={`${basePath}/urgent-work-orders/${entry.urgentWorkOrderId}`}
                          className="text-xs text-purple-600 underline mt-1 hover:text-purple-800"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {urgentWorkOrders.find(uwo => uwo.id === entry.urgentWorkOrderId)?.title || (t as any).viewUrgentWorkOrder || 'View Urgent Work Order'}
                        </a>
                      )}
                    </div>
                    <div className={`border rounded-lg flex items-center text-sm font-semibold h-10 px-2 flex-shrink-0 w-[110px] ${colorScheme === 'dark' ? 'bg-surface-700 border-surface-600 text-brand-300' : colorScheme === 'current' ? 'bg-white/60 text-surface-900' : 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                      {t.totalKm ? `${t.totalKm}: ` : 'Total: '}{computeTotalKm(entry.startKm, entry.endKm)}
                    </div>
                    <button
                      className={`rounded-lg font-semibold h-10 px-3 flex items-center justify-center flex-shrink-0 transition-colors ${colorScheme === 'dark' ? 'bg-surface-700 hover:bg-surface-600 text-amber-400 border border-amber-500/20' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'}`}
                      onClick={() => handleArchive(entry.id)}
                      title="Archive"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
                    <button
                      className={`rounded-lg font-semibold h-10 px-3 text-sm whitespace-nowrap flex-shrink-0 transition-colors ${colorScheme === 'dark' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25 hover:bg-red-500/25' : 'bg-red-50 hover:bg-red-100 text-red-600 ring-1 ring-red-200'}`}
                      onClick={() => handleDelete(entry.id)}
                    >{t.delete}</button>
                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {Number(computeTotalKm(entry.startKm, entry.endKm)) > 0 ? (
                        <span className={`inline-block px-3 py-1.5 rounded-md font-semibold text-sm whitespace-nowrap ${colorScheme === 'dark' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>{t.complete}</span>
                      ) : (
                        <span className={`inline-block px-3 py-1.5 rounded-md font-semibold text-sm whitespace-nowrap ${colorScheme === 'dark' ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>{t.incomplete}</span>
                      )}
                    </div>
                  </div>
                  {/* Right side - Circular meter pinned to edge */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0 ml-auto pl-4">
                    <span className={`text-xs font-semibold ${colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-600'}`}>{t.totalKm}</span>
                    <CircularMeter value={Number(computeTotalKm(entry.startKm, entry.endKm))} max={1000} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className={`mt-6 text-center text-sm opacity-70 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-600'}`}>
            {t.pageExplanationMileage}
          </p>
        </div>
    </main>
  );
};

export default MileagePage;