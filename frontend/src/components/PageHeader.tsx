import * as React from 'react';
import { ColorSchemeContext } from '../context/ColorSchemeContext';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const centered = !actions;
  return (
    <div className={`mb-6 flex flex-col ${centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'} gap-4`}>
      <div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold ${colorScheme === 'dark' ? 'text-surface-100' : 'text-surface-900'}`}>{title}</h1>
        {subtitle && <div className={`text-sm mt-1 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-600'}`}>{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
