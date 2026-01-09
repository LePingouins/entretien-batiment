import * as React from 'react';
import { useLang } from '../context/LangContext';

export interface MaterialsButtonProps {
  count?: number;
  preview?: string[];
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const MaterialsButton: React.FC<MaterialsButtonProps> = ({ count = 0, preview = [], onClick }) => {
  const { t } = useLang();
  return (
    <button
      className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 relative"
      onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { e.preventDefault(); e.stopPropagation(); onClick(e); }}
      aria-label={`${t.materials} (${count})`}
      type="button"
    >
      <span className="font-bold">{t.materials}</span>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold ml-1">{count}</span>
      {preview && preview.length > 0 && (
        <span className="ml-2 truncate text-gray-500 max-w-[120px]" title={preview.join(', ')}>
          {preview.slice(0, 2).join(', ')}{preview.length > 2 ? '…' : ''}
        </span>
      )}
    </button>
  );
};
