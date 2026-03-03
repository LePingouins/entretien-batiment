import React from 'react';

function isFormElement(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // contenteditable
  // @ts-ignore
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function getFocusableElements(): HTMLElement[] {
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const els = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.pointerEvents === 'none') return false;
    // Exclude elements marked hidden/inert/aria-hidden
    if (el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if ((el as any).inert) return false;

    // Exclude if any ancestor hides pointer events or is aria-hidden/hidden/inert
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.pointerEvents === 'none') return false;
      if (parent.hasAttribute('hidden')) return false;
      if (parent.getAttribute('aria-hidden') === 'true') return false;
      if ((parent as any).inert) return false;
      parent = parent.parentElement;
    }

    // Some elements inside transformed/scroll containers may have no offsetParent;
    // treat an element as visible if it has layout or client rects.
    if ((el as HTMLElement).offsetWidth > 0 || (el as HTMLElement).offsetHeight > 0) return true;
    try {
      const rects = el.getClientRects();
      return rects && rects.length > 0;
    } catch {
      return false;
    }
  });

  return els;
}

export default function KeyboardNavigator() {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as Element | null;

      // Ignore when user is typing in form controls
      if (isFormElement(active)) return;
      // If a modal/dialog with aria-modal is open, restrict focusables to that dialog
      let focusables = getFocusableElements();
      const modal = document.querySelector('[aria-modal="true"]');
      if (modal) {
        const selector = [
          'a[href]:not([tabindex="-1"])',
          'button:not([disabled]):not([tabindex="-1"])',
          'input:not([disabled]):not([tabindex="-1"])',
          'select:not([disabled]):not([tabindex="-1"])',
          'textarea:not([disabled]):not([tabindex="-1"])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        focusables = Array.from((modal as Element).querySelectorAll<HTMLElement>(selector)).filter(el => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (style.pointerEvents === 'none') return false;
          if (el.hasAttribute('hidden')) return false;
          if (el.getAttribute('aria-hidden') === 'true') return false;
          if ((el as any).inert) return false;
          if ((el as HTMLElement).offsetWidth > 0 || (el as HTMLElement).offsetHeight > 0) return true;
          try {
            const rects = el.getClientRects();
            return rects && rects.length > 0;
          } catch { return false; }
        });
      }
      if (!focusables.length) return;

      const idx = active ? focusables.indexOf(active as HTMLElement) : -1;
      const len = focusables.length;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = idx === -1 ? 0 : (idx + 1) % len;
        const next = focusables[nextIdx];
        next?.focus();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = idx === -1 ? len - 1 : (idx - 1 + len) % len;
        const prev = focusables[prevIdx];
        prev?.focus();
        return;
      }

      // Let the browser handle Enter/Space activation on focused controls
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
