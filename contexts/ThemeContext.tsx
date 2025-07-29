
import React, { createContext, useState, useMemo, useEffect, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  theme: Theme;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColorState] = useState(() => localStorage.getItem('erp_primaryColor') || '#1e40af');
  const [secondaryColor, setSecondaryColorState] = useState(() => localStorage.getItem('erp_secondaryColor') || '#64748b');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('erp_theme') as Theme) || 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-hover', `${primaryColor}E6`); 
    root.style.setProperty('--color-primary-light', theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe');
    localStorage.setItem('erp_primaryColor', primaryColor);
  }, [primaryColor, theme]);

  useEffect(() => {
     const root = document.documentElement;
    root.style.setProperty('--color-secondary', secondaryColor);
    root.style.setProperty('--color-secondary-hover', `${secondaryColor}E6`);
    root.style.setProperty('--color-secondary-light', theme === 'dark' ? 'rgba(100, 116, 139, 0.1)' : '#f1f5f9');
     localStorage.setItem('erp_secondaryColor', secondaryColor);
  }, [secondaryColor, theme]);
  
  const setPrimaryColor = (color: string) => setPrimaryColorState(color);
  const setSecondaryColor = (color: string) => setSecondaryColorState(color);
  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));

  const value = useMemo(() => ({
    primaryColor,
    secondaryColor,
    theme,
    setPrimaryColor,
    setSecondaryColor,
    toggleTheme,
  }), [primaryColor, secondaryColor, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};