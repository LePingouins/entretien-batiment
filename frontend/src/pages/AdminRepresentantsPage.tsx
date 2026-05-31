import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../context/LangContext';
import { expenseCategoryLabel } from '../lib/expenseCategories';
import { useToast } from '../context/ToastContext';
import {
  listRepresentants,
  getRepresentantProfile,
  expenseReceiptUrl,
  setExpenseStatus,
  representantCsvExportUrl,
  archiveExpense,
  deleteExpense,
  archiveRepTrip,
  deleteRepTrip,
  approveTrip,
  rejectTrip,
} from '../lib/api';
import { useConfirm } from '../context/ConfirmContext';
import { SecureImage } from '../components/SecureImage';
import { downloadSecureFile, openSecureFile } from '../lib/secureFile';
import TripDetailModal from '../components/TripDetailModal';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import type {
  RepresentantListItem,
  RepresentantProfile,
  RepTrip,
  Expense,
} from '../types/api';

const fmtMoney = (c?: number): string => {
  if (c == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CAD' }).format(c / 100);
};

const isoMonthsAgo = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);

const AdminRepresentantsPage: React.FC = () => {
  const { t, lang } = useLang();
  const { addToast } = useToast();
  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error:   (msg: string) => addToast(msg, 'error'),
  };
  const confirm = useConfirm();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';
  const [list, setList]         = useState<RepresentantListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile]   = useState<RepresentantProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(isoMonthsAgo(3));
  const [endDate, setEndDate]     = useState<string>(todayIso());
  const [updatingExpense, setUpdatingExpense] = useState<number | null>(null);
  const [updatingTrip, setUpdatingTrip] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<RepTrip | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleArchiveTrip = async (id: number) => {
    const ok = await confirm({
      title: lang === 'fr' ? 'Archiver ce trajet ?' : 'Archive this trip?',
      message: lang === 'fr' ? 'Il sera déplacé vers la page Archives.' : 'It will move to the Archive page.',
      confirmLabel: lang === 'fr' ? 'Archiver' : 'Archive',
    });
    if (!ok) return;
    try {
      await archiveRepTrip(id);
      setProfile(prev => prev ? { ...prev, trips: prev.trips.filter(tr => tr.id !== id) } : prev);
      toast.success(lang === 'fr' ? 'Trajet archivé' : 'Trip archived');
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de l’archivage' : 'Failed to archive');
    }
  };

  const handleDeleteTrip = async (id: number) => {
    const ok = await confirm({
      title: lang === 'fr' ? 'Supprimer ce trajet ?' : 'Delete this trip?',
      message: lang === 'fr' ? 'Action irréversible. Les photos seront aussi supprimées.' : 'Permanent. Photos will also be deleted.',
      confirmLabel: lang === 'fr' ? 'Supprimer' : 'Delete',
    });
    if (!ok) return;
    try {
      await deleteRepTrip(id);
      setProfile(prev => prev ? { ...prev, trips: prev.trips.filter(tr => tr.id !== id) } : prev);
      toast.success(lang === 'fr' ? 'Trajet supprimé' : 'Trip deleted');
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete');
    }
  };

  const handleArchiveExpense = async (id: number) => {
    const ok = await confirm({
      title: lang === 'fr' ? 'Archiver cette dépense ?' : 'Archive this expense?',
      message: lang === 'fr' ? 'Elle sera déplacée vers la page Archives.' : 'It will move to the Archive page.',
      confirmLabel: lang === 'fr' ? 'Archiver' : 'Archive',
    });
    if (!ok) return;
    try {
      await archiveExpense(id);
      setProfile(prev => prev ? { ...prev, expenses: prev.expenses.filter(ex => ex.id !== id) } : prev);
      toast.success(lang === 'fr' ? 'Dépense archivée' : 'Expense archived');
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de l’archivage' : 'Failed to archive');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    const ok = await confirm({
      title: lang === 'fr' ? 'Supprimer cette dépense ?' : 'Delete this expense?',
      message: lang === 'fr' ? 'Action irréversible. Les reçus seront aussi supprimés.' : 'Permanent. Receipts will also be deleted.',
      confirmLabel: lang === 'fr' ? 'Supprimer' : 'Delete',
    });
    if (!ok) return;
    try {
      await deleteExpense(id);
      setProfile(prev => prev ? { ...prev, expenses: prev.expenses.filter(ex => ex.id !== id) } : prev);
      toast.success(lang === 'fr' ? 'Dépense supprimée' : 'Expense deleted');
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete');
    }
  };

  const handleTripStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    let note: string | undefined;
    if (status === 'REJECTED') {
      const input = window.prompt(lang === 'fr' ? 'Motif du refus (optionnel) :' : 'Rejection reason (optional):');
      if (input === null) return; // cancelled
      note = input.trim() || undefined;
    }
    setUpdatingTrip(id);
    try {
      const updated = status === 'APPROVED'
        ? await approveTrip(id, note)
        : await rejectTrip(id, note || '');
      setProfile(prev => prev ? {
        ...prev,
        trips: prev.trips.map(tr => tr.id === id ? updated : tr),
      } : prev);
      if (selectedTrip?.id === id) setSelectedTrip(updated);
      toast.success(status === 'APPROVED'
        ? (lang === 'fr' ? 'Trajet approuvé' : 'Trip approved')
        : (lang === 'fr' ? 'Trajet refusé'  : 'Trip rejected'));
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update status');
    } finally {
      setUpdatingTrip(null);
    }
  };

  const handleExpenseStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    let note: string | undefined;
    if (status === 'REJECTED') {
      const input = window.prompt(lang === 'fr' ? 'Motif du refus (optionnel) :' : 'Rejection reason (optional):');
      if (input === null) return; // cancelled
      note = input.trim() || undefined;
    }
    setUpdatingExpense(id);
    try {
      const updated = await setExpenseStatus(id, status, note);
      setProfile(prev => prev ? {
        ...prev,
        expenses: prev.expenses.map(e => e.id === id ? { ...e, status: updated.status } : e),
      } : prev);
      if (selectedExpense?.id === id) setSelectedExpense({ ...selectedExpense, status: updated.status });
      toast.success(status === 'APPROVED'
        ? (lang === 'fr' ? 'Dépense approuvée' : 'Expense approved')
        : (lang === 'fr' ? 'Dépense refusée'  : 'Expense rejected'));
    } catch {
      toast.error(lang === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update status');
    } finally {
      setUpdatingExpense(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listRepresentants();
        setList(data);
      } catch (err) {
        console.error(err);
        toast.error(lang === 'fr' ? 'Échec du chargement' : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, []);

  const loadProfile = async (userId: number) => {
    try {
      setProfileLoading(true);
      const p = await getRepresentantProfile(userId, startDate, endDate);
      setProfile(p);
    } catch (err) {
      console.error(err);
      toast.error(lang === 'fr' ? 'Échec du chargement du profil' : 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId != null) loadProfile(selectedId);
    // eslint-disable-next-line
  }, [selectedId, startDate, endDate]);

  const handleDownload = async () => {
    if (selectedId == null) return;
    const qs = new URLSearchParams({ startDate, endDate });
    const path = `/api/admin/representants/${selectedId}/export?${qs}`;
    await downloadSecureFile(path, `representant-${selectedId}-${startDate}-${endDate}.xlsx`);
  };

  const handleDownloadCsv = async () => {
    if (selectedId == null) return;
    const qs = new URLSearchParams({ startDate, endDate });
    const path = `/api/admin/representants/${selectedId}/export-csv?${qs}`;
    await downloadSecureFile(path, `representant-${selectedId}-${startDate}-${endDate}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
        {t.representantsTitle || (lang === 'fr' ? 'Représentants' : 'Representatives')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-900 rounded-lg shadow overflow-hidden">
          <div className="p-3 border-b border-surface-200 dark:border-surface-700 font-semibold text-surface-800 dark:text-white">
            {lang === 'fr' ? 'Liste' : 'List'}
          </div>
          {loading ? (
            <div className="p-4 text-surface-500">…</div>
          ) : list.length === 0 ? (
            <div className="p-4 text-surface-500">
              {lang === 'fr' ? 'Aucun représentant.' : 'No representatives.'}
            </div>
          ) : (
            <ul className="divide-y divide-surface-200 dark:divide-surface-700">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors ${
                      selectedId === r.id ? 'bg-brand-50 dark:bg-brand-900/30' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {r.email}
                    </div>
                    <div className="text-xs text-surface-500">
                      {r.tripCount} {lang === 'fr' ? 'trajets' : 'trips'} · {r.expenseCount} {lang === 'fr' ? 'dépenses' : 'expenses'}
                      {!r.enabled && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">
                          {lang === 'fr' ? 'Désactivé' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedId == null ? (
            <div className="bg-white dark:bg-surface-900 rounded-lg p-6 text-center text-surface-500">
              {lang === 'fr' ? 'Sélectionnez un représentant.' : 'Select a representative.'}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-surface-900 rounded-lg shadow p-4 space-y-3">
                <div className="flex items-end gap-3 flex-wrap">
                  <label className="text-sm">
                    <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Date début' : 'Start date'}</div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Date fin' : 'End date'}</div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                    />
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { label: lang === 'fr' ? '2 semaines' : '2 weeks', weeks: 2 },
                      { label: lang === 'fr' ? '1 mois' : '1 month', months: 1 },
                      { label: lang === 'fr' ? '3 mois' : '3 months', months: 3 },
                    ] as Array<{ label: string; weeks?: number; months?: number }>).map((preset) => {
                      const d = new Date();
                      if (preset.weeks != null) d.setDate(d.getDate() - preset.weeks * 7);
                      else if (preset.months != null) d.setMonth(d.getMonth() - preset.months);
                      const presetStart = d.toISOString().slice(0, 10);
                      const isActive = startDate === presetStart && endDate === todayIso();
                      return (
                        <button
                          key={preset.label}
                          onClick={() => { setStartDate(presetStart); setEndDate(todayIso()); }}
                          className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${isActive ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleDownload}
                    className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                  >
                    {lang === 'fr' ? '📥 Télécharger Excel' : '📥 Download Excel'}
                  </button>

                </div>

                {profileLoading || !profile ? (
                  <div className="text-surface-500">…</div>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-surface-900 dark:text-white">
                      {profile.email}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded p-3 bg-surface-100 dark:bg-surface-800">
                        <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Total KM' : 'Total KM'}</div>
                        <div className="text-xl font-bold text-surface-900 dark:text-white">{profile.totalKm.toFixed(1)}</div>
                      </div>
                      <div className="rounded p-3 bg-surface-100 dark:bg-surface-800">
                        <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Remboursement' : 'Reimbursement'}</div>
                        <div className="text-xl font-bold text-surface-900 dark:text-white">{fmtMoney(profile.totalReimbursementCents)}</div>
                      </div>
                      <div className="rounded p-3 bg-surface-100 dark:bg-surface-800">
                        <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Dépenses' : 'Expenses'}</div>
                        <div className="text-xl font-bold text-surface-900 dark:text-white">{fmtMoney(profile.totalExpenseCents)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {profile && (
                <>
                  {/* Trips */}
                  <div className="bg-white dark:bg-surface-900 rounded-lg shadow overflow-x-auto">
                    <div className="p-3 border-b border-surface-200 dark:border-surface-700 font-semibold text-surface-800 dark:text-white">
                      {lang === 'fr' ? 'Trajets' : 'Trips'} ({profile.trips.length})
                    </div>
                    {profile.trips.length === 0 ? (
                      <div className="p-4 text-surface-500 text-sm">—</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                          <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-right">KM</th>
                            <th className="px-3 py-2 text-right">{lang === 'fr' ? 'Remb.' : 'Reimb.'}</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="text-surface-800 dark:text-surface-100">
                          {profile.trips.map((trip) => {
                            const tripStatus = trip.approvalStatus ?? trip.status;
                            return (
                            <tr
                              key={trip.id}
                              onClick={() => setSelectedTrip(trip)}
                              className="border-t border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60"
                              title={lang === 'fr' ? 'Voir les détails du trajet' : 'View trip details'}
                            >
                              <td className="px-3 py-1.5 whitespace-nowrap">{trip.date}</td>
                              <td className="px-3 py-1.5 text-right">{trip.totalKm?.toFixed?.(1) ?? '—'}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtMoney((trip as any).reimbursementCents)}</td>
                              <td className="px-3 py-1.5 text-center text-xs">{tripStatus}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                                {trip.approvalStatus === 'PENDING' && (
                                  <div className="flex gap-1 justify-end mb-1">
                                    <button
                                      disabled={updatingTrip === trip.id}
                                      onClick={() => handleTripStatus(trip.id, 'APPROVED')}
                                      className="px-2 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                    >
                                      {lang === 'fr' ? 'Approuver' : 'Approve'}
                                    </button>
                                    <button
                                      disabled={updatingTrip === trip.id}
                                      onClick={() => handleTripStatus(trip.id, 'REJECTED')}
                                      className="px-2 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                    >
                                      {lang === 'fr' ? 'Refuser' : 'Reject'}
                                    </button>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleArchiveTrip(trip.id)}
                                  className="px-2 py-1 rounded text-xs font-semibold bg-surface-200 hover:bg-surface-300 text-surface-700 dark:bg-surface-700 dark:hover:bg-surface-600 dark:text-surface-200 mr-1"
                                  title={lang === 'fr' ? 'Archiver' : 'Archive'}
                                >
                                  {lang === 'fr' ? 'Archiver' : 'Archive'}
                                </button>
                                <button
                                  onClick={() => handleDeleteTrip(trip.id)}
                                  className="px-2 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
                                  title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                                >
                                  {lang === 'fr' ? 'Supprimer' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Expenses */}
                  <div className="bg-white dark:bg-surface-900 rounded-lg shadow overflow-x-auto">
                    <div className="p-3 border-b border-surface-200 dark:border-surface-700 font-semibold text-surface-800 dark:text-white">
                      {lang === 'fr' ? 'Dépenses' : 'Expenses'} ({profile.expenses.length})
                    </div>
                    {profile.expenses.length === 0 ? (
                      <div className="p-4 text-surface-500 text-sm">—</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                          <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">{lang === 'fr' ? 'Fournisseur' : 'Supplier'}</th>
                            <th className="px-3 py-2 text-left">{lang === 'fr' ? 'Catégorie' : 'Category'}</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            <th className="px-3 py-2 text-center">{lang === 'fr' ? 'Photos' : 'Photos'}</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="text-surface-800 dark:text-surface-100">
                          {profile.expenses.map((e) => (
                            <tr
                              key={e.id}
                              onClick={() => setSelectedExpense(e)}
                              className="border-t border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60"
                              title={lang === 'fr' ? 'Voir les détails de la dépense' : 'View expense details'}
                            >
                              <td className="px-3 py-1.5 whitespace-nowrap">{e.date}</td>
                              <td className="px-3 py-1.5">{e.supplier || '—'}</td>
                              <td className="px-3 py-1.5">{e.description ? expenseCategoryLabel(e.description, lang as 'fr' | 'en') : '—'}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtMoney(e.totalCents)}</td>
                              <td className="px-3 py-1.5 text-center" onClick={(ev) => ev.stopPropagation()}>
                                {e.receipts.length === 0 ? (
                                  <span className="text-surface-400">—</span>
                                ) : (
                                  <div className="flex gap-1 justify-center">
                                    {e.receipts.slice(0, 3).map((r) => (
                                      <button
                                        key={r.id}
                                        onClick={() => openSecureFile(expenseReceiptUrl(r.filename))}
                                        className="focus:outline-none"
                                        title={lang === 'fr' ? 'Ouvrir le reçu' : 'Open receipt'}
                                      >
                                        {(r.contentType || '').startsWith('image/') ? (
                                          <SecureImage src={expenseReceiptUrl(r.filename)} alt="" className="w-8 h-8 object-cover rounded hover:opacity-80 transition-opacity" />
                                        ) : (
                                          <span className="inline-flex w-8 h-8 bg-surface-200 dark:bg-surface-700 text-xs items-center justify-center rounded hover:opacity-80">📄</span>
                                        )}
                                      </button>
                                    ))}
                                    {e.receipts.length > 3 && <span className="text-xs self-center">+{e.receipts.length - 3}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {(() => {
                                  const s = e.status;
                                  if (s === 'APPROVED') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">✅ {lang === 'fr' ? 'Approuvé' : 'Approved'}</span>;
                                  if (s === 'REJECTED') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">⛔ {lang === 'fr' ? 'Refusé' : 'Rejected'}</span>;
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">⏳ {lang === 'fr' ? 'En attente' : 'Pending'}</span>;
                                })()}
                              </td>
                              <td className="px-3 py-1.5 text-center whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                                {e.status === 'PENDING' && (
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      disabled={updatingExpense === e.id}
                                      onClick={() => handleExpenseStatus(e.id, 'APPROVED')}
                                      className="px-2 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                    >
                                      {lang === 'fr' ? 'Approuver' : 'Approve'}
                                    </button>
                                    <button
                                      disabled={updatingExpense === e.id}
                                      onClick={() => handleExpenseStatus(e.id, 'REJECTED')}
                                      className="px-2 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                    >
                                      {lang === 'fr' ? 'Refuser' : 'Reject'}
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-1 justify-center mt-1">
                                  <button
                                    onClick={() => handleArchiveExpense(e.id)}
                                    className="px-2 py-1 rounded text-xs font-semibold bg-surface-200 hover:bg-surface-300 text-surface-700 dark:bg-surface-700 dark:hover:bg-surface-600 dark:text-surface-200"
                                  >
                                    {lang === 'fr' ? 'Archiver' : 'Archive'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(e.id)}
                                    className="px-2 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    {lang === 'fr' ? 'Supprimer' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          isDark={isDark}
          onClose={() => setSelectedTrip(null)}
          onUpdate={(updated) => {
            setProfile(prev => prev ? {
              ...prev,
              trips: prev.trips.map(tr => tr.id === updated.id ? updated : tr),
            } : prev);
            setSelectedTrip(updated);
          }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          lang={lang}
          updating={updatingExpense === selectedExpense.id}
          onClose={() => setSelectedExpense(null)}
          onApprove={() => handleExpenseStatus(selectedExpense.id, 'APPROVED')}
          onReject={() => handleExpenseStatus(selectedExpense.id, 'REJECTED')}
          onArchive={() => { handleArchiveExpense(selectedExpense.id); setSelectedExpense(null); }}
          onDelete={() => { handleDeleteExpense(selectedExpense.id); setSelectedExpense(null); }}
        />
      )}
    </div>
  );
};

interface ExpenseDetailModalProps {
  expense: Expense;
  lang: string;
  updating: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense, lang, updating, onClose, onApprove, onReject, onArchive, onDelete,
}) => {
  const statusBadge = (() => {
    if (expense.status === 'APPROVED') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✅ {lang === 'fr' ? 'Approuvé' : 'Approved'}</span>;
    if (expense.status === 'REJECTED') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">⛔ {lang === 'fr' ? 'Refusé' : 'Rejected'}</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">⏳ {lang === 'fr' ? 'En attente' : 'Pending'}</span>;
  })();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              {lang === 'fr' ? 'Détails de la dépense' : 'Expense details'}
            </h2>
            {statusBadge}
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-800 dark:hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          {/* Meta info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <div className="text-surface-500 text-xs">Date</div>
              <div className="text-surface-900 dark:text-white">{expense.date}</div>
            </div>
            <div>
              <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Fournisseur' : 'Supplier'}</div>
              <div className="text-surface-900 dark:text-white">{expense.supplier || '—'}</div>
            </div>
            <div>
              <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Province' : 'Province'}</div>
              <div className="text-surface-900 dark:text-white">{expense.province || '—'}</div>
            </div>
            <div>
              <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Code imputation' : 'Imputation code'}</div>
              <div className="text-surface-900 dark:text-white">{expense.imputationCode || '—'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-surface-500 text-xs">{lang === 'fr' ? 'Catégorie' : 'Category'}</div>
              <div className="text-surface-900 dark:text-white whitespace-pre-wrap">{expense.description ? expenseCategoryLabel(expense.description, lang as 'fr' | 'en') : '—'}</div>
            </div>
          </div>

          {/* Receipt-style amount breakdown */}
          <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
            <div className="px-3 py-2 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-semibold uppercase tracking-wide">
              {lang === 'fr' ? 'Montants' : 'Amounts'}
            </div>
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-surface-600 dark:text-surface-300">{lang === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
                <span className="text-surface-900 dark:text-white tabular-nums">{fmtMoney(expense.subtotalCents)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-surface-600 dark:text-surface-300">TPS</span>
                <span className="text-surface-900 dark:text-white tabular-nums">{fmtMoney(expense.tpsCents)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-surface-600 dark:text-surface-300">TVQ</span>
                <span className="text-surface-900 dark:text-white tabular-nums">{fmtMoney(expense.tvqCents)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-surface-600 dark:text-surface-300">TVH</span>
                <span className="text-surface-900 dark:text-white tabular-nums">{fmtMoney(expense.tvhCents)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-surface-600 dark:text-surface-300">{lang === 'fr' ? 'Pourboire' : 'Tip'}</span>
                <span className="text-surface-900 dark:text-white tabular-nums">{fmtMoney(expense.tipCents)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-surface-50 dark:bg-surface-800/60">
                <span className="text-surface-900 dark:text-white font-semibold">Total</span>
                <span className="text-surface-900 dark:text-white font-bold tabular-nums">{fmtMoney(expense.totalCents)}</span>
              </div>
            </div>
          </div>

          {expense.approvalNote && (
            <div className="rounded p-3 bg-surface-100 dark:bg-surface-800">
              <div className="text-surface-500 text-xs mb-1">{lang === 'fr' ? 'Note d’approbation' : 'Approval note'}</div>
              <div className="text-surface-900 dark:text-white whitespace-pre-wrap">{expense.approvalNote}</div>
            </div>
          )}

          <div>
            <div className="text-surface-500 text-xs mb-2">{lang === 'fr' ? 'Reçus' : 'Receipts'} ({expense.receipts.length})</div>
            {expense.receipts.length === 0 ? (
              <div className="text-surface-400">—</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expense.receipts.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openSecureFile(expenseReceiptUrl(r.filename))}
                    className="block rounded overflow-hidden border border-surface-200 dark:border-surface-700 hover:opacity-80 transition-opacity"
                    title={r.originalName || r.filename}
                  >
                    {(r.contentType || '').startsWith('image/') ? (
                      <SecureImage src={expenseReceiptUrl(r.filename)} alt="" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-surface-100 dark:bg-surface-800 text-3xl">📄</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end px-4 py-3 border-t border-surface-200 dark:border-surface-700">
          {expense.status === 'PENDING' && (
            <>
              <button
                disabled={updating}
                onClick={onApprove}
                className="px-3 py-1.5 rounded text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {lang === 'fr' ? 'Approuver' : 'Approve'}
              </button>
              <button
                disabled={updating}
                onClick={onReject}
                className="px-3 py-1.5 rounded text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {lang === 'fr' ? 'Refuser' : 'Reject'}
              </button>
            </>
          )}
          <button
            onClick={onArchive}
            className="px-3 py-1.5 rounded text-sm font-semibold bg-surface-200 hover:bg-surface-300 text-surface-700 dark:bg-surface-700 dark:hover:bg-surface-600 dark:text-surface-200"
          >
            {lang === 'fr' ? 'Archiver' : 'Archive'}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            {lang === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm font-semibold border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRepresentantsPage;
