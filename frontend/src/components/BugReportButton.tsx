import React from 'react';
import { createPortal } from 'react-dom';
import { createBugReport } from '../lib/api';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { useLang } from '../context/LangContext';

const BugReportButton: React.FC = () => {
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { t } = useLang();

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeModal = () => {
    if (submitting) return;
    setOpen(false);
    setError(null);
    setSuccess(null);
    setTitle('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!nextTitle || !nextDescription) {
      setError(t.bugReportValidation || 'Title and description are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createBugReport(nextTitle, nextDescription);
      setSuccess(t.bugReportSuccess || 'Report sent successfully.');
      setTimeout(() => {
        setOpen(false);
        setTitle('');
        setDescription('');
        setSuccess(null);
      }, 700);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        const message = String(err?.response?.data?.message || '');
        const minutes = message.match(/(\d+)/)?.[1] || '30';
        setError((t.bugReportCooldown || 'Please wait {minutes} minute(s) before sending another report.').replace('{minutes}', minutes));
      } else {
        setError(err?.response?.data?.message || t.bugReportSubmitError || 'Failed to send report.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
          colorScheme === 'dark'
            ? 'text-surface-300 hover:text-white hover:bg-surface-800'
            : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
        }`}
      >
        {t.bugReportFeatureButton || 'Bug report/Feature'}
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-modal max-h-[90vh] my-4 overflow-y-auto ${
              colorScheme === 'dark'
                ? 'bg-surface-900 border-surface-700 text-surface-100'
                : 'bg-white border-surface-200 text-surface-900'
            }`}
          >
            <div className={`flex items-center justify-between p-4 border-b ${
              colorScheme === 'dark' ? 'border-surface-800' : 'border-surface-100'
            }`}>
              <h3 className="text-base font-semibold">
                {t.bugReportFormTitle || 'Bug report / Feature request'}
              </h3>
              <button
                onClick={closeModal}
                disabled={submitting}
                className={`p-1.5 rounded-lg transition-colors ${
                  colorScheme === 'dark'
                    ? 'text-surface-400 hover:text-white hover:bg-surface-800'
                    : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'
                } ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <p className={`text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
                {t.bugReportFormSubtitle || 'Send a bug report or feature idea to all admins.'}
              </p>

              {error && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${
                  colorScheme === 'dark'
                    ? 'border-red-900/40 bg-red-900/20 text-red-300'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              {success && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${
                  colorScheme === 'dark'
                    ? 'border-emerald-900/40 bg-emerald-900/20 text-emerald-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {success}
                </div>
              )}

              <label className="block">
                <span className="text-sm font-medium">{t.bugReportTitleLabel || 'Title'}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder={t.bugReportTitlePlaceholder || 'Short summary'}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    colorScheme === 'dark'
                      ? 'bg-surface-950 border-surface-700 text-surface-100'
                      : 'bg-white border-surface-200 text-surface-900'
                  }`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">{t.bugReportDescriptionLabel || 'Description'}</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={5000}
                  rows={5}
                  placeholder={t.bugReportDescriptionPlaceholder || 'Describe the issue or requested feature...'}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    colorScheme === 'dark'
                      ? 'bg-surface-950 border-surface-700 text-surface-100'
                      : 'bg-white border-surface-200 text-surface-900'
                  }`}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    colorScheme === 'dark'
                      ? 'border-surface-700 bg-surface-800 text-surface-200 hover:bg-surface-700'
                      : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'
                  } ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-2 text-sm rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (t.bugReportSubmitting || 'Sending...') : (t.bugReportSubmit || 'Send report')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BugReportButton;
