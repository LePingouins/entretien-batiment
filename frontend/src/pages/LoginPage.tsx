import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthResponse, ErrorResponse } from '../types/api';
import { useLang } from '../context/LangContext';
import { getRoleHomePath } from '../lib/pageAccess';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof schema>;

function LoginPage() {
  const { login, role } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/api/auth/login', data);
      login(res.data);
      // Redirect will happen in useEffect below
    } catch (err: any) {
      const apiError: ErrorResponse = err.response?.data;
      setError(apiError?.message || 'Login failed');
    }
  };

  React.useEffect(() => {
    if (role) {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [role, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-brand-50 to-surface-100 px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-200/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-brand-100/40 blur-3xl"></div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-elevated w-full max-w-sm border border-surface-200/60"
        aria-label={t.loginFormAria || 'Login form'}
      >
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-brand-50 rounded-2xl">
            <img src="/logo.png" alt="Horizon Nature" className="h-16 w-auto" />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-surface-700">{t.emailLabel || 'Email'}</label>
            <input
              type="email"
              {...register('email')}
              aria-label={t.emailLabel || 'Email'}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50/50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              placeholder="you@company.com"
            />
            {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email.message}</div>}
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-surface-700">{t.passwordLabel || 'Password'}</label>
            <input
              type="password"
              {...register('password')}
              aria-label={t.passwordLabel || 'Password'}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50/50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password.message}</div>}
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="mt-6 w-full bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              {t.loggingIn || 'Signing in...'}
            </span>
          ) : t.loginButton || 'Sign In'}
        </button>

        <p className="mt-5 text-center text-sm text-surface-500 opacity-70">
          {t.pageExplanationLogin}
        </p>

        <div className="mt-6 text-center">
          <span className="text-xs text-surface-400">&copy; {new Date().getFullYear()} Horizon Nature</span>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
