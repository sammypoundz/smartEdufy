import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light'); // 👈 now light is the default

  useEffect(() => {
    // Apply theme class to html element
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);

    // Paint the background at the body level so the theme always covers the
    // full document — otherwise pages whose content is shorter than the
    // viewport (or scrolling past their root div) show a white body strip.
    document.body.style.backgroundColor = theme === 'dark' ? '#111827' : '#f8fafc';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};