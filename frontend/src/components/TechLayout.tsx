import * as React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsIcon from './NotificationsIcon';

const TechLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Optionally call /api/auth/logout here
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-surface-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-9 w-auto" />
            <span className="font-bold text-base sm:text-lg tracking-tight text-surface-900">Entretien-Bâtiment</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/tech" className="px-3 py-1.5 rounded-lg text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors">Dashboard</Link>
            <div className="w-px h-5 mx-1 bg-surface-200"></div>
            <NotificationsIcon />
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-sm font-medium text-surface-500 hover:text-red-600 hover:bg-red-50 transition-colors">Logout</button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="w-full text-center py-3 text-xs border-t bg-white/50 border-surface-200 text-surface-400">
        <span className="font-medium">&copy; {new Date().getFullYear()} Horizon Nature</span>
      </footer>
    </div>
  );
};

export default TechLayout;
