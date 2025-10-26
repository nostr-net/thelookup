import { useCallback, useEffect, useState } from 'react';
import { applyTweakcnTheme, loadTweakcnTheme, TWEAKCN_THEMES, type TweakcnTheme } from '@/lib/theme-manager';

export function useTweakcnTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [isDark, setIsDark] = useState(false);

  // Check system preference and stored theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('tweakcn-theme');
    const storedMode = localStorage.getItem('theme-mode');
    
    if (stored && TWEAKCN_THEMES[stored]) {
      setCurrentTheme(stored);
    }
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = storedMode === 'dark' || (storedMode === null && prefersDark);
    setIsDark(mode);
  }, []);

  // Apply theme when theme or mode changes
  useEffect(() => {
    if (TWEAKCN_THEMES[currentTheme]) {
      const mode = isDark ? 'dark' : 'light';
      loadTweakcnTheme(currentTheme, mode);
      
      // Update document class for dark mode
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [currentTheme, isDark]);

  const switchTheme = useCallback((themeName: string) => {
    if (TWEAKCN_THEMES[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('tweakcn-theme', themeName);
    }
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light');
  }, [isDark]);

  const applyCustomTheme = useCallback((theme: TweakcnTheme) => {
    applyTweakcnTheme(theme);
  }, []);

  const getAvailableThemes = useCallback(() => {
    return Object.keys(TWEAKCN_THEMES);
  }, []);

  return {
    currentTheme,
    isDark,
    switchTheme,
    toggleMode,
    applyCustomTheme,
    getAvailableThemes,
  };
}
