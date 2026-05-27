import React, { useState, useEffect } from 'react';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  getMileageRates, createMileageRate,
  archiveOldWaypoints,
} from '../lib/api';
import type { Vehicle, UserMileageRate } from '../types/api';
import PageHeader from '../components/PageHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    // Date-only strings (YYYY-MM-DD) must be parsed as local midnight,
    // not UTC midnight, to avoid off-by-one day in non-UTC timezones.
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

// ─── VehicleRow ───────────────────────────────────────────────────────────────

interface VehicleRowProps {
  vehicle: Vehicle;
  isDark: boolean;
  onSave: (id: number, patch: Partial<Vehicle>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const VehicleRow: React.FC<VehicleRowProps> = ({ vehicle, isDark, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(vehicle.label);
  const [plate, setPlate] = useState(vehicle.licensePlate ?? '');
  const [notes, setNotes] = useState(vehicle.notes ?? '');
  const [active, setActive] = useState(vehicle.active);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const row = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const input = isDark
    ? 'bg-surface-700 border-surface-600 text-white placeholder-surface-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave(vehicle.id, { label: label.trim(), licensePlate: plate.trim() || undefined, notes: notes.trim() || undefined, active });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer le véhicule « ${vehicle.label} » ?`)) return;
    setDeleting(true);
    try { await onDelete(vehicle.id); } finally { setDeleting(false); }
  }

  if (editing) {
    return (
      <tr className={`border-b ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
        <td className="px-4 py-2" colSpan={5}>
          <div className={`rounded-lg border p-4 ${row}`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>Nom *</label>
                <input className={`w-full rounded border px-2 py-1.5 text-sm ${input}`} value={label} onChange={e => setLabel(e.target.value)} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>Plaque</label>
                <input className={`w-full rounded border px-2 py-1.5 text-sm ${input}`} value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC-1234" />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>Notes</label>
                <input className={`w-full rounded border px-2 py-1.5 text-sm ${input}`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Camion blanc Ford…" />
              </div>
              <div className="flex items-end gap-2">
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                  <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-blue-600" />
                  Actif
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !label.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
              <button onClick={() => setEditing(false)} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-surface-600 text-surface-200 hover:bg-surface-500' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                Annuler
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const sub = isDark ? 'text-surface-400' : 'text-slate-500';
  return (
    <tr className={`border-b ${isDark ? 'border-surface-700 hover:bg-surface-750' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
      <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {vehicle.label}
      </td>
      <td className={`px-4 py-3 text-sm ${sub}`}>{vehicle.licensePlate || '—'}</td>
      <td className={`px-4 py-3 text-sm ${sub}`}>{vehicle.notes || '—'}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          vehicle.active
            ? isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
            : isDark ? 'bg-surface-600 text-surface-300' : 'bg-slate-100 text-slate-500'
        }`}>
          {vehicle.active ? '✓ Actif' : 'Inactif'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(true)}
            className={`px-2.5 py-1 rounded text-xs font-medium ${isDark ? 'bg-surface-600 text-surface-200 hover:bg-surface-500' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            ✏️ Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            {deleting ? '…' : '🗑️'}
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminTripSettingsPage: React.FC = () => {
  const { isDark } = React.useContext(ColorSchemeContext);

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vLoading, setVLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creatingV, setCreatingV] = useState(false);

  // Mileage rates state
  const [rates, setRates] = useState<UserMileageRate[]>([]);
  const [rLoading, setRLoading] = useState(true);
  const [newRate, setNewRate] = useState('');
  const [newFrom, setNewFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [creatingR, setCreatingR] = useState(false);

  // Maintenance
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);
  const [keepDays, setKeepDays] = useState('395');

  const card = isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-slate-200';
  const heading = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-surface-400' : 'text-slate-500';
  const input = isDark
    ? 'bg-surface-700 border-surface-600 text-white placeholder-surface-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const theadTh = isDark ? 'bg-surface-900 text-surface-300' : 'bg-slate-50 text-slate-600';

  // Load vehicles + rates in parallel on mount
  useEffect(() => {
    getVehicles()
      .then(setVehicles)
      .catch(() => {})
      .finally(() => setVLoading(false));

    getMileageRates()
      .then(r => setRates(r.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))))
      .catch(() => {})
      .finally(() => setRLoading(false));
  }, []);

  // ── Vehicle actions ──────────────────────────────────────────────────────────

  async function handleCreateVehicle() {
    if (!newLabel.trim()) return;
    setCreatingV(true);
    try {
      const v = await createVehicle({ label: newLabel.trim(), licensePlate: newPlate.trim() || undefined, notes: newNotes.trim() || undefined, active: true });
      setVehicles(prev => [...prev, v]);
      setNewLabel(''); setNewPlate(''); setNewNotes('');
    } catch (e: any) {
      alert('Erreur: ' + (e?.response?.data?.message ?? e?.message));
    } finally {
      setCreatingV(false);
    }
  }

  async function handleSaveVehicle(id: number, patch: Partial<Vehicle>) {
    const updated = await updateVehicle(id, patch);
    setVehicles(prev => prev.map(v => v.id === id ? updated : v));
  }

  async function handleDeleteVehicle(id: number) {
    await deleteVehicle(id);
    setVehicles(prev => prev.filter(v => v.id !== id));
  }

  // ── Mileage rate actions ─────────────────────────────────────────────────────

  async function handleCreateRate() {
    const cents = Math.round(parseFloat(newRate) * 100);
    if (isNaN(cents) || cents <= 0) { alert('Taux invalide.'); return; }
    if (!newFrom) { alert('Date requise.'); return; }
    setCreatingR(true);
    try {
      const r = await createMileageRate({ centsPerKm: cents, effectiveFrom: newFrom });
      setRates(prev => [r, ...prev]);
      setNewRate('');
    } catch (e: any) {
      alert('Erreur: ' + (e?.response?.data?.message ?? e?.message));
    } finally {
      setCreatingR(false);
    }
  }

  // ── Maintenance ──────────────────────────────────────────────────────────────

  async function handleArchive() {
    const days = parseInt(keepDays, 10);
    if (isNaN(days) || days < 30) { alert('Minimum 30 jours.'); return; }
    if (!window.confirm(`Archiver les points GPS de trajets de plus de ${days} jours?`)) return;
    setArchiving(true);
    setArchiveResult(null);
    try {
      const res = await archiveOldWaypoints(days);
      setArchiveResult(`✅ ${res.archived} point(s) archivés. Coupure: ${fmtDate(res.cutoff)}`);
    } catch (e: any) {
      setArchiveResult('❌ Erreur: ' + (e?.response?.data?.message ?? e?.message));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-surface-900' : 'bg-slate-50'}`}>
      <PageHeader title="Paramètres Trajets" subtitle="Véhicules, taux kilométriques, maintenance" />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── Vehicles section ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-lg font-semibold ${heading}`}>🚗 Véhicules</h2>
              <p className={`text-sm ${sub}`}>Les véhicules actifs apparaissent dans l'app mobile lors du démarrage d'un trajet.</p>
            </div>
          </div>

          {/* Add vehicle form */}
          <div className={`rounded-xl border p-4 mb-4 ${card}`}>
            <p className={`text-sm font-medium mb-3 ${heading}`}>Ajouter un véhicule</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>Nom *</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                  placeholder="Ex: Camion Ford F-150"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateVehicle()}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>Plaque</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                  placeholder="ABC-1234"
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>Notes</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                  placeholder="Couleur, particularités…"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleCreateVehicle}
              disabled={creatingV || !newLabel.trim()}
              className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creatingV ? 'Ajout…' : '+ Ajouter'}
            </button>
          </div>

          {/* Vehicles table */}
          <div className={`rounded-xl border overflow-hidden ${card}`}>
            {vLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vehicles.length === 0 ? (
              <p className={`text-center py-8 text-sm ${sub}`}>Aucun véhicule configuré.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Nom', 'Plaque', 'Notes', 'Statut', ''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${theadTh}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <VehicleRow
                      key={v.id}
                      vehicle={v}
                      isDark={isDark}
                      onSave={handleSaveVehicle}
                      onDelete={handleDeleteVehicle}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Mileage rates section ─────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${heading}`}>💰 Taux kilométriques</h2>
            <p className={`text-sm ${sub}`}>Le taux en vigueur à la date du trajet est utilisé pour calculer le remboursement. Le taux ARC 2025 est 70¢/km.</p>
          </div>

          {/* Add rate form */}
          <div className={`rounded-xl border p-4 mb-4 ${card}`}>
            <p className={`text-sm font-medium mb-3 ${heading}`}>Ajouter un nouveau taux</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>Taux ($/km) *</label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${sub}`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                    placeholder="0.70"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>En vigueur à partir du *</label>
                <input
                  type="date"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                  value={newFrom}
                  onChange={e => setNewFrom(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleCreateRate}
              disabled={creatingR || !newRate || !newFrom}
              className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creatingR ? 'Ajout…' : '+ Ajouter'}
            </button>
          </div>

          {/* Rates table */}
          <div className={`rounded-xl border overflow-hidden ${card}`}>
            {rLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rates.length === 0 ? (
              <p className={`text-center py-8 text-sm ${sub}`}>Aucun taux configuré. Le système utilisera 70¢/km par défaut.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Taux ($/km)', 'En vigueur depuis', 'Ajouté le', ''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${theadTh}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, i) => (
                    <tr key={r.id} className={`border-b ${isDark ? 'border-surface-700' : 'border-slate-100'}`}>
                      <td className={`px-4 py-3 font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                        {(r.centsPerKm / 100).toFixed(2)} $/km
                        {i === 0 && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            actuel
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>{fmtDate(r.effectiveFrom)}</td>
                      <td className={`px-4 py-3 text-xs ${sub}`}>{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Maintenance section ───────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${heading}`}>🗄️ Maintenance des données</h2>
            <p className={`text-sm ${sub}`}>Archiver les points GPS bruts libère de l'espace. Les trajets eux-mêmes (distances, adresses, montants) sont conservés.</p>
          </div>
          <div className={`rounded-xl border p-4 ${card}`}>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${sub}`}>Conserver les points GPS des N derniers jours</label>
                <input
                  type="number"
                  min="30"
                  className={`w-28 rounded-lg border px-3 py-2 text-sm ${input} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                  value={keepDays}
                  onChange={e => setKeepDays(e.target.value)}
                />
              </div>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {archiving ? 'Archivage…' : '🗑️ Archiver les anciens waypoints'}
              </button>
            </div>
            {archiveResult && (
              <p className={`mt-3 text-sm ${archiveResult.startsWith('✅') ? (isDark ? 'text-green-300' : 'text-green-700') : (isDark ? 'text-red-300' : 'text-red-700')}`}>
                {archiveResult}
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default AdminTripSettingsPage;
