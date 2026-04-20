import { useContext, useEffect, useState, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import {
  getInventoryProducts,
  getInventoryCategories,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  createInventoryCategory,
  deleteInventoryCategory,
} from '../lib/api';
import type { InventoryProductResponse, InventoryCategoryResponse, InventoryProductRequest } from '../types/api';

export default function InventoryProductsPage() {
  const { t } = useLang();
  const { colorScheme } = useContext(ColorSchemeContext);
  const isDark = colorScheme === 'dark';

  const [products, setProducts] = useState<InventoryProductResponse[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryProductResponse | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [qrProduct, setQrProduct] = useState<InventoryProductResponse | null>(null);
  const [showPrintLabels, setShowPrintLabels] = useState(false);

  // Form fields
  const [form, setForm] = useState<InventoryProductRequest>({
    sku: '', name: '', unit: 'unit', expectedQty: 0, locationZone: '', barcode: '', notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        getInventoryProducts(search || undefined),
        getInventoryCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      setError(t.invLoadError || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateInventoryProduct(editing.id, form);
      } else {
        await createInventoryProduct(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ sku: '', name: '', unit: 'unit', expectedQty: 0, locationZone: '', barcode: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save product.');
    }
  };

  const handleEdit = (p: InventoryProductResponse) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, unit: p.unit, expectedQty: p.expectedQty,
      categoryId: p.categoryId || undefined, locationZone: p.locationZone || '',
      barcode: p.barcode || '', notes: p.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.invDeleteConfirm || 'Archive this product?')) return;
    await deleteInventoryProduct(id);
    await loadData();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createInventoryCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowCategoryForm(false);
    await loadData();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t.invDeleteCategoryConfirm || 'Delete this category?')) return;
    await deleteInventoryCategory(id);
    await loadData();
  };

  const filtered = filterCategory
    ? products.filter(p => String(p.categoryId) === filterCategory)
    : products;

  const card = `rounded-xl border ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const input = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-surface-800 border-surface-600 text-white placeholder-surface-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const btnPrimary = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`;
  const btnSecondary = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-surface-700 hover:bg-surface-600 text-surface-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`;

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[50vh] ${isDark ? 'text-surface-300' : ''}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Print labels view
  if (showPrintLabels) {
    return (
      <div className="p-4">
        <div className="flex gap-2 mb-6 print:hidden">
          <button onClick={() => window.print()} className={btnPrimary}>
            🖴 {t.invPrintLabels || 'Print'}
          </button>
          <button onClick={() => setShowPrintLabels(false)} className={btnSecondary}>
            ← {t.back || 'Back'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {filtered.map(p => (
            <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, textAlign: 'center', breakInside: 'avoid' }}>
              <QRCode value={p.sku} size={110} />
              <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11 }}>{p.sku}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>{p.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.invProductsTitle || 'Product Catalog'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
            {t.invProductsSubtitle || 'Manage all warehouse products for inventory counts.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowCategoryForm(!showCategoryForm)} className={btnSecondary}>
            {t.invManageCategories || 'Categories'}
          </button>
          <button onClick={() => setShowPrintLabels(true)} className={btnSecondary}>
            🖴 {t.invPrintLabels || 'Print Labels'}
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ sku: '', name: '', unit: 'unit', expectedQty: 0, locationZone: '', barcode: '', notes: '' }); }} className={btnPrimary}>
            + {t.invAddProduct || 'Add Product'}
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Category manager */}
      {showCategoryForm && (
        <div className={`${card} p-4 space-y-3`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.invCategories || 'Categories'}</h3>
          <div className="flex gap-2">
            <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder={t.invCategoryName || 'Category name'} className={input} />
            <button onClick={handleCreateCategory} className={btnPrimary}>{t.add || 'Add'}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-surface-700 text-surface-200' : 'bg-slate-100 text-slate-700'}`}>
                {c.name}
                <button onClick={() => handleDeleteCategory(c.id)} className="hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.invSearchProducts || 'Search by name, SKU, or barcode...'}
          className={`flex-1 ${input}`}
        />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`sm:w-48 ${input}`}>
          <option value="">{t.invAllCategories || 'All Categories'}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={`${card} p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {editing ? (t.invEditProduct || 'Edit Product') : (t.invAddProduct || 'Add Product')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>SKU *</label>
                  <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required className={input} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invBarcode || 'Barcode'}</label>
                  <input value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} className={input} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invProductName || 'Product Name'} *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invCategory || 'Category'}</label>
                  <select value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })} className={input}>
                    <option value="">—</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invUnit || 'Unit'}</label>
                  <select value={form.unit || 'unit'} onChange={e => setForm({ ...form, unit: e.target.value })} className={input}>
                    <option value="unit">{t.invUnitUnit || 'Unit'}</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="box">{t.invUnitBox || 'Box'}</option>
                    <option value="pallet">{t.invUnitPallet || 'Pallet'}</option>
                    <option value="bag">{t.invUnitBag || 'Bag'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invExpectedQty || 'Expected Qty'}</label>
                  <input type="number" step="0.01" min="0" value={form.expectedQty || 0} onChange={e => setForm({ ...form, expectedQty: Number(e.target.value) })} className={input} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invZone || 'Zone / Aisle'}</label>
                  <input value={form.locationZone || ''} onChange={e => setForm({ ...form, locationZone: e.target.value })} placeholder="A1, B2..." className={input} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{t.invNotes || 'Notes'}</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={input} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className={btnSecondary}>{t.cancel || 'Cancel'}</button>
                <button type="submit" className={btnPrimary}>{editing ? (t.saveChanges || 'Save Changes') : (t.create || 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-surface-700 text-surface-400' : 'border-b border-slate-200 text-slate-500'}>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">{t.invProductName || 'Product'}</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">{t.invCategory || 'Category'}</th>
                <th className="text-right px-4 py-3 font-medium">{t.invExpectedQty || 'Expected'}</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t.invUnit || 'Unit'}</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t.invZone || 'Zone'}</th>
                <th className="text-right px-4 py-3 font-medium">{t.invActions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className={`px-4 py-8 text-center ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{t.invNoProducts || 'No products found.'}</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`border-t ${isDark ? 'border-surface-800 hover:bg-surface-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-surface-300' : 'text-slate-600'}`}>{p.sku}</td>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                    {p.barcode && <span className={`ml-2 text-xs ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>({p.barcode})</span>}
                  </td>
                  <td className={`px-4 py-3 hidden sm:table-cell ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                    {p.categoryName && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-surface-700 text-surface-300' : 'bg-slate-100 text-slate-600'}`}>{p.categoryName}</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.expectedQty}</td>
                  <td className={`px-4 py-3 hidden md:table-cell ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{p.unit}</td>
                  <td className={`px-4 py-3 hidden md:table-cell ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{p.locationZone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setQrProduct(p)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-emerald-400 hover:bg-surface-800' : 'text-emerald-600 hover:bg-emerald-50'}`}>QR</button>
                    <button onClick={() => handleEdit(p)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-brand-400 hover:bg-surface-800' : 'text-brand-600 hover:bg-brand-50'}`}>{t.edit || 'Edit'}</button>
                    <button onClick={() => handleDelete(p.id)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-red-400 hover:bg-surface-800' : 'text-red-600 hover:bg-red-50'}`}>{t.delete || 'Delete'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR label modal */}
      {qrProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setQrProduct(null)}>
          <div className={`${card} p-6 max-w-xs w-full mx-4 space-y-4`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.invQRLabel || 'QR Label'}</h3>
              <button onClick={() => setQrProduct(null)} className={`text-lg ${isDark ? 'text-surface-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>×</button>
            </div>
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <QRCode value={qrProduct.sku} size={180} />
            </div>
            <div className="text-center">
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{qrProduct.name}</p>
              <p className={`font-mono text-xs mt-1 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>{qrProduct.sku}</p>
              {qrProduct.locationZone && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>{qrProduct.locationZone}</p>
              )}
            </div>
            <button onClick={() => window.print()} className={`w-full ${btnPrimary}`}>
              🖴 {t.invPrintLabels || 'Print'}
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className={`text-xs text-center ${isDark ? 'text-surface-500' : 'text-slate-400'}`}>
        {filtered.length} {t.invProductsCount || 'products'} · {categories.length} {t.invCategoriesCount || 'categories'}
      </div>
    </div>
  );
}
