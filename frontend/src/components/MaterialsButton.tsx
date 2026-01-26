import * as React from 'react';
import { useLang } from '../context/LangContext';

export interface MaterialsButtonProps {
  count?: number;
  preview?: string[];
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  colorScheme?: string;
}

export const MaterialsButton: React.FC<MaterialsButtonProps> = ({ count = 0, preview = [], onClick, colorScheme }) => {
  const { t } = useLang();

  // Defensive: always treat preview as array
  const safePreview = Array.isArray(preview)
    ? preview
    : (typeof preview === 'string' && preview.length > 0
        ? preview.split(/,\s*/)
        : []);

  const buttonClass = colorScheme === 'dark'
    ? 'flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1f2e] hover:bg-[#374151] text-[#a5b4fc] border border-[#2d3748] text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1] relative'
    : 'flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 relative';

  const countBadgeClass = colorScheme === 'dark'
    ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6366f1] text-white text-xs font-bold ml-1'
    : 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold ml-1';

  const previewClass = colorScheme === 'dark'
    ? 'ml-2 truncate text-[#64748b] max-w-[120px]'
    : 'ml-2 truncate text-gray-500 max-w-[120px]';

  return (
    <button
      className={buttonClass}
      onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { e.preventDefault(); e.stopPropagation(); onClick(e); }}
      aria-label={`${t.materials} (${count})`}
      type="button"
    >
      <span className="font-bold">{t.materials}</span>
      <span className={countBadgeClass}>{count}</span>
      {safePreview && safePreview.length > 0 && (
        <span className={previewClass} title={safePreview.join(', ')}>
          {safePreview.slice(0, 2).join(', ')}{safePreview.length > 2 ? '…' : ''}
        </span>
      )}
    </button>
  );
};
