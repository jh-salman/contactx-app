import { DarkColors, Fonts, LightColors, Theme, ThemeMode } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  updateColors: (colors: Partial<typeof LightColors>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';
const CUSTOM_COLORS_STORAGE_KEY = '@custom_colors';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use React Native's built-in hook - works better on iOS
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [customColors, setCustomColors] = useState<Partial<typeof LightColors>>({});
  const [forceUpdate, setForceUpdate] = useState(0);

  // Listen to system color scheme changes (iOS fix)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Force update when system theme changes
      setForceUpdate(prev => prev + 1);
    });
    return () => subscription.remove();
  }, []);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') {
          setThemeModeState(savedMode);
      }
      const savedColors = await AsyncStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
      if (savedColors) {
        setCustomColors(JSON.parse(savedColors));
      }
    } catch (error) {
        logger.error('Error loading theme', error);
      }
    };
    loadTheme();
  }, []);

  // Calculate isDark - use systemColorScheme directly
  const isDark = themeMode === 'auto' 
    ? (systemColorScheme === 'dark')
    : themeMode === 'dark';

  // Get colors - create new object each time to force re-render
  const baseColors = isDark ? DarkColors : LightColors;
  const colors = { ...baseColors, ...customColors };

  // Create theme object - new object each render
  const theme: Theme = {
    mode: themeMode,
    colors,
    fonts: Fonts,
  };

  // Functions
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    setForceUpdate(prev => prev + 1); // Force update
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      logger.error('Error saving theme', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const updateColors = async (newColors: Partial<typeof LightColors>) => {
    const merged = { ...customColors, ...newColors };
    setCustomColors(merged);
    setForceUpdate(prev => prev + 1); // Force update
    try {
      await AsyncStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      logger.error('Error saving colors', error);
    }
  };

  // Create new context value each render to force updates
  const contextValue = {
        theme,
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
        updateColors,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
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

// Hook to get theme colors directly
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Hook to get theme fonts directly
export function useThemeFonts() {
  const { theme } = useTheme();
  return theme.fonts;
}

