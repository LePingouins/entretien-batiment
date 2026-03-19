import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { usePageAccess } from '../context/PageAccessContext';
import { ColorSchemeContext, ColorSchemeType } from '../context/ColorSchemeContext';
import NotificationsIcon from './NotificationsIcon';
import BugReportButton from './BugReportButton';
import { getCurrentUser, updateUserSettings } from '../lib/api';
import PasswordChangeSection from './PasswordChangeSection';

const COLOR_SCHEME_OPTIONS: Array<{ value: ColorSchemeType; label: string; icon: string }> = [
  { value: 'default', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
];

type TechLayoutProps = {
  basePath?: '/tech' | '/worker';
};

const TechLayout: React.FC<TechLayoutProps> = ({ basePath = '/tech' }) => {
  const { logout } = useAuth();
  const { canAccess } = usePageAccess();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = React.useState(false);
  const [remindersEnabled, setRemindersEnabled] = React.useState(false);

  React.useEffect(() => {
    if (showSettings) {
      getCurrentUser().then(user => {
        setRemindersEnabled(user.remindersEnabled !== false);
      }).catch(err => console.error('Failed to fetch user settings', err));
    }
  }, [showSettings]);

  const handleReminderToggle = async (enabled: boolean) => {
    setRemindersEnabled(enabled);
    try {
      await updateUserSettings(enabled);
    } catch (err) {
      console.error('Failed to update settings', err);
      // Revert on failure
      setRemindersEnabled(!enabled);
    }
  };

  const [colorScheme, setColorSchemeState] = React.useState<ColorSchemeType>(() => {
    const stored = localStorage.getItem('colorScheme');
    if (stored === 'dark' || stored === 'default') {
      return stored;
    }
    if (stored) {
      localStorage.setItem('colorScheme', 'default');
    }
    return 'default';
  });
  const setColorScheme = React.useCallback((scheme: ColorSchemeType) => {
    const normalized = scheme === 'dark' ? 'dark' : 'default';
    setColorSchemeState(normalized);
    localStorage.setItem('colorScheme', normalized);
  }, []);

  React.useEffect(() => {
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorScheme]);

  const langToggleRef = React.useRef<HTMLInputElement | null>(null);
  const langLabelRef = React.useRef<HTMLLabelElement | null>(null);

  const modalRef = React.useRef<HTMLDivElement | null>(null);

  const closeSettings = React.useCallback(() => {
    setShowSettings(false);
    setTimeout(() => {
      try { langToggleRef.current?.focus(); } catch {}
    }, 0);
  }, []);

  // Focus trap for settings modal
  React.useEffect(() => {
    if (!showSettings || !modalRef.current) return;
    const modal = modalRef.current;
    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusables = () => Array.from(modal.querySelectorAll<HTMLElement>(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (style.pointerEvents === 'none') return false;
      if (el.hasAttribute('hidden')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if ((el as any).inert) return false;
      return true;
    });

    const focusables = getFocusables();
    if (focusables.length) {
      focusables[0].focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = getFocusables();
        if (!nodes.length) return;
        const idx = nodes.indexOf(document.activeElement as HTMLElement);
        let nextIdx = idx;
        if (e.shiftKey) nextIdx = idx <= 0 ? nodes.length - 1 : idx - 1;
        else nextIdx = idx === -1 || idx === nodes.length - 1 ? 0 : idx + 1;
        e.preventDefault();
        nodes[nextIdx].focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings, closeSettings]);

  const handleLogout = async () => {
    // Optionally call /api/auth/logout here
    logout();
    navigate('/login');
  };

  const pagePath = React.useCallback((segment: '' | 'work-orders' | 'urgent-work-orders' | 'mileage' | 'archive' | 'analytics' | 'documents' | 'shopping-list') => {
    return segment ? `${basePath}/${segment}` : basePath;
  }, [basePath]);

  const [navOpen, setNavOpen] = React.useState(false);
  const handleHamburger = () => setNavOpen((open) => !open);

  // Sticky nav: header becomes fixed only after it has fully scrolled out of view
  const headerRef = React.useRef<HTMLElement | null>(null);
  const [isSticky, setIsSticky] = React.useState(false);
  const [headerHeight, setHeaderHeight] = React.useState(0);

  React.useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const ro = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    ro.observe(header);
    setHeaderHeight(header.offsetHeight);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (headerHeight === 0) return;
    const handleScroll = () => setIsSticky(window.scrollY >= headerHeight);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headerHeight]);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
    <div className={`min-h-screen flex flex-col justify-between transition-colors ${colorScheme === 'dark' ? 'dark bg-surface-950' : 'bg-slate-100'}`}>
      <header
        ref={headerRef}
        className={`${isSticky ? 'fixed top-0 left-0 right-0 w-full nav-slide-down' : ''} z-40 backdrop-blur-xl border-b ${colorScheme === 'dark' ? 'bg-surface-900/90 text-surface-100 border-surface-700' : 'bg-white text-slate-800 border-slate-200 shadow-sm'}`}
      >
        <div className="w-full px-4 sm:px-6 py-2.5 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <button className="sm:hidden p-2 rounded-lg focus:outline-none" aria-label="Open navigation" onClick={handleHamburger}>
              <span className="block w-6 h-6">
                <span className={`block h-0.5 w-full bg-current mb-1 transition-all ${navOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-current mb-1 transition-all ${navOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-current transition-all ${navOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </span>
            </button>
            <img src="/logo.png" alt="Horizon Nature" className="h-8 sm:h-9 w-auto" />
            <span className={`font-bold text-base sm:text-lg tracking-tight ${colorScheme === 'dark' ? 'text-white' : 'text-surface-900'}`}>Entretien-Bâtiment</span>
          </div>
          <nav className={`flex flex-wrap items-center gap-1 sm:gap-2 text-sm ${navOpen ? 'block' : 'hidden'} sm:flex`}>
            {canAccess('DASHBOARD') && (
              <Link to={pagePath('')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname === pagePath('') ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.dashboardTitle}</Link>
            )}
            {canAccess('WORK_ORDERS') && (
              <Link to={pagePath('work-orders')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('work-orders')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.workOrders}</Link>
            )}
            {canAccess('URGENT_WORK_ORDERS') && (
              <Link to={pagePath('urgent-work-orders')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('urgent-work-orders')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.urgentWorkOrders || 'Urgent'}</Link>
            )}
            {canAccess('MILEAGE') && (
              <Link to={pagePath('mileage')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('mileage')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.mileage}</Link>
            )}
            {canAccess('ARCHIVE') && (
              <Link to={pagePath('archive')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('archive')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.archive}</Link>
            )}
            {canAccess('ANALYTICS') && (
              <Link to={pagePath('analytics')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('analytics')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.analyticsTitle || 'Analytics'}</Link>
            )}
            <Link to={pagePath('documents')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('documents')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.documentsPage || 'Documents'}</Link>
            <Link to={pagePath('shopping-list')} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${window.location.pathname.includes(pagePath('shopping-list')) ? 'text-yellow-500' : colorScheme === 'dark' ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`}>{t.shoppingList || 'Shopping List'}</Link>
            <BugReportButton />
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
            <NotificationsIcon />
            <div className="flex items-center gap-1.5 z-40">
              <span
                onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                role="button"
                tabIndex={0}
                className={`text-xs font-medium cursor-pointer select-none ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}
              >
                {lang === 'en' ? 'EN' : 'FR'}
              </span>
              <label
                ref={langLabelRef}
                tabIndex={0}
                role="button"
                aria-pressed={lang === 'fr'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLang(lang === 'fr' ? 'en' : 'fr');
                  }
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  setLang(lang === 'fr' ? 'en' : 'fr'); 
                }}
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  ref={langToggleRef}
                  type="checkbox"
                  checked={lang === 'fr'}
                  onChange={e => setLang(e.target.checked ? 'fr' : 'en')}
                  className="sr-only peer"
                  tabIndex={-1}
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
      {isSticky && <div style={{ height: headerHeight }} aria-hidden="true" />}
      
      {/* Settings Modal */}
      {showSettings && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className={`rounded-2xl shadow-modal w-full max-w-md relative border max-h-[90vh] overflow-y-auto flex flex-col ${colorScheme === 'dark' ? 'bg-surface-900 text-surface-100 border-surface-700' : 'bg-white text-surface-900 border-surface-200'}`}
            >
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${colorScheme === 'dark' ? 'bg-surface-900/95 border-surface-800' : 'bg-white/95 border-surface-200'}`}>
              <h2 className={`text-lg font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-surface-900'}`}>{t.profileSettings}</h2>
              <button
                className={`p-1.5 rounded-lg transition-colors ${colorScheme === 'dark' ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'}`}
                onClick={() => closeSettings()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Color Scheme Section */}
              <details className={`group rounded-xl border ${colorScheme === 'dark' ? 'border-surface-700 bg-surface-800/50' : 'border-surface-200 bg-surface-50'}`}>
                <summary className={`flex items-center justify-between p-4 cursor-pointer font-medium list-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500`}>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {lang === 'fr' ? 'Thème' : 'Color Scheme'}
                  </div>
                  <span className={`transition group-open:rotate-180 ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <div className="flex flex-col gap-1.5">
                    {COLOR_SCHEME_OPTIONS.map((scheme) => (
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
              </details>

              <hr className={`border-t ${colorScheme === 'dark' ? 'border-surface-700' : 'border-surface-200'}`} />

              {/* Preferences Section - Reminders */}
              <div className="px-2">
                <label className="flex flex-col cursor-pointer p-3 rounded-xl border border-transparent hover:border-surface-200 dark:hover:border-surface-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${colorScheme === 'dark' ? 'text-surface-200' : 'text-surface-800'}`}>{t.remindersSectionTitle || 'Reminders'}</span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={remindersEnabled}
                        onChange={(e) => handleReminderToggle(e.target.checked)}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors peer-checked:bg-brand-600 ${colorScheme === 'dark' ? 'bg-surface-700' : 'bg-surface-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4`}></div>
                    </div>
                  </div>
                  <span className={`text-sm ${colorScheme === 'dark' ? 'text-surface-400' : 'text-surface-500'}`}>
                    {lang === 'fr' ? 'Envoyez-moi des notifications pour mes tâches à venir et les alertes urgentes.' : 'Send me notifications about my upcoming assignments and urgent alerts.'}
                  </span>
                </label>
              </div>

              <PasswordChangeSection isDark={colorScheme === 'dark'} />
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

export default TechLayout;
