import React from 'react';

export type ColorSchemeType = 'current' | 'performance' | 'default' | 'dark';

export const ColorSchemeContext = React.createContext<{
  colorScheme: ColorSchemeType;
  setColorScheme: (s: ColorSchemeType) => void;
}>({
  colorScheme: 'default',
  setColorScheme: () => {},
});
