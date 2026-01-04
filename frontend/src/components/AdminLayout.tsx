import * as React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Optionally call /api/auth/logout here
    logout();
    navigate('/login');
  };

  const { lang, setLang, t } = useLang();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl">Entretien-Bâtiment Admin</div>
        <nav className="space-x-4 flex items-center">
          <Link to="/admin/work-orders" className="hover:underline">{t.workOrders}</Link>
          {/* Add more admin links here if needed */}
          <button onClick={handleLogout} className="ml-4 bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">{t.logout}</button>
          <div className="ml-4 flex items-center">
            <span className="mr-2">{lang === 'en' ? 'English' : 'Français'}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lang === 'fr'}
                onChange={e => setLang(e.target.checked ? 'fr' : 'en')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-800 transition-all">
                <div
                  className={`absolute left-1 top-1 w-4 h-4 bg-blue-600 rounded-full transition-transform ${lang === 'fr' ? 'translate-x-5' : ''}`}
                ></div>
              </div>
            </label>
          </div>
        </nav>
      </header>
      <Outlet />
      <footer className="w-full text-center py-2 text-sm bg-gradient-to-br from-blue-100/60 to-purple-200/30 shadow-sm rounded-b-xl">
        <div className="font-semibold text-blue-900">&copy; HorizonNature</div>
        <div className="text-xs text-blue-700 mt-1">{new Date().getFullYear()}</div>
      </footer>
    </div>
  );
};

export default AdminLayout;
