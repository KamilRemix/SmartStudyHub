import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { ThemeColors, ThemeContextType } from './types';
import { lightColors, darkColors } from './colors';

export const THEME_STORAGE_KEY = '@smartstudy_theme';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) return;

        if (stored === 'light' || stored === 'dark') {
          setThemeState(stored);
        } else {
          const systemScheme = Appearance.getColorScheme();
          setThemeState(systemScheme === 'light' ? 'light' : 'dark');
        }
      } catch (error) {
        console.warn('[ThemeContext] Error reading theme from AsyncStorage:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStoredTheme();

    const subscription = Appearance.addChangeListener(async ({ colorScheme }) => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!stored && colorScheme) {
          setThemeState(colorScheme === 'light' ? 'light' : 'dark');
        }
      } catch {
        // Ignore background appearance listener errors
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const setTheme = useCallback(async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('[ThemeContext] Error writing theme to AsyncStorage:', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDark,
      colors,
      toggleTheme,
      setTheme,
      isLoading,
    }),
    [theme, isDark, colors, toggleTheme, setTheme, isLoading]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};
