import React from 'react';
import { useToast, ToastType } from '../context/ToastContext';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto
            transition-all duration-300 ease-out ${TYPE_STYLES[toast.type]}`}
        >
          <span className="text-base leading-none shrink-0 opacity-90">
            {TYPE_ICONS[toast.type]}
          </span>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100 transition-opacity text-base leading-none shrink-0 ml-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
