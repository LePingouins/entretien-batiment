import * as React from 'react';
import { useNavigate } from 'react-router-dom';

export interface NavSearchItem {
  label: string;
  path: string;
  group: string;
}

interface NavSearchProps {
  items: NavSearchItem[];
  isDark: boolean;
  lang: 'fr' | 'en';
}

const NavSearch: React.FC<NavSearchProps> = ({ items, isDark, lang }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K to open
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  }, [query, items]);

  React.useEffect(() => setSelectedIdx(0), [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      navigate(filtered[selectedIdx].path);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const placeholder = lang === 'fr' ? 'Rechercher une page...' : 'Search pages...';
  const openLabel = lang === 'fr' ? 'Rechercher' : 'Search';
  const noResults = lang === 'fr' ? 'Aucun résultat' : 'No results';

  // Group items by their group label for display
  const groups = React.useMemo(() => {
    const map = new Map<string, NavSearchItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [filtered]);

  let globalIdx = 0;
  const groupEntries = Array.from(groups.entries());

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'}`}
        aria-label={openLabel}
        title={`${openLabel} (Ctrl+K)`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
        </svg>
        <span className="hidden xl:inline">{openLabel}</span>
        <kbd className={`hidden xl:inline text-xs px-1.5 py-0.5 rounded border font-mono leading-none ${isDark ? 'border-surface-600 text-surface-500 bg-surface-800' : 'border-surface-300 text-surface-400 bg-surface-50'}`}>
          ⌃K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] pt-[12vh] px-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200'}`}
          >
            {/* Search input */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-surface-700' : 'border-surface-200'}`}>
              <svg
                className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-surface-400' : 'text-surface-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-surface-100 placeholder-surface-500' : 'text-surface-900 placeholder-surface-400'}`}
              />
              <kbd
                className={`text-xs px-1.5 py-0.5 rounded border font-mono leading-none cursor-pointer ${isDark ? 'border-surface-600 text-surface-500 bg-surface-800' : 'border-surface-300 text-surface-400 bg-surface-50'}`}
                onClick={() => setOpen(false)}
                title="Press Escape to close"
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                  {noResults}
                </p>
              ) : (
                groupEntries.map(([group, groupItems]) => (
                  <div key={group}>
                    <p className={`px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                      {group}
                    </p>
                    {groupItems.map(item => {
                      const idx = globalIdx++;
                      return (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setOpen(false); }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${idx === selectedIdx
                            ? (isDark ? 'bg-surface-800 text-white' : 'bg-surface-50 text-surface-900')
                            : (isDark ? 'text-surface-300 hover:bg-surface-800' : 'text-surface-700 hover:bg-surface-50')
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 flex-shrink-0 ${idx === selectedIdx ? (isDark ? 'text-yellow-400' : 'text-yellow-500') : (isDark ? 'text-surface-500' : 'text-surface-400')}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className={`px-4 py-2 border-t flex items-center gap-4 text-xs ${isDark ? 'border-surface-700 text-surface-500' : 'border-surface-100 text-surface-400'}`}>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 rounded border font-mono ${isDark ? 'border-surface-600 bg-surface-800' : 'border-surface-300 bg-surface-50'}`}>↑↓</kbd>
                {lang === 'fr' ? 'naviguer' : 'navigate'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 rounded border font-mono ${isDark ? 'border-surface-600 bg-surface-800' : 'border-surface-300 bg-surface-50'}`}>↵</kbd>
                {lang === 'fr' ? 'ouvrir' : 'open'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 rounded border font-mono ${isDark ? 'border-surface-600 bg-surface-800' : 'border-surface-300 bg-surface-50'}`}>Esc</kbd>
                {lang === 'fr' ? 'fermer' : 'close'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavSearch;
