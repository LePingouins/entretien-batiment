import * as React from 'react';
import { Link } from 'react-router-dom';

export interface NavDropdownItem {
  label: string;
  path: string;
  isActive: boolean;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  isDark: boolean;
  isMobileOpen?: boolean;
}

const NavDropdown: React.FC<NavDropdownProps> = ({ label, items, isDark, isMobileOpen }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const isAnyActive = items.some(item => item.isActive);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // In mobile mode (hamburger open), show as an inline accordion
  if (isMobileOpen) {
    return (
      <div className="w-full">
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors ${isAnyActive ? 'text-yellow-500' : isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}
          aria-expanded={open}
        >
          {label}
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className={`ml-3 mt-1 border-l pl-3 flex flex-col gap-0.5 ${isDark ? 'border-surface-700' : 'border-surface-200'}`}>
            {items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`block px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${item.isActive ? 'text-yellow-500' : isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: floating dropdown
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${isAnyActive ? 'text-yellow-500' : isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full left-0 mt-1.5 min-w-[190px] rounded-xl shadow-lg border py-1.5 z-50 ${isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200 shadow-surface-900/10'}`}
          role="menu"
        >
          {items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${item.isActive ? 'text-yellow-500' : isDark ? 'text-surface-300 hover:text-white hover:bg-surface-700' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'}`}
            >
              {item.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
              )}
              <span className={item.isActive ? '' : 'ml-3.5'}>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
