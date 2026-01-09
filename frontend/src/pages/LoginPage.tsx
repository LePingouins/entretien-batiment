import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthResponse, ErrorResponse } from '../types/api';
import { useLang } from '../context/LangContext';

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
    if (role === 'ADMIN') {
      navigate('/admin/work-orders', { replace: true });
    } else if (role === 'TECH') {
      navigate('/tech', { replace: true });
    }
  }, [role, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
        aria-label={t.loginFormAria || 'Login form'}
      >
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Horizon Nature" className="h-20 w-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center">{t.loginTitle || 'Login'}</h2>
        <div className="mb-4">
          <label className="block mb-1 font-medium">{t.emailLabel || 'Email'}</label>
          <input
            type="email"
            {...register('email')}
            aria-label={t.emailLabel || 'Email'}
            className="border rounded px-3 py-2 w-full"
          />
          {errors.email && <div className="text-red-500 text-sm">{errors.email.message}</div>}
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">{t.passwordLabel || 'Password'}</label>
          <input
            type="password"
            {...register('password')}
            aria-label={t.passwordLabel || 'Password'}
            className="border rounded px-3 py-2 w-full"
          />
          {errors.password && <div className="text-red-500 text-sm">{errors.password.message}</div>}
        </div>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full font-semibold hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? t.loggingIn || 'Logging in...' : t.loginButton || 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
