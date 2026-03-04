import * as React from 'react';
import { useLang } from '../context/LangContext';
import { changeMyPassword } from '../lib/api';

type PasswordChangeSectionProps = {
  isDark: boolean;
};

const PasswordChangeSection: React.FC<PasswordChangeSectionProps> = ({ isDark }) => {
  const { t } = useLang();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch || 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t.passwordChangeSuccess || 'Password updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || t.passwordChangeError || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'border-surface-700 bg-surface-800/40' : 'border-surface-200 bg-surface-50/70'}`}>
      <h3 className={`font-medium mb-3 ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
        {t.passwordSectionTitle || 'Change Password'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={`block mb-1 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
            {t.currentPasswordLabel || 'Current Password'}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'border-surface-700 bg-surface-900 text-surface-100' : 'border-surface-200 bg-white text-surface-900'}`}
          />
        </div>

        <div>
          <label className={`block mb-1 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
            {t.newPasswordLabel || 'New Password'}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'border-surface-700 bg-surface-900 text-surface-100' : 'border-surface-200 bg-white text-surface-900'}`}
          />
        </div>

        <div>
          <label className={`block mb-1 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
            {t.confirmPasswordLabel || 'Confirm New Password'}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'border-surface-700 bg-surface-900 text-surface-100' : 'border-surface-200 bg-white text-surface-900'}`}
          />
        </div>

        {error && (
          <div className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-red-900/30 text-red-300 border border-red-800/40' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {error}
          </div>
        )}

        {success && (
          <div className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (t.loading || 'Loading...') : (t.changePasswordButton || 'Update Password')}
        </button>
      </form>
    </div>
  );
};

export default PasswordChangeSection;