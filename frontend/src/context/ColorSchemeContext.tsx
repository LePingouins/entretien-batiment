import React from 'react';

// 'green' is the new "Default" option (mobile-app style); 'default' is the
// original "Light" option's value and is left as-is for backwards compat.
export type ColorSchemeType = 'current' | 'performance' | 'default' | 'dark' | 'green';

export const ColorSchemeContext = React.createContext<{
  colorScheme: ColorSchemeType;
  setColorScheme: (s: ColorSchemeType) => void;
}>({
  colorScheme: 'default',
  setColorScheme: () => {},
});
