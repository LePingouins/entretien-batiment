import React, { useState, useEffect, useContext } from 'react';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../components/AdminLayout';

interface MileageEntry {
  id?: number;
  date: string;
  supplier: string;
  startKm: string;
  endKm: string;
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
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setEntries(data.map((e: any) => ({
          id: e.id,
          date: e.date || '',
          supplier: e.supplier || '',
          startKm: e.startKm?.toString() || '',
          endKm: e.endKm?.toString() || '',
        })));
        setLoading(false);
      });
  }, []);

  const handleCreate = () => {
    const newEntry: MileageEntry = {
      date: '',
      supplier: '',
      startKm: '',
      endKm: '',
    };
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newEntry }),
    })
      .then(res => res.json())
      .then(created => {
        setEntries([...entries, {
          id: created.id,
          date: created.date || '',
          supplier: created.supplier || '',
          startKm: created.startKm?.toString() || '',
          endKm: created.endKm?.toString() || '',
        }]);
      });
  };

  const handleChange = (id: number | undefined, field: keyof MileageEntry, value: string) => {
    setEntries(entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = { ...entry, [field]: value };
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updated,
        startKm: updated.startKm ? parseInt(updated.startKm) : null,
        endKm: updated.endKm ? parseInt(updated.endKm) : null,
      }),
    });
  };

  const handleDelete = (id: number | undefined) => {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .then(() => setEntries(entries.filter(e => e.id !== id)));
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
  if (colorScheme === 'performance') {
    bg = 'bg-gray-100';
    card = 'bg-white border border-gray-300';
    button = 'bg-green-600 hover:bg-green-700';
  } else if (colorScheme === 'current') {
    bg = 'bg-gradient-to-br from-blue-50 to-purple-100';
    card = 'bg-gradient-to-br from-blue-100 via-purple-200 to-blue-200 border border-blue-200 text-blue-900';
    button = 'bg-blue-600 hover:bg-blue-700';
  } else {
    bg = 'bg-gradient-to-br from-blue-50 to-purple-100';
    card = 'bg-white border border-blue-100';
    button = 'bg-blue-600 hover:bg-blue-700';
  }
  // Helper for supplier avatar
  const getSupplierAvatar = (supplier: string) => {
    if (!supplier) return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-200 text-blue-700 font-bold text-lg">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1" stroke="currentColor" strokeWidth="2"/></svg>
      </span>
    );
    const initials = supplier.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-lg">
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
    return (
      <svg width="44" height="44" className="block" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} stroke="#e0e7ff" strokeWidth={stroke} fill="none" />
        <circle cx="22" cy="22" r={radius} stroke="#6366f1" strokeWidth={stroke} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{transition: 'stroke-dashoffset 0.5s'}} />
        <text x="22" y="26" textAnchor="middle" fontSize="12" fill="#6366f1" fontWeight="bold">{value}</text>
      </svg>
    );
  };

  return (
    <main className={`${bg} min-h-screen flex flex-col justify-between w-full`}>
      <div className="flex-1 w-full">
        <div className="p-2 sm:p-6">
          <div className="flex flex-col items-center justify-center mb-4 w-full">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-blue-900 tracking-tight mb-2" style={{ letterSpacing: '0.02em' }}>{t.mileage}</h1>
            <button
              className="mt-2 w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg font-semibold hover:scale-105 transition-transform duration-150"
              onClick={handleCreate}
            >
              {t.create} {t.mileage}
            </button>
          </div>
          <div className="grid gap-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                {/* Friendly empty state illustration */}
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" className="mb-4 text-blue-300"><path d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5M5 13v4a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-4M7 16h.01M17 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div className="text-lg text-blue-700 font-medium">{(t as any).noMileageEntriesYet || fallback.noMileageEntriesYet}</div>
                <div className="text-sm text-blue-400 mb-2">{(t as any).startTrackingMileage || fallback.startTrackingMileage}</div>
              </div>
            ) : [...entries].sort((a, b) => {
                // Sort by date ascending (earliest first)
                if (!a.date) return 1;
                if (!b.date) return -1;
                return a.date.localeCompare(b.date);
              }).map(entry => (
              <div
                key={entry.id}
                className={`${card} rounded-xl p-3 shadow-lg hover:shadow-xl transition-shadow duration-150 relative overflow-x-auto w-full`}
              >
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
                            className={`border rounded flex items-center cursor-pointer ${colorScheme === 'current' ? 'bg-gradient-to-br from-blue-100 to-purple-200 text-blue-900' : 'bg-white'} h-10 px-2`}
                            onClick={() => dateInputRef.current && dateInputRef.current.showPicker && dateInputRef.current.showPicker()}
                          >
                            <input
                              ref={dateInputRef}
                              type="date"
                              className="outline-none w-full bg-transparent h-8 text-sm"
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
                      className={`border rounded transition-colors h-10 px-2 text-sm flex-shrink-0 w-[140px] ${colorScheme === 'current' ? 'bg-blue-100 focus:bg-white text-blue-900' : 'bg-blue-50 focus:bg-white'}`}
                      value={entry.supplier}
                      onChange={e => handleChange(entry.id, 'supplier', e.target.value)}
                      placeholder={t.supplier || 'Supplier'}
                    />
                    <input
                      type="number"
                      className={`border rounded transition-colors h-10 px-2 text-sm flex-shrink-0 w-[100px] ${colorScheme === 'current' ? 'bg-blue-100 focus:bg-white text-blue-900' : 'bg-blue-50 focus:bg-white'}`}
                      value={entry.startKm}
                      onChange={e => handleChange(entry.id, 'startKm', e.target.value)}
                      placeholder={t.startKm || 'Start Km'}
                      min="0"
                    />
                    <input
                      type="number"
                      className={`border rounded transition-colors h-10 px-2 text-sm flex-shrink-0 w-[100px] ${colorScheme === 'current' ? 'bg-blue-100 focus:bg-white text-blue-900' : 'bg-blue-50 focus:bg-white'}`}
                      value={entry.endKm}
                      onChange={e => handleChange(entry.id, 'endKm', e.target.value)}
                      placeholder={t.endKm || 'End Km'}
                      min="0"
                    />
                    <div className={`border rounded flex items-center text-sm font-semibold h-10 px-2 flex-shrink-0 w-[110px] ${colorScheme === 'current' ? 'bg-blue-100 text-blue-900' : 'bg-blue-50 text-blue-700'}`}>
                      {t.totalKm ? `${t.totalKm}: ` : 'Total: '}{computeTotalKm(entry.startKm, entry.endKm)}
                    </div>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white rounded shadow font-semibold h-10 px-3 text-sm whitespace-nowrap flex-shrink-0"
                      onClick={() => handleDelete(entry.id)}
                    >{t.delete}</button>
                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {Number(computeTotalKm(entry.startKm, entry.endKm)) > 0 ? (
                        <span className="inline-block px-3 py-1.5 bg-green-100 text-green-700 rounded font-semibold text-sm whitespace-nowrap">{t.complete}</span>
                      ) : (
                        <span className="inline-block px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded font-semibold text-sm whitespace-nowrap">{t.incomplete}</span>
                      )}
                    </div>
                  </div>
                  {/* Right side - Circular meter pinned to edge */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0 ml-auto pl-4">
                    <span className="text-xs text-blue-600 font-semibold">{t.totalKm}</span>
                    <CircularMeter value={Number(computeTotalKm(entry.startKm, entry.endKm))} max={1000} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MileagePage;