import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@lt_web_theme_mode';

const palettes = {
  light: {
    mode: 'light',
    background: '#F3F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#E9EFF2',
    surfacePressed: '#DCE7EB',
    text: '#11181C',
    textMuted: '#56656D',
    border: '#CFDADF',
    primary: '#087F8C',
    primaryPressed: '#066671',
    primarySoft: '#D9F0F2',
    accent: '#E6B422',
    accentSoft: '#FFF4C7',
    danger: '#C9363E',
    dangerSoft: '#FCE5E7',
    success: '#247A52',
    bubbleMine: '#087F8C',
    bubbleMineText: '#FFFFFF',
    bubbleTheir: '#FFFFFF',
    tab: '#FFFFFF',
    shadow: '#0F172A',
    mascotFace: '#FFFFFF',
    mascotEar: '#111827',
  },
  dark: {
    mode: 'dark',
    background: '#0E1417',
    surface: '#151E22',
    surfaceAlt: '#202C31',
    surfacePressed: '#2B3A40',
    text: '#F4F7F8',
    textMuted: '#A3B0B6',
    border: '#34444B',
    primary: '#55CED5',
    primaryPressed: '#7DDDE2',
    primarySoft: '#173A3E',
    accent: '#F2C94C',
    accentSoft: '#3C351B',
    danger: '#FF7A83',
    dangerSoft: '#3E2226',
    success: '#63D6A1',
    bubbleMine: '#087F8C',
    bubbleMineText: '#ECFEFF',
    bubbleTheir: '#1B272C',
    tab: '#151E22',
    shadow: '#000000',
    mascotFace: '#F8FAFC',
    mascotEar: '#05070A',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setMode(stored);
    });
  }, []);

  const toggleTheme = () => {
    setMode((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  };

  const value = useMemo(() => ({
    mode,
    colors: palettes[mode],
    isDark: mode === 'dark',
    toggleTheme,
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
