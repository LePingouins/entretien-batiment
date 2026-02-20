import React from 'react';
import styles from '../pages/AdminWorkOrders/AdminWorkOrdersPage.module.css';

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
  colorScheme?: string;
  showDelete?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}

export const SharedEditModal: React.FC<EditModalProps> = ({
  open,
  onClose,
  title,
  onSubmit,
  isSubmitting,
  children,
  colorScheme,
  showDelete,
  onDelete,
  deleteLabel,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const overlayClass = colorScheme === 'dark' ? 'bg-black/60' : 'bg-black/40';
  const containerClass = colorScheme === 'dark'
    ? 'bg-surface-800 border border-surface-700 text-surface-100'
    : 'bg-white';
  const titleClass = colorScheme === 'dark' ? 'text-surface-100' : '';
  const closeBtnClass = colorScheme === 'dark'
    ? 'text-surface-400 hover:text-red-400 bg-transparent'
    : '';

  return (
    <div className={`${styles.modalOverlay} ${overlayClass}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${styles.modalContainer} ${containerClass}`}>
        <button
          className={`${styles.modalCloseBtn} ${closeBtnClass}`}
          onClick={onClose}
          aria-label="Close"
        >✕</button>
        <h2 className={`${styles.modalTitle} ${titleClass}`}>{title}</h2>
        <form onSubmit={onSubmit} className={styles.formEditModal}>
          {children}
          <div className={styles.modalBtnRow}>
            <button
              type="submit"
              className={colorScheme === 'dark' ? 'bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors' : styles.saveBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            {showDelete && onDelete && (
              <button
                type="button"
                className={colorScheme === 'dark' ? 'bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-medium hover:bg-red-600/30 transition-colors' : styles.deleteBtn}
                onClick={onDelete}
              >
                {deleteLabel || 'Delete'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
