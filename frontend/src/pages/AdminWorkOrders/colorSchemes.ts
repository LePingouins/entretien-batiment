// Color scheme logic and helpers for AdminWorkOrdersPage
export type ColorSchemeType = 'current' | 'performance' | 'default' | 'dark';

export const getColorSchemeClass = (colorScheme: ColorSchemeType, type: 'wrapper' | 'column' | 'header') => {
  switch (type) {
    case 'wrapper':
      if (colorScheme === 'dark') return 'flex-1 bg-gray-800 min-h-screen pt-2 px-8 pb-8';
      if (colorScheme === 'performance') return 'flex-1 bg-gray-100 min-h-screen pt-2 px-8 pb-8';
      if (colorScheme === 'default') return 'flex-1 bg-gradient-to-br from-blue-100/80 to-purple-200/60 min-h-screen pt-2 px-8 pb-8';
      return 'flex-1 bg-gradient-to-br from-blue-100/80 to-purple-200/60 min-h-screen pt-2 px-8 pb-8';
    case 'column':
      if (colorScheme === 'dark') return 'min-w-[400px] w-[420px] bg-gray-800 rounded-2xl shadow p-10 flex flex-col border border-gray-700';
      if (colorScheme === 'performance') return 'min-w-[400px] w-[420px] bg-white rounded-2xl shadow p-10 flex flex-col border border-gray-200';
      if (colorScheme === 'default') return 'min-w-[400px] w-[420px] bg-white rounded-2xl shadow p-10 flex flex-col border border-gray-200';
      return 'min-w-[400px] w-[420px] bg-gradient-to-br from-blue-200/80 to-purple-100/40 rounded-3xl shadow-2xl p-10 flex flex-col border-2 border-blue-300/40';
    case 'header':
      if (colorScheme === 'default') return 'font-bold text-lg mb-3 px-3 py-2 rounded-xl bg-white text-gray-800 flex items-center gap-2 border-b border-gray-200 shadow';
      if (colorScheme === 'performance') return 'font-bold text-lg mb-3 px-3 py-2 rounded-xl bg-gray-100 text-gray-800 flex items-center gap-2 border-b border-gray-200';
      return 'font-bold text-xl mb-3 px-3 py-2 rounded-2xl bg-blue-200/60 text-blue-900 flex items-center gap-2 shadow';
    default:
      return '';
  }
};
