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
    <div className={`min-h-screen flex flex-col justify-between transition-colors overflow-x-hidden ${colorScheme === 'dark' ? 'dark bg-[#0f1419]' : 'bg-white'}`}>
      <header className={`p-2 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 ${colorScheme === 'dark' ? 'bg-[#1a1f2e] text-[#e2e8f0] border-b border-[#2d3748]' : 'bg-blue-800 text-white'}`}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-10 w-auto" />
          <span className="font-bold text-base sm:text-xl whitespace-nowrap">Entretien-Bâtiment</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base">
          <Link to="/admin/work-orders" className={`hover:underline whitespace-nowrap ${colorScheme === 'dark' ? 'text-[#e2e8f0] hover:text-white' : ''}`}>{t.workOrders}</Link>
          <Link to="/admin/mileage" className={`hover:underline whitespace-nowrap ${colorScheme === 'dark' ? 'text-[#e2e8f0] hover:text-white' : ''}`}>{t.mileage}</Link>
          <button onClick={handleLogout} className={`px-2 sm:px-3 py-1 rounded whitespace-nowrap transition-colors ${colorScheme === 'dark' ? 'bg-[#252d3d] hover:bg-[#374151] text-[#e2e8f0] border border-[#2d3748]' : 'bg-blue-600 hover:bg-blue-700'}`}>{t.logout}</button>
          <button
            aria-label="Settings"
            className={`p-1.5 sm:p-2 rounded-full focus:outline-none focus:ring-2 transition-colors ${colorScheme === 'dark' ? 'hover:bg-[#374151] focus:ring-[#3b82f6]' : 'hover:bg-blue-700 focus:ring-blue-400'}`}
            onClick={() => setShowSettings(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.21.65.21 1v.09A1.65 1.65 0 0 0 21 12c0 .35-.07.69-.21 1v.09A1.65 1.65 0 0 0 19.4 15z" />
            </svg>
          </button>
          <div className="flex items-center">
            <span className={`mr-1 sm:mr-2 text-xs sm:text-sm ${colorScheme === 'dark' ? 'text-[#94a3b8]' : ''}`}>{lang === 'en' ? 'EN' : 'FR'}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lang === 'fr'}
                onChange={e => setLang(e.target.checked ? 'fr' : 'en')}
                className="sr-only peer"
              />
              <div className={`w-9 sm:w-11 h-5 sm:h-6 rounded-full peer peer-focus:ring-2 transition-all ${colorScheme === 'dark' ? 'bg-[#374151] peer-focus:ring-[#3b82f6]' : 'bg-gray-200 peer-focus:ring-blue-500'}`}> 
                <div
                  className={`absolute left-0.5 sm:left-1 top-0.5 sm:top-1 w-4 h-4 rounded-full transition-transform ${colorScheme === 'dark' ? 'bg-[#3b82f6]' : 'bg-blue-600'} ${lang === 'fr' ? 'translate-x-4 sm:translate-x-5' : ''}`}
                ></div>
              </div>
            </label>
          </div>
        </nav>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl shadow-2xl p-8 w-full max-w-xs relative border ${colorScheme === 'dark' ? 'bg-[#1a1f2e] text-[#e2e8f0] border-[#2d3748]' : 'bg-white text-black border-gray-200'}`}>
            <button
              className={`absolute top-2 right-2 transition-colors ${colorScheme === 'dark' ? 'text-[#94a3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
              onClick={() => setShowSettings(false)}
            >✕</button>
            <h2 className={`text-lg font-bold mb-4 ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : 'text-blue-900'}`}>Color Scheme</h2>
            <div className="flex flex-col gap-3">
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition-colors ${colorScheme === 'dark' ? 'hover:bg-[#252d3d]' : 'hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="colorScheme"
                  value="current"
                  checked={colorScheme === 'current'}
                  onChange={() => setColorScheme('current')}
                  className={colorScheme === 'dark' ? 'accent-[#3b82f6]' : ''}
                />
                <span>Current UI</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition-colors ${colorScheme === 'dark' ? 'hover:bg-[#252d3d]' : 'hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="colorScheme"
                  value="default"
                  checked={colorScheme === 'default'}
                  onChange={() => setColorScheme('default')}
                  className={colorScheme === 'dark' ? 'accent-[#3b82f6]' : ''}
                />
                <span>Default UI</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition-colors ${colorScheme === 'dark' ? 'hover:bg-[#252d3d]' : 'hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="colorScheme"
                  value="performance"
                  checked={colorScheme === 'performance'}
                  onChange={() => setColorScheme('performance')}
                  className={colorScheme === 'dark' ? 'accent-[#3b82f6]' : ''}
                />
                <span>Performance UI</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition-colors ${colorScheme === 'dark' ? 'hover:bg-[#252d3d]' : 'hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="colorScheme"
                  value="dark"
                  checked={colorScheme === 'dark'}
                  onChange={() => setColorScheme('dark')}
                  className={colorScheme === 'dark' ? 'accent-[#3b82f6]' : ''}
                />
                <span>Dark Mode</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 transition-colors ${colorScheme === 'dark' ? 'bg-[#0f1419]' : 'bg-gray-100'}`}>
        <Outlet context={{ colorScheme }} />
      </main>
      <footer className={`w-full text-center py-3 text-sm shadow-sm ${colorScheme === 'dark' ? 'bg-[#1a1f2e] border-t border-[#2d3748]' : 'bg-gradient-to-br from-blue-100/60 to-purple-200/30 rounded-b-xl'}`}>
        <div className={`font-semibold ${colorScheme === 'dark' ? 'text-[#e2e8f0]' : 'text-blue-900'}`}>&copy; HorizonNature</div>
        <div className={`text-xs mt-1 ${colorScheme === 'dark' ? 'text-[#94a3b8]' : 'text-blue-700'}`}>{new Date().getFullYear()}</div>
      </footer>
    </div>
    </ColorSchemeContext.Provider>
  );
};

export default AdminLayout;
