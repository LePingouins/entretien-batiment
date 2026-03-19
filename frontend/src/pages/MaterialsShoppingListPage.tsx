import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { getShoppingList, setMaterialBought, setUrgentMaterialBought } from '../lib/api';
import type { ShoppingListItem } from '../types/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type ColorScheme = 'default' | 'dark' | 'performance' | string;

function MaterialsShoppingListPage() {
  const { t } = useLang();
  const outlet = useOutletContext<{ colorScheme: ColorScheme }>();
  const colorScheme: ColorScheme = outlet?.colorScheme || 'default';
  const isDark = colorScheme === 'dark';

  const [filter, setFilter] = React.useState<'ALL' | 'TOBUY' | 'BOUGHT'>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<'ALL' | 'REGULAR' | 'URGENT'>('ALL');
  const [q, setQ] = React.useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shoppingList'],
    queryFn: getShoppingList,
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const items: ShoppingListItem[] = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (filter === 'TOBUY' && item.bought) return false;
      if (filter === 'BOUGHT' && !item.bought) return false;
      if (typeFilter === 'REGULAR' && item.workOrderType !== 'REGULAR') return false;
      if (typeFilter === 'URGENT' && item.workOrderType !== 'URGENT') return false;
      if (q) {
        const lower = q.toLowerCase();
        if (!item.name.toLowerCase().includes(lower) && !item.workOrderTitle.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [data, filter, typeFilter, q]);

  // Mutation for marking as bought/unbought
  const markBoughtMutation = useMutation({
    mutationFn: async (params: { item: ShoppingListItem; bought: boolean }) => {
      const { item, bought } = params;
      if (item.workOrderType === 'REGULAR') {
        return setMaterialBought(item.workOrderId, item.materialId, bought);
      } else {
        return setUrgentMaterialBought(item.workOrderId, item.materialId, bought);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
    },
  });

  // Group by work order
  const grouped = React.useMemo(() => {
    const map = new Map<string, { id: number; title: string; type: 'REGULAR' | 'URGENT'; status: string; items: ShoppingListItem[] }>();
    for (const item of items) {
      const key = `${item.workOrderType}-${item.workOrderId}`;
      if (!map.has(key)) {
        map.set(key, { id: item.workOrderId, title: item.workOrderTitle, type: item.workOrderType, status: item.workOrderStatus, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => {
      // Urgent first, then by id
      if (a.type !== b.type) return a.type === 'URGENT' ? -1 : 1;
      return b.id - a.id;
    });
  }, [items]);

  const totalCount = data?.totalCount ?? 0;
  const boughtCount = data?.boughtCount ?? 0;
  const unboughtCount = data?.unboughtCount ?? 0;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 pb-10 sm:pb-12 ${isDark ? 'text-surface-100' : 'text-gray-900'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-surface-700' : 'bg-blue-50'}`}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.shoppingListTitle || 'Materials Shopping List'}</h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-gray-500'}`}>
            {t.shoppingListSubtitle || 'All materials needed across all work orders'}
          </p>
        </div>

        {/* Summary bar */}
        {!isLoading && data && (
          <div className={`flex gap-4 mb-6 flex-wrap`}>
            <div className={`flex-1 min-w-[120px] p-4 rounded-xl border text-center ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-surface-400' : 'text-gray-500'}`}>{t.totalItems || 'Total Items'}</div>
            </div>
            <div className={`flex-1 min-w-[120px] p-4 rounded-xl border text-center ${isDark ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
              <div className="text-2xl font-bold text-orange-500">{unboughtCount}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{t.toBuy || 'To Buy'}</div>
            </div>
            <div className={`flex-1 min-w-[120px] p-4 rounded-xl border text-center ${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
              <div className="text-2xl font-bold text-green-500">{boughtCount}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t.bought || 'Bought'}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl border ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <input
            type="text"
            placeholder={`🔍 ${t.search || 'Search'}...`}
            value={q}
            onChange={e => setQ(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${isDark ? 'bg-surface-700 border-surface-600 text-surface-100 focus:ring-brand-500' : 'border-gray-300 focus:ring-brand-400'}`}
          />
          <div className="flex gap-1 flex-wrap">
            {(['ALL', 'TOBUY', 'BOUGHT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  filter === f
                    ? isDark ? 'bg-brand-600 text-white border-brand-600' : 'bg-brand-600 text-white border-brand-600'
                    : isDark ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                {f === 'ALL' ? t.allMaterials || 'All' : f === 'TOBUY' ? t.unboughtOnly || 'To Buy' : t.boughtOnly || 'Bought'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['ALL', 'REGULAR', 'URGENT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  typeFilter === f
                    ? isDark ? 'bg-surface-600 text-white border-surface-500' : 'bg-gray-700 text-white border-gray-700'
                    : isDark ? 'bg-surface-700 text-surface-300 border-surface-600' : 'bg-gray-50 text-gray-600 border-gray-300'
                }`}
              >
                {f === 'ALL' ? t.allWO || 'All WO' : f === 'REGULAR' ? t.regularWO || 'Regular' : t.urgentWO || 'Urgent'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={`text-center py-12 ${isDark ? 'text-surface-400' : 'text-gray-400'}`}>
            <svg className="animate-spin h-8 w-8 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.loading || 'Loading...'}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{t.errorLoading || 'Error loading data'}</div>
        ) : grouped.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border-2 border-dashed ${isDark ? 'border-surface-700 text-surface-400' : 'border-gray-200 text-gray-400'}`}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto mb-4 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
            </svg>
            <p className="font-semibold">{t.shoppingListEmpty || 'No materials found'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group) => (
              <div
                key={`${group.type}-${group.id}`}
                className={`rounded-xl border overflow-hidden ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}
              >
                {/* Group header */}
                <div className={`px-5 py-3 flex items-center gap-3 border-b ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${group.type === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {group.type === 'URGENT' ? t.urgentWO || 'Urgent WO' : t.regularWO || 'Regular WO'}
                  </span>
                  <span className="font-semibold text-sm">#{group.id} — {group.title}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-gray-100 text-gray-500'}`}>
                    {group.items.length} {t.allMaterials || 'items'}
                  </span>
                </div>
                {/* Materials list */}
                <div className="divide-y divide-dashed">
                  {group.items.map((item) => (
                    <div
                      key={item.materialId}
                      className={`px-5 py-3 flex items-start gap-3 transition-colors ${item.bought ? (isDark ? 'opacity-50' : 'opacity-60') : ''}`}
                    >
                      {/* Bought indicator */}
                      <div
                        className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${item.bought ? (isDark ? 'border-green-600 bg-green-700' : 'border-green-500 bg-green-100') : (isDark ? 'border-surface-500' : 'border-gray-300')} ${markBoughtMutation.status === 'pending' ? 'opacity-60 pointer-events-none' : ''}`}
                        title={item.bought ? t.bought || 'Bought' : t.toBuy || 'To Buy'}
                        onClick={() => markBoughtMutation.mutate({ item, bought: !item.bought })}
                        role="checkbox"
                        aria-checked={item.bought}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); markBoughtMutation.mutate({ item, bought: !item.bought }); } }}
                      >
                        {item.bought && (
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-green-500">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${item.bought ? 'line-through' : ''}`}>{item.name}</span>
                          {item.quantity != null && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-gray-100 text-gray-500'}`}>
                              ×{item.quantity}
                            </span>
                          )}
                        </div>
                        {item.supplier && (
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-400' : 'text-gray-500'}`}>
                            🏪 {item.supplier}
                          </p>
                        )}
                        {item.description && (
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>{item.description}</p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs mt-0.5 underline block truncate ${isDark ? 'text-brand-400' : 'text-brand-600'}`}
                          >
                            🔗 {item.url}
                          </a>
                        )}
                      </div>
                      {/* Bought badge */}
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${item.bought ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700')}`}>
                        {item.bought ? t.bought || 'Bought' : t.toBuy || 'To Buy'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MaterialsShoppingListPage;
