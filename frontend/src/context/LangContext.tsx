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
  const [lang, setLang] = useState<Lang>('en');
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
