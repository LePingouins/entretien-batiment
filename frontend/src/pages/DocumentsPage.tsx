import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { getWorkOrdersWithInvoices, getUrgentWorkOrdersWithInvoices } from '../lib/api';
import type { WorkOrderResponse, UrgentWorkOrderResponse } from '../types/api';

type ColorScheme = 'default' | 'dark' | 'performance' | string;

interface DocumentCard {
  id: number;
  title: string;
  type: 'REGULAR' | 'URGENT';
  status: string;
  invoiceFilename: string;
  invoiceDownloadUrl: string;
  location?: string;
  updatedAt?: string;
}

function DocumentsPage() {
  const { t } = useLang();
  const outlet = useOutletContext<{ colorScheme: ColorScheme }>();
  const colorScheme: ColorScheme = outlet?.colorScheme || 'default';
  const isDark = colorScheme === 'dark';

  const [filter, setFilter] = React.useState<'ALL' | 'REGULAR' | 'URGENT'>('ALL');
  const [q, setQ] = React.useState('');

  const { data: regularWOs, isLoading: loadingRegular } = useQuery({
    queryKey: ['documentsRegularWOs'],
    queryFn: getWorkOrdersWithInvoices,
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: urgentWOs, isLoading: loadingUrgent } = useQuery({
    queryKey: ['documentsUrgentWOs'],
    queryFn: getUrgentWorkOrdersWithInvoices,
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const isLoading = loadingRegular || loadingUrgent;

  const documents: DocumentCard[] = React.useMemo(() => {
    const result: DocumentCard[] = [];
    if (regularWOs) {
      for (const wo of regularWOs) {
        if (wo.invoiceFilename) {
          result.push({
            id: wo.id,
            title: wo.title,
            type: 'REGULAR',
            status: wo.status,
            invoiceFilename: wo.invoiceFilename,
            invoiceDownloadUrl: wo.invoiceDownloadUrl || `/api/files/workorders/${wo.invoiceFilename}`,
            location: wo.location,
            updatedAt: wo.updatedAt,
          });
        }
      }
    }
    if (urgentWOs) {
      for (const wo of urgentWOs) {
        if (wo.invoiceFilename) {
          result.push({
            id: wo.id,
            title: wo.title,
            type: 'URGENT',
            status: wo.status,
            invoiceFilename: wo.invoiceFilename,
            invoiceDownloadUrl: wo.invoiceDownloadUrl || `/api/files/workorders/${wo.invoiceFilename}`,
            location: wo.location,
            updatedAt: wo.updatedAt,
          });
        }
      }
    }
    // Sort by most recent first
    return result.sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return db - da;
    });
  }, [regularWOs, urgentWOs]);

  const filtered = React.useMemo(() => {
    return documents.filter((doc) => {
      if (filter !== 'ALL' && doc.type !== filter) return false;
      if (q) {
        const lower = q.toLowerCase();
        if (!doc.title.toLowerCase().includes(lower) && !doc.invoiceFilename.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [documents, filter, q]);

  const isPdf = (filename: string) => filename.toLowerCase().endsWith('.pdf');
  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);

  return (
    <div className={`p-4 sm:p-6 lg:p-8 pb-10 sm:pb-12 ${isDark ? 'text-surface-100' : 'text-gray-900'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-surface-700' : 'bg-green-50'}`}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={isDark ? 'text-green-400' : 'text-green-600'}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.documentsPageTitle || 'Invoice Documents'}</h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-gray-500'}`}>
            {t.documentsPageSubtitle || 'All invoices and documents attached to work orders'}
          </p>
          <div className={`mt-2 text-sm font-medium ${isDark ? 'text-surface-300' : 'text-gray-600'}`}>
            {documents.length} {t.documentsPage || 'Documents'}{documents.length !== 1 ? '' : ''}
          </div>
        </div>

        {/* Filters */}
        <div className={`flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl border ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <input
            type="text"
            placeholder={`🔍 ${t.search || 'Search'}...`}
            value={q}
            onChange={e => setQ(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${isDark ? 'bg-surface-700 border-surface-600 text-surface-100 focus:ring-brand-500' : 'border-gray-300 focus:ring-brand-400'}`}
          />
          <div className="flex gap-2">
            {(['ALL', 'REGULAR', 'URGENT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  filter === f
                    ? isDark
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-brand-600 text-white border-brand-600'
                    : isDark
                      ? 'bg-surface-700 text-surface-300 border-surface-600 hover:border-brand-500'
                      : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                {f === 'ALL' ? t.allMaterials || 'All' : f === 'REGULAR' ? t.regularWO || 'Regular WO' : t.urgentWO || 'Urgent WO'}
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
        ) : filtered.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border-2 border-dashed ${isDark ? 'border-surface-700 text-surface-400' : 'border-gray-200 text-gray-400'}`}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto mb-4 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6" />
            </svg>
            <p className="font-semibold">{t.noDocuments || 'No documents found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div
                key={`${doc.type}-${doc.id}`}
                className={`rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-200 shadow-sm'}`}
              >
                {/* Preview Area */}
                <div className={`relative flex items-center justify-center h-36 ${isDark ? 'bg-surface-900' : 'bg-gray-50'}`}>
                  {isImage(doc.invoiceFilename) ? (
                    <img
                      src={doc.invoiceDownloadUrl}
                      alt={doc.invoiceFilename}
                      className="h-full w-full object-cover"
                    />
                  ) : isPdf(doc.invoiceFilename) ? (
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-red-400">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-bold uppercase text-red-400">PDF</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-bold uppercase">{doc.invoiceFilename.split('.').pop()}</span>
                    </div>
                  )}
                  {/* Type badge */}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${doc.type === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {doc.type === 'URGENT' ? t.urgentWO || 'Urgent WO' : t.regularWO || 'Regular WO'}
                  </span>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm leading-snug mb-1">
                      #{doc.id} — {doc.title}
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-surface-400' : 'text-gray-400'}`}>
                      {doc.invoiceFilename}
                    </p>
                    {doc.location && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-surface-500' : 'text-gray-400'}`}>📍 {doc.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={doc.invoiceDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'border-surface-600 hover:bg-surface-700 text-surface-200' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {t.viewInvoice || 'View'}
                    </a>
                    <a
                      href={doc.invoiceDownloadUrl}
                      download={doc.invoiceFilename}
                      className={`flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      {t.download || 'Download'}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsPage;
