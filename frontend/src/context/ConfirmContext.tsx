import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red */
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>(resolve => {
      setState({ options: opts, resolve });
    });
  }, []);

  const handleResolve = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmModalUI
          options={state.options}
          onConfirm={() => handleResolve(true)}
          onCancel={() => handleResolve(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
};

const ConfirmModalUI: React.FC<{
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ options, onConfirm, onCancel }) => {
  // Close on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-surface-200 dark:border-surface-700">
        {options.title && (
          <h3
            id="confirm-title"
            className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-2"
          >
            {options.title}
          </h3>
        )}
        <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed mb-6">
          {options.message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-surface-300 dark:border-surface-600
              text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800
              transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {options.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
              ${options.danger
                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                : 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500'
              }`}
          >
            {options.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useConfirm = (): ((options: ConfirmOptions | string) => Promise<boolean>) => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx.confirm;
};
