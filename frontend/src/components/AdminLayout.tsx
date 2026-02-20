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
    <div className={`min-h-screen flex flex-col justify-between transition-colors overflow-x-hidden ${colorScheme === 'dark' ? 'dark bg-surface-950' : 'bg-slate-100'}`}>
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${colorScheme === 'dark' ? 'bg-surface-900/90 text-surface-100 border-surface-700' : 'bg-white text-slate-800 border-slate-200 shadow-sm'}`}>
        <div className="w-full px-4 sm:px-6 py-2.5 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-9 w-auto" />
            <span className={`font-bold text-base sm:text-lg tracking-tight ${colorScheme === 'dark' ? 'text-white' : 'text-surface-900'}`}>Entretien-Bâtiment</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm">
            <Link to="/admin" className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>Dashboard</Link>
            <Link to="/admin/work-orders" className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.workOrders}</Link>
            <Link to="/admin/urgent-work-orders" className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>Urgent</Link>
            <Link to="/admin/mileage" className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.mileage}</Link>
            <Link to="/admin/archive" className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.archive}</Link>
            
            <div className={`w-px h-5 mx-1 ${colorScheme === 'dark' ? 'bg-surface-700' : 'bg-surface-200'}`}></div>
            
            <button onClick={handleLogout} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-red-400 hover:bg-surface-800' : 'text-surface-500 hover:text-red-600 hover:bg-red-50'}`}>{t.logout}</button>
            <button
              aria-label="Settings"
              className={`p-2 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'}`}
              onClick={() => setShowSettings(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.21.65.21 1v.09A1.65 1.65 0 0 0 21 12c0 .35-.07.69-.21 1v.09A1.65 1.65 0 0 0 19.4 15z" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>{lang === 'en' ? 'EN' : 'FR'}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lang === 'fr'}
                  onChange={e => setLang(e.target.checked ? 'fr' : 'en')}
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 rounded-full peer transition-all ${colorScheme === 'dark' ? 'bg-surface-700 peer-checked:bg-brand-600' : 'bg-surface-200 peer-checked:bg-brand-500'}`}> 
                  <div
                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${lang === 'fr' ? 'translate-x-4' : ''}`}
                  ></div>
                </div>
              </label>
            </div>
          </nav>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <div className={`rounded-2xl shadow-modal p-6 w-full max-w-xs relative border ${colorScheme === 'dark' ? 'bg-surface-900 text-surface-100 border-surface-700' : 'bg-white text-surface-900 border-surface-200'}`}>
            <button
              className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'}`}
              onClick={() => setShowSettings(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h2 className={`text-lg font-bold mb-4 ${colorScheme === 'dark' ? 'text-white' : 'text-surface-900'}`}>Appearance</h2>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'default', label: 'Light', icon: '☀️' },
                { value: 'dark', label: 'Dark', icon: '🌙' },
                { value: 'current', label: 'Vibrant', icon: '🎨' },
                { value: 'performance', label: 'Minimal', icon: '⚡' },
              ].map((scheme) => (
                <label key={scheme.value} className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl transition-all ${
                  colorScheme === scheme.value 
                    ? (colorScheme === 'dark' ? 'bg-brand-600/20 border border-brand-500/30' : 'bg-brand-50 border border-brand-200')
                    : (colorScheme === 'dark' ? 'hover:bg-surface-800 border border-transparent' : 'hover:bg-surface-50 border border-transparent')
                }`}>
                  <input
                    type="radio"
                    name="colorScheme"
                    value={scheme.value}
                    checked={colorScheme === scheme.value}
                    onChange={() => setColorScheme(scheme.value as ColorSchemeType)}
                    className="sr-only"
                  />
                  <span className="text-lg">{scheme.icon}</span>
                  <span className={`font-medium ${colorScheme === scheme.value ? (colorScheme === 'dark' ? 'text-brand-300' : 'text-brand-700') : ''}`}>{scheme.label}</span>
                  {colorScheme === scheme.value && (
                    <svg className={`ml-auto w-4 h-4 ${colorScheme === 'dark' ? 'text-brand-400' : 'text-brand-600'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 transition-colors ${colorScheme === 'dark' ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <Outlet context={{ colorScheme }} />
      </main>
      <footer className={`w-full text-center py-3 text-xs border-t ${colorScheme === 'dark' ? 'bg-surface-900/50 border-surface-800 text-surface-500' : 'bg-white/50 border-surface-200 text-surface-400'}`}>
        <span className="font-medium">&copy; {new Date().getFullYear()} Horizon Nature</span>
      </footer>
    </div>
    </ColorSchemeContext.Provider>
  );
};

export default AdminLayout;
