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
    ? 'bg-[#1a1f2e] border border-[#2d3748] text-[#e2e8f0]'
    : 'bg-white';
  const titleClass = colorScheme === 'dark' ? 'text-[#e2e8f0]' : '';
  const closeBtnClass = colorScheme === 'dark'
    ? 'text-[#94a3b8] hover:text-red-400 bg-transparent'
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
              className={colorScheme === 'dark' ? 'bg-[#3b82f6] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2563eb] transition-colors' : styles.saveBtn}
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
