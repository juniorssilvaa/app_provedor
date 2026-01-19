import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, darkTheme, lightTheme } from '../theme/colors';
import { useConfig } from './ConfigContext';

type ThemeType = 'light' | 'dark';

interface ThemeContextData {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: typeof darkColors;
  navigationTheme: typeof darkTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const STORAGE_THEME_KEY = '@NANET:theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const { appConfig } = useConfig();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(STORAGE_THEME_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(STORAGE_THEME_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const activeColors = useMemo(() => {
    const baseColors = theme === 'dark' ? darkColors : lightColors;
    // O app não deve usar a cor do painel, mantendo seu próprio tema
    return baseColors;
  }, [theme]);

  const activeNavigationTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        colors: activeColors,
        navigationTheme: activeNavigationTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
