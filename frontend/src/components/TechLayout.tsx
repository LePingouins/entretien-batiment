import * as React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TechLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Optionally call /api/auth/logout here
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-green-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-10 w-auto" />
          <span className="font-bold text-xl">Entretien-Bâtiment</span>
        </div>
        <nav className="space-x-4">
          <Link to="/tech" className="hover:underline">Dashboard</Link>
          {/* Add more tech links here if needed */}
          <button onClick={handleLogout} className="ml-4 bg-green-600 px-3 py-1 rounded hover:bg-green-700">Logout</button>
        </nav>
      </header>
      <main className="flex-1 bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default TechLayout;
