import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, fr } from '../lang/lang';

export type Lang = 'en' | 'fr';
const translations = { en, fr };
const STORAGE_KEY = 'app_lang';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof en;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'fr') setLangState(stored);
    });
  }, []);

  function setLang(next: Lang): void {
    setLangState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo(() => ({ lang, setLang, t: translations[lang] }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang must be used within LangProvider');
  }
  return ctx;
}
