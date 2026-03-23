import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  themeColor: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth();
  const themeColor = company?.themeColor || '#10b981'; // Default emerald-500

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', themeColor);
    // Generate a lighter version for backgrounds
    document.documentElement.style.setProperty('--primary-color-light', `${themeColor}20`);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
