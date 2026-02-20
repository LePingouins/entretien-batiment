import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialResponse, MaterialRequest } from '../types/api';
import {
  getMaterials, createMaterial, updateMaterial, setMaterialBought, deleteMaterial,
  getUrgentMaterials, createUrgentMaterial, updateUrgentMaterial, setUrgentMaterialBought, deleteUrgentMaterial
} from '../lib/api';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from './AdminLayout';


interface MaterialsDrawerProps {
  isOpen: boolean;
  workOrderId: number;
  workOrderTitle?: string;
  onClose: () => void;
  onMaterialsChanged?: (materials: MaterialResponse[]) => void;
  urgent?: boolean;
}

export function MaterialsDrawer({ isOpen, workOrderId, workOrderTitle, onClose, onMaterialsChanged, urgent = false }: MaterialsDrawerProps) {
  const queryClient = useQueryClient();
  const { t } = useLang();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const [materials, setMaterials] = React.useState<MaterialResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [addName, setAddName] = React.useState('');
  const [addQty, setAddQty] = React.useState<string>('');
  const [addUrl, setAddUrl] = React.useState('');
  const [addDescription, setAddDescription] = React.useState('');
  const [addSupplier, setAddSupplier] = React.useState('');
  const [addError, setAddError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const [editingQty, setEditingQty] = React.useState<string>('');
  const [editingUrl, setEditingUrl] = React.useState('');
  const [editingDescription, setEditingDescription] = React.useState('');
  const [editingSupplier, setEditingSupplier] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const fetch = urgent ? getUrgentMaterials : getMaterials;
      fetch(workOrderId)
        .then(mats => {
          setMaterials(mats);
          setError(null);
        })
        .catch(() => setError(t.failedToLoadMaterials))
        .finally(() => setLoading(false));
    }
  }, [isOpen, workOrderId, urgent]);

  React.useEffect(() => {
    if (onMaterialsChanged) onMaterialsChanged(materials);
  }, [materials]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setAddError(t.nameRequired);
      return;
    }
    setAddError(null);
    try {
      const qty = addQty ? parseInt(addQty, 10) : undefined;
      const fn = urgent ? createUrgentMaterial : createMaterial;
      const newMat = await fn(workOrderId, {
        name: addName.trim(),
        quantity: qty,
        url: addUrl.trim() || undefined,
        description: addDescription.trim() || undefined,
        supplier: addSupplier.trim() || undefined
      });
      setMaterials(m => [...m, newMat]);
      if (urgent) queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
      setAddName('');
      setAddQty('');
      setAddUrl('');
      setAddDescription('');
      setAddSupplier('');
    } catch {
      setAddError(t.failedToAdd);
    }
  };

  const handleEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      const qty = editingQty ? parseInt(editingQty, 10) : undefined;
      const fn = urgent ? updateUrgentMaterial : updateMaterial;
      const updated = await fn(workOrderId, id, {
        name: editingName.trim(),
        quantity: qty,
        url: editingUrl.trim() || undefined,
        description: editingDescription.trim() || undefined,
        supplier: editingSupplier.trim() || undefined
      });
      setMaterials(m => m.map(mat => mat.id === id ? updated : mat));
      if (urgent) queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
      setEditingId(null);
    } catch {
      setError(t.failedToUpdate);
    }
  };

  const handleToggleBought = async (id: number, bought: boolean) => {
    try {
      const fn = urgent ? setUrgentMaterialBought : setMaterialBought;
      const updated = await fn(workOrderId, id, bought);
      setMaterials(m => m.map(mat => mat.id === id ? updated : mat));
      if (urgent) queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    } catch {
      setError(t.failedToUpdate);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const fn = urgent ? deleteUrgentMaterial : deleteMaterial;
      await fn(workOrderId, id);
      setMaterials(m => m.filter(mat => mat.id !== id));
      if (urgent) queryClient.invalidateQueries({ queryKey: ['urgentWorkOrders'] });
    } catch {
      setError(t.failedToDelete);
    }
  };

  // Dark mode styles
  const drawerClass = colorScheme === 'dark'
    ? 'fixed top-0 right-0 h-full w-full max-w-md bg-surface-800 shadow-card z-50 transition-transform duration-300 flex flex-col border-l border-surface-700'
    : 'fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-card z-50 transition-transform duration-300 flex flex-col';

  const headerClass = colorScheme === 'dark'
    ? 'flex items-center justify-between p-4 border-b border-surface-700'
    : 'flex items-center justify-between p-4 border-b';

  const inputClass = colorScheme === 'dark'
    ? 'border border-surface-700 bg-surface-700 text-surface-100 rounded px-2 py-1 focus:border-brand-500 focus:outline-none'
    : 'border rounded px-2 py-1';

  const requiredInputClass = colorScheme === 'dark'
    ? 'border-l-4 border-l-indigo-500 border border-surface-700 bg-surface-700 text-surface-100 rounded px-2 py-1 focus:border-brand-500 focus:outline-none'
    : 'border-l-4 border-l-indigo-500 border border-gray-300 rounded px-2 py-1 focus:border-indigo-400 focus:outline-none';

  const optionalInputClass = colorScheme === 'dark'
    ? 'border border-surface-700 bg-surface-800 text-surface-400 rounded px-2 py-1 focus:border-brand-500 focus:outline-none placeholder:text-surface-500'
    : 'border border-gray-200 bg-gray-50 text-gray-600 rounded px-2 py-1 focus:border-gray-400 focus:outline-none';

  const addButtonClass = colorScheme === 'dark'
    ? 'bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700'
    : 'bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600';

  return (
    <div
      className={`${drawerClass} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className={headerClass}>
        <h2 className={`text-lg font-bold ${colorScheme === 'dark' ? 'text-surface-100' : ''}`}>{t.materials} — {workOrderTitle || workOrderId}</h2>
        <button onClick={onClose} aria-label="Close" className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-surface-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? <div className={colorScheme === 'dark' ? 'text-surface-400' : ''}>{t.loading}</div> : error ? <div className="text-red-500">{error}</div> : (
          <>
            <form onSubmit={handleAdd} className="mb-4 space-y-3">
              {/* Required fields */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${requiredInputClass} flex-1`}
                  placeholder={`${t.addMaterialPlaceholder} *`}
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  aria-label={t.addMaterialPlaceholder}
                  required
                />
                <input
                  type="number"
                  className={`${requiredInputClass} w-20`}
                  placeholder={`${t.quantity} *`}
                  value={addQty}
                  onChange={e => setAddQty(e.target.value)}
                  aria-label={t.quantity}
                  min={0}
                  required
                />
              </div>
              {/* Optional fields divider */}
              <div className={`text-xs ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-400'} flex items-center gap-2`}>
                <span className={`flex-1 border-t ${colorScheme === 'dark' ? 'border-surface-700' : 'border-gray-200'}`}></span>
                <span>{t.optional}</span>
                <span className={`flex-1 border-t ${colorScheme === 'dark' ? 'border-surface-700' : 'border-gray-200'}`}></span>
              </div>
              {/* Optional fields */}
              <div className="flex gap-2">
                <input
                  type="url"
                  className={`${optionalInputClass} flex-1`}
                  placeholder={t.materialUrl}
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                  aria-label={t.materialUrl}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${optionalInputClass} flex-1`}
                  placeholder={t.materialDescription}
                  value={addDescription}
                  onChange={e => setAddDescription(e.target.value)}
                  aria-label={t.materialDescription}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${optionalInputClass} flex-1`}
                  placeholder={t.supplier}
                  value={addSupplier}
                  onChange={e => setAddSupplier(e.target.value)}
                  aria-label={t.supplier}
                />
                <button type="submit" className={addButtonClass}>{t.add}</button>
              </div>
            </form>
            {addError && <div className="text-red-500 mb-2">{addError}</div>}
            <ul className={`divide-y ${colorScheme === 'dark' ? 'divide-surface-700' : ''}`}>
              {materials.map(mat => (
                <li key={mat.id} className="py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mat.bought}
                      onChange={e => handleToggleBought(mat.id, e.target.checked)}
                      className={colorScheme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-500'}
                      aria-label={t.bought}
                    />
                    {editingId === mat.id ? (
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className={`${requiredInputClass} flex-1`}
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            aria-label={t.edit}
                            autoFocus
                            required
                          />
                          <input
                            type="number"
                            className={`${requiredInputClass} w-16`}
                            value={editingQty}
                            onChange={e => setEditingQty(e.target.value)}
                            aria-label={t.quantity}
                            min={0}
                            required
                          />
                        </div>
                        <input
                          type="url"
                          className={`${optionalInputClass} w-full`}
                          placeholder={t.materialUrl}
                          value={editingUrl}
                          onChange={e => setEditingUrl(e.target.value)}
                          aria-label={t.materialUrl}
                        />
                        <input
                          type="text"
                          className={`${optionalInputClass} w-full`}
                          placeholder={t.materialDescription}
                          value={editingDescription}
                          onChange={e => setEditingDescription(e.target.value)}
                          aria-label={t.materialDescription}
                        />
                        <input
                          type="text"
                          className={`${optionalInputClass} w-full`}
                          placeholder={t.supplier}
                          value={editingSupplier}
                          onChange={e => setEditingSupplier(e.target.value)}
                          aria-label={t.supplier}
                        />
                        <div className="flex gap-2 justify-end">
                          <button className="text-green-500 font-bold px-2" onClick={() => handleEdit(mat.id)} type="button">✔</button>
                          <button className={`px-2 ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-400'}`} onClick={() => setEditingId(null)} type="button">✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className={`block truncate ${mat.bought ? 'line-through' : ''} ${colorScheme === 'dark' ? (mat.bought ? 'text-surface-500' : 'text-surface-100') : (mat.bought ? 'text-gray-400' : '')}`}>{mat.name}</span>
                          {mat.description && (
                            <span className={`block text-xs truncate ${colorScheme === 'dark' ? 'text-surface-500' : 'text-gray-500'}`}>{mat.description}</span>
                          )}
                          {mat.url && (
                            <a href={mat.url} target="_blank" rel="noopener noreferrer" className={`block text-xs truncate ${colorScheme === 'dark' ? 'text-brand-400' : 'text-blue-500'} hover:underline`}>{mat.url}</a>
                          )}
                          {mat.supplier && (
                            <span className={`block text-xs truncate ${colorScheme === 'dark' ? 'text-violet-400' : 'text-purple-600'}`}>{t.supplier}: {mat.supplier}</span>
                          )}
                        </div>
                        <span className={`w-10 text-center ${colorScheme === 'dark' ? 'text-surface-400' : 'text-gray-600'}`}>{mat.quantity ?? ''}</span>
                        <button className={`px-1 ${colorScheme === 'dark' ? 'text-brand-400' : 'text-blue-500'}`} onClick={() => { setEditingId(mat.id); setEditingName(mat.name); setEditingQty(mat.quantity?.toString() || ''); setEditingUrl(mat.url || ''); setEditingDescription(mat.description || ''); setEditingSupplier(mat.supplier || ''); }} aria-label={t.edit} type="button">✎</button>
                        <button className="text-red-500 px-1" onClick={() => handleDelete(mat.id)} aria-label={t.deleteMaterial} type="button">🗑</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className={`mt-4 text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-gray-700'}`}>
              {t.boughtCount
                .replace('{bought}', materials.filter(m => m.bought).length.toString())
                .replace('{total}', materials.length.toString())}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
