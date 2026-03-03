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
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  // focus trap & initial focus
  React.useEffect(() => {
    if (!open || !modalRef.current) return;
    const modal = modalRef.current;
    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusables = () => Array.from(modal.querySelectorAll<HTMLElement>(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (style.pointerEvents === 'none') return false;
      if (el.hasAttribute('hidden')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if ((el as any).inert) return false;
      return true;
    });

    const focusables = getFocusables();
    if (focusables.length) focusables[0].focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = getFocusables();
        if (!nodes.length) return;
        const idx = nodes.indexOf(document.activeElement as HTMLElement);
        let nextIdx = idx;
        if (e.shiftKey) nextIdx = idx <= 0 ? nodes.length - 1 : idx - 1;
        else nextIdx = idx === -1 || idx === nodes.length - 1 ? 0 : idx + 1;
        e.preventDefault();
        nodes[nextIdx].focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`${styles.modalOverlay} ${overlayClass}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" className={`${styles.modalContainer} ${containerClass}`}>
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
