import React, { createContext, useContext, useState, ReactNode } from 'react';
import { en, fr } from '../lang/lang';

export type Lang = 'en' | 'fr';
export const translations = { en, fr };

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof en;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  // Load language from localStorage or default to 'en'
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('lang');
    return stored === 'fr' ? 'fr' : 'en';
  });
  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };
  const t = translations[lang];
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
