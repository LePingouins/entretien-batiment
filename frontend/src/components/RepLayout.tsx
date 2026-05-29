import * as React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { ColorSchemeContext, ColorSchemeType } from '../context/ColorSchemeContext';
import BugReportButton from './BugReportButton';

const RepLayout: React.FC = () => {
  const { logout, role } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();

  const [colorScheme, setColorSchemeState] = React.useState<ColorSchemeType>(() => {
    const stored = localStorage.getItem('colorScheme');
    return stored === 'dark' ? 'dark' : 'default';
  });
  const setColorScheme = React.useCallback((scheme: ColorSchemeType) => {
    const normalized = scheme === 'dark' ? 'dark' : 'default';
    setColorSchemeState(normalized);
    localStorage.setItem('colorScheme', normalized);
  }, []);

  React.useEffect(() => {
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorScheme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkCls = (isActive: boolean) =>
    `px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
      isActive
        ? 'text-yellow-500'
        : colorScheme === 'dark'
        ? 'text-surface-300 hover:text-white hover:bg-surface-800'
        : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
    }`;

  const roleLabel = role ? (({ ADMIN: t.adminUsersRoleAdmin, DEVELOPPER: t.adminUsersRoleDevelopper, TECHNICIEN: t.adminUsersRoleTech, WORKER: t.adminUsersRoleWorker, REPRESENTANT: t.adminUsersRoleRepresentant } as Record<string, string | undefined>)[role] ?? role) : '';
  const path = window.location.pathname;
  const tripsLabel = t.repTripsNav || (lang === 'fr' ? 'Kilométrage' : 'Mileage');
  const expensesLabel = t.expensesNav || (lang === 'fr' ? 'Dépenses' : 'Expenses');

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      <div
        className={`min-h-screen flex flex-col justify-between transition-colors ${
          colorScheme === 'dark' ? 'dark bg-surface-950' : 'bg-slate-100'
        }`}
      >
        <header
          className={`sticky top-0 z-40 backdrop-blur-xl border-b ${
            colorScheme === 'dark'
              ? 'bg-surface-900/90 text-surface-100 border-surface-700'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm'
          }`}
        >
          <div className="w-full px-4 sm:px-6 py-2.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-9 w-auto" />
              <span
                className={`font-bold text-base sm:text-lg tracking-tight ${
                  colorScheme === 'dark' ? 'text-white' : 'text-surface-900'
                }`}
              >
                Entretien-Bâtiment
              </span>
            </div>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link to="/rep/rep-trips" className={linkCls(path.endsWith('/rep-trips'))}>
                {tripsLabel}
              </Link>
              <Link to="/rep/expenses" className={linkCls(path.endsWith('/expenses'))}>
                {expensesLabel}
              </Link>
              <BugReportButton />
              <div
                className={`w-px h-5 mx-1 ${
                  colorScheme === 'dark' ? 'bg-surface-700' : 'bg-surface-200'
                }`}
              ></div>
              <button
                onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium ${
                  colorScheme === 'dark'
                    ? 'text-surface-300 hover:bg-surface-800'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
                aria-label="Toggle language"
              >
                {lang === 'fr' ? 'EN' : 'FR'}
              </button>
              <button
                onClick={() => setColorScheme(colorScheme === 'dark' ? 'default' : 'dark')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium ${
                  colorScheme === 'dark'
                    ? 'text-surface-300 hover:bg-surface-800'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
                aria-label="Toggle theme"
              >
                {colorScheme === 'dark' ? '☀️' : '🌙'}
              </button>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorScheme === 'dark' ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>{roleLabel}</span>
              <button
                onClick={handleLogout}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                  colorScheme === 'dark'
                    ? 'text-surface-400 hover:text-red-400 hover:bg-surface-800'
                    : 'text-surface-500 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                {t.logout}
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full">
          <Outlet />
        </main>

        <footer
          className={`py-4 text-center text-xs ${
            colorScheme === 'dark' ? 'text-surface-500' : 'text-surface-400'
          }`}
        >
          Horizon Nature &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </ColorSchemeContext.Provider>
  );
};

export default RepLayout;
