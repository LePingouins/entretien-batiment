import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getRoleHomePath } from '../lib/pageAccess';

const NoAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  const { t } = useLang();

  const goHome = React.useCallback(() => {
    navigate(getRoleHomePath(role), { replace: true });
  }, [navigate, role]);

  const handleLogout = React.useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-surface-50 px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-surface-200 bg-white shadow-card p-6 sm:p-8 text-center">
        <p className="text-surface-600 mb-6">
          {t.noAccessDescription || 'Your account is signed in, but no pages are currently enabled for your user. Please contact an administrator.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={goHome}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
          >
            {t.noAccessRetry || 'Try again'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-surface-300 text-surface-700 font-semibold hover:bg-surface-50 transition-colors"
          >
            {t.noAccessLogout || t.logout || 'Logout'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-surface-500 opacity-70">
          {t.pageExplanationNoAccess}
        </p>
      </div>
    </div>
  );
};

export default NoAccessPage;
