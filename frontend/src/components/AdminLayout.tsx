import * as React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

// Add 'dark' to color scheme types
type ColorSchemeType = 'current' | 'performance' | 'default' | 'dark';

export const ColorSchemeContext = React.createContext<{ colorScheme: ColorSchemeType, setColorScheme: (s: ColorSchemeType) => void }>({ colorScheme: 'default', setColorScheme: () => {} });

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = React.useState(false);
  // Persist color scheme in localStorage, default to 'default'
  const [colorScheme, setColorSchemeState] = React.useState<ColorSchemeType>(() => {
    return (localStorage.getItem('colorScheme') as ColorSchemeType) || 'default';
  });
  const setColorScheme = React.useCallback((scheme: ColorSchemeType) => {
    setColorSchemeState(scheme);
    localStorage.setItem('colorScheme', scheme);
  }, []);

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const { lang, setLang, t } = useLang();
  // Add/remove dark class on body for dark mode
  React.useEffect(() => {
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorScheme]);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
    <div className={`min-h-screen flex flex-col justify-between bg-white transition-colors ${colorScheme === 'dark' ? 'dark' : ''}`}>  {/* dark mode root only if dark */}
      <header className={`bg-blue-800 text-white p-4 flex justify-between items-center ${colorScheme === 'dark' ? 'dark:bg-[#1a2233] dark:text-gray-100' : ''}`}>
        <div className={`font-bold text-xl ${colorScheme === 'dark' ? 'dark:text-white' : ''}`}>Entretien-Bâtiment Admin</div>
        <nav className="space-x-4 flex items-center">
          <Link to="/admin/work-orders" className={`hover:underline ${colorScheme === 'dark' ? 'dark:text-gray-100' : ''}`}>{t.workOrders}</Link>
            <Link to="/admin/mileage" className={`hover:underline ${colorScheme === 'dark' ? 'dark:text-gray-100' : ''}`}>{t.mileage}</Link>
          <button onClick={handleLogout} className={`ml-4 bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 ${colorScheme === 'dark' ? 'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white' : ''}`}>{t.logout}</button>
          <button
            aria-label="Settings"
            className={`ml-4 p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${colorScheme === 'dark' ? 'dark:hover:bg-gray-700 dark:focus:ring-gray-400' : ''}`}
            onClick={() => setShowSettings(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.21.65.21 1v.09A1.65 1.65 0 0 0 21 12c0 .35-.07.69-.21 1v.09A1.65 1.65 0 0 0 19.4 15z" />
            </svg>
          </button>
          <div className="ml-4 flex items-center">
            <span className={`mr-2 ${colorScheme === 'dark' ? 'dark:text-gray-200' : ''}`}>{lang === 'en' ? 'English' : 'Français'}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lang === 'fr'}
                onChange={e => setLang(e.target.checked ? 'fr' : 'en')}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 transition-all ${colorScheme === 'dark' ? 'dark:bg-gray-700 dark:peer-focus:ring-blue-800' : ''}`}> 
                <div
                  className={`absolute left-1 top-1 w-4 h-4 bg-blue-600 rounded-full transition-transform ${colorScheme === 'dark' ? 'dark:bg-gray-400' : ''} ${lang === 'fr' ? 'translate-x-5' : ''}`}
                ></div>
              </div>
            </label>
          </div>
        </nav>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg shadow-lg p-8 w-full max-w-xs relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowSettings(false)}
            >✕</button>
            <h2 className="text-lg font-bold mb-4 text-blue-900">Color Scheme</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorScheme"
                  value="current"
                  checked={colorScheme === 'current'}
                  onChange={() => setColorScheme('current')}
                />
                <span>Current UI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorScheme"
                  value="default"
                  checked={colorScheme === 'default'}
                  onChange={() => setColorScheme('default')}
                />
                <span>Default UI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorScheme"
                  value="performance"
                  checked={colorScheme === 'performance'}
                  onChange={() => setColorScheme('performance')}
                />
                <span>Performance UI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorScheme"
                  value="dark"
                  checked={colorScheme === 'dark'}
                  onChange={() => setColorScheme('dark')}
                />
                <span>Dark Mode</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 bg-gray-100 transition-colors ${colorScheme === 'dark' ? 'dark:bg-[#13171f]' : ''}`}>
        <Outlet context={{ colorScheme }} />
      </main>
      <footer className={`w-full text-center py-2 text-sm bg-gradient-to-br from-blue-100/60 to-purple-200/30 shadow-sm rounded-b-xl ${colorScheme === 'dark' ? 'dark:bg-gray-800' : ''}`}>
        <div className={`font-semibold text-blue-900 ${colorScheme === 'dark' ? 'dark:text-gray-200' : ''}`}>&copy; HorizonNature</div>
        <div className={`text-xs text-blue-700 mt-1 ${colorScheme === 'dark' ? 'dark:text-gray-400' : ''}`}>{new Date().getFullYear()}</div>
      </footer>
    </div>
    </ColorSchemeContext.Provider>
  );
};

export default AdminLayout;
