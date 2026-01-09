import * as React from 'react';
import { MaterialResponse, MaterialRequest } from '../types/api';
import { getMaterials, createMaterial, updateMaterial, setMaterialBought, deleteMaterial } from '../lib/api';
import { useLang } from '../context/LangContext';

interface MaterialsDrawerProps {
  isOpen: boolean;
  workOrderId: number;
  workOrderTitle?: string;
  onClose: () => void;
  onMaterialsChanged?: (materials: MaterialResponse[]) => void;
}

export function MaterialsDrawer({ isOpen, workOrderId, workOrderTitle, onClose, onMaterialsChanged }: MaterialsDrawerProps) {
  const { t } = useLang();
  const [materials, setMaterials] = React.useState<MaterialResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [addName, setAddName] = React.useState('');
  const [addQty, setAddQty] = React.useState<string>('');
  const [addError, setAddError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const [editingQty, setEditingQty] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getMaterials(workOrderId)
        .then(mats => {
          setMaterials(mats);
          setError(null);
        })
        .catch(() => setError(t.failedToLoadMaterials))
        .finally(() => setLoading(false));
    }
  }, [isOpen, workOrderId]);

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
      const newMat = await createMaterial(workOrderId, { name: addName.trim(), quantity: qty });
      setMaterials(m => [...m, newMat]);
      setAddName('');
      setAddQty('');
    } catch {
      setAddError(t.failedToAdd);
    }
  };

  const handleEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      const qty = editingQty ? parseInt(editingQty, 10) : undefined;
      const updated = await updateMaterial(workOrderId, id, { name: editingName.trim(), quantity: qty });
      setMaterials(m => m.map(mat => mat.id === id ? updated : mat));
      setEditingId(null);
    } catch {
      setError(t.failedToUpdate);
    }
  };

  const handleToggleBought = async (id: number, bought: boolean) => {
    try {
      const updated = await setMaterialBought(workOrderId, id, bought);
      setMaterials(m => m.map(mat => mat.id === id ? updated : mat));
    } catch {
      setError(t.failedToUpdate);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMaterial(workOrderId, id);
      setMaterials(m => m.filter(mat => mat.id !== id));
    } catch {
      setError(t.failedToDelete);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">{t.materials} — {workOrderTitle || workOrderId}</h2>
        <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-red-500 text-2xl font-bold">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? <div>{t.loading}</div> : error ? <div className="text-red-500">{error}</div> : (
          <>
            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
              <input
                type="text"
                className="border rounded px-2 py-1 flex-1"
                placeholder={t.addMaterialPlaceholder}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                aria-label={t.addMaterialPlaceholder}
              />
              <input
                type="number"
                className="border rounded px-2 py-1 w-20"
                placeholder={t.quantity}
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                aria-label={t.quantity}
                min={0}
              />
              <button type="submit" className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">{t.add}</button>
            </form>
            {addError && <div className="text-red-500 mb-2">{addError}</div>}
            <ul className="divide-y">
              {materials.map(mat => (
                <li key={mat.id} className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    checked={mat.bought}
                    onChange={e => handleToggleBought(mat.id, e.target.checked)}
                    className="accent-indigo-500"
                    aria-label={t.bought}
                  />
                  {editingId === mat.id ? (
                    <>
                      <input
                        type="text"
                        className="border rounded px-2 py-1 flex-1"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        aria-label={t.edit}
                        autoFocus
                      />
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-16"
                        value={editingQty}
                        onChange={e => setEditingQty(e.target.value)}
                        aria-label={t.edit}
                        min={0}
                      />
                      <button className="text-green-600 font-bold px-2" onClick={() => handleEdit(mat.id)} type="button">✔</button>
                      <button className="text-gray-400 px-2" onClick={() => setEditingId(null)} type="button">✕</button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 truncate ${mat.bought ? 'line-through text-gray-400' : ''}`}>{mat.name}</span>
                      <span className="w-10 text-center text-gray-600">{mat.quantity ?? ''}</span>
                      <button className="text-blue-500 px-1" onClick={() => { setEditingId(mat.id); setEditingName(mat.name); setEditingQty(mat.quantity?.toString() || ''); }} aria-label={t.edit} type="button">✎</button>
                      <button className="text-red-500 px-1" onClick={() => handleDelete(mat.id)} aria-label={t.deleteMaterial} type="button">🗑</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-gray-700">
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
