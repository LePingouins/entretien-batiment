import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './printable.css';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getWorkOrderById } from '../lib/api';
import api from '../lib/api';
import { ColorSchemeContext } from '../components/AdminLayout';
import { useLang } from '../context/LangContext';
import { WorkOrderStatus, WorkOrderPriority } from '../types/api';

const WorkOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return t.statusOpen;
      case 'ASSIGNED': return t.statusAssigned;
      case 'IN_PROGRESS': return t.statusInProgress;
      case 'COMPLETED': return t.statusCompleted;
      case 'CANCELLED': return t.statusCancelled;
      default: return status.replace(/_/g, " ");
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return t.priorityLow;
      case 'MEDIUM': return t.priorityMedium;
      case 'HIGH': return t.priorityHigh;
      case 'URGENT': return t.priorityUrgent;
      default: return priority;
    }
  };

  // Fetch work order
  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workOrder', id],
    queryFn: () => getWorkOrderById(Number(id)),
    enabled: !!id,
  });

  // Fetch mileage entries linked to this work order
  const { data: mileageEntries, isLoading: mileageLoading } = useQuery({
    queryKey: ['mileageEntries', id],
    queryFn: async () => {
      const res = await api.get('/api/mileage', { params: { workOrderId: id } });
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading || mileageLoading) return (
    <div className={`flex items-center justify-center py-20 ${colorScheme === 'dark' ? 'bg-surface-950 text-surface-100' : 'bg-surface-50 text-gray-900'}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error || !workOrder) return (
    <div className={`p-6 text-center py-20 flex items-center justify-center ${colorScheme === 'dark' ? 'bg-surface-950 text-red-400' : 'bg-surface-50 text-red-600'}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">{t.errorLoadingWorkOrder}</h2>
        <p>{error ? t.errorLoadingWorkOrder : t.workOrderNotFound}</p>
        <Link to="/admin/work-orders" className="mt-4 inline-block text-brand-500 hover:underline">
          &larr; {t.backToWorkOrders}
        </Link>
      </div>
    </div>
  );

  const isDark = colorScheme === 'dark';
  
  // Status Colors
  const getStatusColor = (status: WorkOrderStatus) => {
    switch (status) {
      case WorkOrderStatus.OPEN: return isDark ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25' : 'bg-teal-50 text-teal-700 ring-1 ring-teal-200';
      case WorkOrderStatus.ASSIGNED: return isDark ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case WorkOrderStatus.IN_PROGRESS: return isDark ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      case WorkOrderStatus.COMPLETED: return isDark ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case WorkOrderStatus.CANCELLED: return isDark ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25' : 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default: return isDark ? 'bg-surface-500/15 text-surface-300 ring-1 ring-surface-500/25' : 'bg-surface-50 text-surface-700 ring-1 ring-surface-200';
    }
  };

  // Priority Colors
  const getPriorityColor = (priority: WorkOrderPriority) => {
    switch (priority) {
      case WorkOrderPriority.LOW: return isDark ? 'text-green-400' : 'text-green-600';
      case WorkOrderPriority.MEDIUM: return isDark ? 'text-yellow-400' : 'text-yellow-600';
      case WorkOrderPriority.HIGH: return isDark ? 'text-orange-400' : 'text-orange-600';
      case WorkOrderPriority.URGENT: return isDark ? 'text-red-400' : 'text-red-600';
      default: return isDark ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const isImage = workOrder.attachmentContentType?.startsWith('image/');
  const attachmentUrl = workOrder.attachmentDownloadUrl || (workOrder.attachmentFilename ? `/api/files/workorders/${workOrder.attachmentFilename}` : undefined);
  return (
    <>
      {/* Printable layout styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-content, .printable-content * { visibility: visible !important; }
          .printable-content { left: 0; top: 0; width: 100vw; background: white; color: black; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="flex flex-col printable-content">
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-surface-950 text-surface-100' : 'bg-surface-50 text-gray-900'}`}> 
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Link 
                to="/admin/work-orders" 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${isDark ? 'text-brand-400 hover:bg-surface-800' : 'text-brand-600 hover:bg-white hover:shadow-sm'} no-print`} 
                data-html2canvas-ignore="true"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t.backToWorkOrders}
              </Link>
            </div>
            <div className={`rounded-xl shadow-card overflow-hidden border ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-gray-100'}`}>
              {/* ...existing code... */}
              {/* Linked Mileage Section */}
              {mileageEntries && mileageEntries.filter((entry: any) => entry.workOrderId === workOrder.id).length > 0 && (
                <div className="p-6 border-b border-dashed border-purple-200 bg-purple-50/50">
                  <h2 className="text-xl font-bold mb-2 text-purple-700">{t.linkedMileageEntry}</h2>
                  {mileageEntries.filter((entry: any) => entry.workOrderId === workOrder.id).map((entry: any) => (
                    <div key={entry.id} className="mb-2">
                      <div className="flex items-center flex-wrap gap-x-6 gap-y-1">
                        <span className="flex items-center gap-x-1"><span className="font-semibold">Date:</span><span>{entry.date}</span></span>
                        <span className="flex items-center gap-x-1"><span className="font-semibold">{t.supplier}:</span><span>{entry.supplier}</span></span>
                        <span className="flex items-center gap-x-1"><span className="font-semibold">{t.startKm}:</span><span>{entry.startKm}</span></span>
                        <span className="flex items-center gap-x-1"><span className="font-semibold">{t.endKm}:</span><span>{entry.endKm}</span></span>
                        <span className="flex items-center gap-x-1"><span className="font-semibold">{t.totalKm}:</span><span>{entry.totalKm ?? (entry.endKm - entry.startKm)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Header Section */}
              <div className={`p-6 sm:p-8 border-b ${isDark ? 'border-surface-700 bg-surface-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 text-sm font-mono opacity-60">
                      <span>{t.woNumber} {workOrder.id}</span>
                      <span>•</span>
                      <span>{t.createdAt}: {new Date(workOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">{workOrder.title}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-2 ${getStatusColor(workOrder.status)}`}>
                        <span className="w-2 h-2 rounded-full bg-current opacity-75"></span>
                        {getStatusLabel(workOrder.status)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-2 ${isDark ? 'bg-surface-700 border-surface-600' : 'bg-white border-gray-200'}`}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" className={getPriorityColor(workOrder.priority)}>
                          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                        <span className={getPriorityColor(workOrder.priority)}>{getPriorityLabel(workOrder.priority)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Quick Actions or Meta Info Block */}
                  <div className={`p-4 rounded-xl min-w-[200px] ${isDark ? 'bg-surface-900 border border-surface-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.dueDate}</span>
                        <div className={`font-semibold ${!workOrder.dueDate ? 'opacity-50 italic' : ''}`}>
                          {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : t.noDeadline}
                        </div>
                      </div>
                      <div className="border-t border-dashed opacity-20"></div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.location}</span>
                        <div className="font-semibold flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="opacity-70">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {workOrder.location || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Left Column (Description & Attachments) */}
                <div className={`lg:col-span-2 p-6 sm:p-8 ${isDark ? 'border-r border-surface-700' : 'border-r border-gray-100'}`}>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    {t.description}
                  </h3>
                  <div className={`prose max-w-none mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{workOrder.description}</p>
                  </div>
                  {attachmentUrl && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {t.attachments}
                      </h3>
                      <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-surface-950 border-surface-700' : 'bg-gray-50 border-gray-200'}`}>
                        {isImage ? (
                          <div className="relative group">
                             <img 
                              src={attachmentUrl} 
                              alt="Attachment" 
                              className="w-full max-h-[500px] object-contain bg-black/5" 
                            />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                               <a 
                                href={attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-gray-100"
                              >
                                {t.openOriginal}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg ${isDark ? 'bg-surface-700' : 'bg-white shadow-sm'}`}>
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium">{workOrder.attachmentFilename || t.attachedFile}</p>
                                <p className="text-xs opacity-60">{t.clickToDownload}</p>
                              </div>
                            </div>
                            <a 
                              href={attachmentUrl} 
                              download
                              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                            >
                              {t.download}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Right Column (Details) */}
                <div className={`p-6 sm:p-8 ${isDark ? 'bg-surface-800/50' : 'bg-gray-50/30'}`}>
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.details}
                  </h3>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.dueDate}</label>
                    <div className={`font-semibold ${!workOrder.dueDate ? 'opacity-50 italic' : ''}`}>
                      {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : t.noDeadline}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.createdAt}</label>
                    <p className="text-sm opacity-80">{new Date(workOrder.createdAt).toLocaleString()}</p>
                  </div>
                  {workOrder.updatedAt && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.lastUpdated}</label>
                      <p className="text-sm opacity-80">{new Date(workOrder.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="pt-6 border-t border-dashed opacity-20"></div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.assignedTechnician}</label>
                     {workOrder.assignedToUserId ? (
                       <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                            {workOrder.assignedToUserId}
                          </div>
                          <span className="font-medium">{t.user} #{workOrder.assignedToUserId}</span>
                       </div>
                     ) : (
                       <span className="text-sm opacity-50 italic">{t.unassigned}</span>
                     )}
                  </div>
                  {workOrder.createdByUserId && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider opacity-50 mb-1">{t.createdBy}</label>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {workOrder.createdByUserId}
                        </div>
                        <span className="font-medium">{t.user} #{workOrder.createdByUserId}</span>
                      </div>
                    </div>
                  )}
                </div>
                {workOrder.materialsCount !== undefined && workOrder.materialsCount > 0 && (
                  <div className={`mt-8 p-4 rounded-xl ${isDark ? 'bg-surface-900' : 'bg-white shadow-sm border border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <span className="font-bold">Materials</span>
                       <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>{workOrder.materialsCount}</span>
                    </div>
                    {workOrder.materialsPreview && workOrder.materialsPreview.length > 0 ? (
                      <ul className="text-sm space-y-1 opacity-80 list-disc pl-4">
                        {workOrder.materialsPreview.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                        {workOrder.materialsCount > workOrder.materialsPreview.length && (
                          <li className="list-none text-xs opacity-60 mt-1 italic">
                            {t.materialsCount.replace('{count}', (workOrder.materialsCount - workOrder.materialsPreview.length).toString())}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-sm opacity-60 italic">{t.details}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Action buttons moved to main content (single instance) */}
          <div className="max-w-5xl mx-auto mt-8 flex justify-center gap-4 no-print" data-html2canvas-ignore="true">
            <button
              className="px-5 py-2 rounded-lg font-medium border border-surface-300 text-surface-700 hover:bg-surface-100 transition-colors duration-150 shadow-sm"
              onClick={() => window.print()}
            >
              {t.print}
            </button>
            <button
              className="px-5 py-2 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 border-0 transition-colors duration-150 shadow-sm"
              onClick={async () => {
                const content = document.querySelector('.printable-content') as HTMLElement;
                if (!content) return;
                
                // Temporary style adjustments for PDF generation
                const originalStyle = content.getAttribute('style');
                
                // Force a fixed width that maps well to A4 (approx 794px at 96 DPI)
                // This ensures text size remains readable when scaled to PDF
                content.style.width = '800px'; 
                content.style.padding = '20px';
                // Ensure white background for PDF
                content.style.background = '#ffffff';
                content.style.color = '#000000';
                
                try {
                  const canvas = await html2canvas(content, { 
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 800 // Emulate window width
                  });
                  
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                  const pageWidth = pdf.internal.pageSize.getWidth();
                  const pageHeight = pdf.internal.pageSize.getHeight();
                  
                  const imgWidth = pageWidth;
                  const imgHeight = (canvas.height * pageWidth) / canvas.width;
                  
                  // If content is longer than one page, split into multiple pages
                  if (imgHeight > pageHeight) {
                     const pdfMulti = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                     let position = 0;
                     let heightLeft = imgHeight;
                     
                     // Page 1
                     pdfMulti.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                     heightLeft -= pageHeight;
                     
                     // Subsequent pages
                     while (heightLeft > 0) {
                       position -= pageHeight; // Shift up by one page height
                       pdfMulti.addPage();
                       pdfMulti.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                       heightLeft -= pageHeight;
                     }
                     pdfMulti.save(`WorkOrder_${workOrder?.id ?? 'Detail'}.pdf`);
                  } else {
                     // Single page
                     pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                     pdf.save(`WorkOrder_${workOrder?.id ?? 'Detail'}.pdf`);
                  }

                } finally {
                  // Restore original styles
                  if (originalStyle) {
                    content.setAttribute('style', originalStyle);
                  } else {
                    content.removeAttribute('style');
                  }
                }
              }}
            >
              {t.saveAsPdf}
            </button>
          </div>
        </main>
      </div>
    </>
  );
};

export default WorkOrderDetailPage;
