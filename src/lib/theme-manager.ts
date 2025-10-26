/**
 * Theme Manager for integrating tweakcn.com themes
 * Converts OKLCH colors to HSL format for shadcn/ui compatibility
 */

import { oklch, converter } from 'culori';

export interface TweakcnTheme {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  radius?: string;
  // Sidebar colors
  sidebar?: string;
  'sidebar-foreground'?: string;
  'sidebar-primary'?: string;
  'sidebar-primary-foreground'?: string;
  'sidebar-accent'?: string;
  'sidebar-accent-foreground'?: string;
  'sidebar-border'?: string;
  'sidebar-ring'?: string;
}

export interface TweakcnThemeSet {
  light: TweakcnTheme;
  dark: TweakcnTheme;
}


/**
 * Convert OKLCH color to HSL format using culori
 */
function oklchToHsl(oklchString: string): string {
  try {
    // Parse OKLCH string like "oklch(0.5 0.2 180)"
    const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match) return oklchString;
    
    const [, l, c, h] = match;
    const oklchColor = oklch({
      l: parseFloat(l),
      c: parseFloat(c),
      h: parseFloat(h) || 0
    });
    
    // Convert to HSL and format for CSS custom properties
    const hslColor = converter('hsl')(oklchColor);
    if (!hslColor) return oklchString;
    
    // Return in the format expected by shadcn/ui: "hue saturation% lightness%"
    const h_val = Math.round(hslColor.h || 0);
    const s_val = Math.round((hslColor.s || 0) * 100);
    const l_val = Math.round((hslColor.l || 0) * 100);
    
    return `${h_val} ${s_val}% ${l_val}%`;
  } catch (error) {
    console.warn('Failed to convert OKLCH color:', oklchString, error);
    return oklchString;
  }
}

/**
 * Apply a tweakcn theme to the document
 */
export function applyTweakcnTheme(theme: TweakcnTheme, _mode: 'light' | 'dark' = 'light') {
  const root = document.documentElement;
  
  // Apply each theme property
  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const cssValue = value.startsWith('oklch') ? oklchToHsl(value) : value;
      root.style.setProperty(`--${key}`, cssValue);
    }
  });
}

/**
 * Predefined tweakcn.com inspired themes
 * These are example themes - you can get actual themes from tweakcn.com
 */
export const TWEAKCN_THEMES: Record<string, TweakcnThemeSet> = {
  // Add your specific theme here after getting values from the URL
  'cmh82wf67000h04jr3azxcy1u': {
    light: {
      // Replace these with actual values from tweakcn.com
      background: "0 0% 100%",
      foreground: "240 10% 3.9%",
      card: "0 0% 100%",
      'card-foreground': "240 10% 3.9%",
      popover: "0 0% 100%",
      'popover-foreground': "240 10% 3.9%",
      primary: "346.8 77.2% 49.8%", // This will be different - get from URL
      'primary-foreground': "355.7 100% 97.3%",
      secondary: "240 4.8% 95.9%",
      'secondary-foreground': "240 5.9% 10%",
      muted: "240 4.8% 95.9%",
      'muted-foreground': "240 3.8% 46.1%",
      accent: "240 4.8% 95.9%",
      'accent-foreground': "240 5.9% 10%",
      destructive: "0 84.2% 60.2%",
      'destructive-foreground': "0 0% 98%",
      border: "240 5.9% 90%",
      input: "240 5.9% 90%",
      ring: "346.8 77.2% 49.8%",
      radius: "0.5rem",
    },
    dark: {
      // Replace these with actual dark mode values from tweakcn.com
      background: "20 14.3% 4.1%",
      foreground: "0 0% 95%",
      card: "24 9.8% 10%",
      'card-foreground': "0 0% 95%",
      popover: "0 0% 9%",
      'popover-foreground': "0 0% 95%",
      primary: "346.8 77.2% 49.8%",
      'primary-foreground': "355.7 100% 97.3%",
      secondary: "240 3.7% 15.9%",
      'secondary-foreground': "0 0% 98%",
      muted: "0 0% 15%",
      'muted-foreground': "240 5% 64.9%",
      accent: "12 6.5% 15.1%",
      'accent-foreground': "0 0% 98%",
      destructive: "0 62.8% 30.6%",
      'destructive-foreground': "0 0% 98%",
      border: "240 3.7% 15.9%",
      input: "240 3.7% 15.9%",
      ring: "346.8 77.2% 49.8%",
    }
  },
  default: {
    light: {
      background: "0 0% 100%",
      foreground: "240 10% 3.9%",
      card: "0 0% 100%",
      'card-foreground': "240 10% 3.9%",
      popover: "0 0% 100%",
      'popover-foreground': "240 10% 3.9%",
      primary: "240 5.9% 10%",
      'primary-foreground': "0 0% 98%",
      secondary: "240 4.8% 95.9%",
      'secondary-foreground': "240 5.9% 10%",
      muted: "240 4.8% 95.9%",
      'muted-foreground': "240 3.8% 46.1%",
      accent: "240 4.8% 95.9%",
      'accent-foreground': "240 5.9% 10%",
      destructive: "0 84.2% 60.2%",
      'destructive-foreground': "0 0% 98%",
      border: "240 5.9% 90%",
      input: "240 5.9% 90%",
      ring: "240 10% 3.9%",
      radius: "0.5rem",
    },
    dark: {
      background: "240 10% 3.9%",
      foreground: "0 0% 98%",
      card: "240 10% 3.9%",
      'card-foreground': "0 0% 98%",
      popover: "240 10% 3.9%",
      'popover-foreground': "0 0% 98%",
      primary: "0 0% 98%",
      'primary-foreground': "240 5.9% 10%",
      secondary: "240 3.7% 15.9%",
      'secondary-foreground': "0 0% 98%",
      muted: "240 3.7% 15.9%",
      'muted-foreground': "240 5% 64.9%",
      accent: "240 3.7% 15.9%",
      'accent-foreground': "0 0% 98%",
      destructive: "0 62.8% 30.6%",
      'destructive-foreground': "0 0% 98%",
      border: "240 3.7% 15.9%",
      input: "240 3.7% 15.9%",
      ring: "240 4.9% 83.9%",
      radius: "0.5rem",
    }
  },
  // Add more themes here as you export them from tweakcn.com
};

/**
 * Load and apply a theme by name
 */
export function loadTweakcnTheme(themeName: string, mode: 'light' | 'dark' = 'light') {
  const themeSet = TWEAKCN_THEMES[themeName];
  if (!themeSet) {
    console.warn(`Theme "${themeName}" not found`);
    return;
  }
  
  applyTweakcnTheme(themeSet[mode], mode);
}

/**
 * Fetch and apply a theme from a tweakcn.com URL
 */
export async function fetchTweakcnTheme(url: string): Promise<TweakcnThemeSet | null> {
  try {
    // Extract theme ID from URL
    const themeId = url.split('/').pop();
    if (!themeId) {
      throw new Error('Invalid theme URL');
    }

    // For now, return null as we'd need to implement the API call
    // In a real implementation, you'd fetch from tweakcn.com's API
    console.log('Fetching theme:', themeId);
    console.log('Note: Direct theme fetching requires tweakcn.com API integration');
    
    return null;
  } catch (error) {
    console.error('Failed to fetch theme:', error);
    return null;
  }
}

/**
 * Apply a theme from a tweakcn.com URL using shadcn CLI format
 */
export async function applyShadcnTheme(url: string): Promise<boolean> {
  const themeSet = await fetchTweakcnTheme(url);
  if (!themeSet) {
    console.error('Failed to fetch theme from URL:', url);
    return false;
  }

  // Apply the light theme by default
  applyTweakcnTheme(themeSet.light);
  return true;
}

/**
 * Export current CSS variables as a tweakcn theme
 */
export function exportCurrentTheme(): TweakcnTheme {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  return {
    background: computedStyle.getPropertyValue('--background').trim(),
    foreground: computedStyle.getPropertyValue('--foreground').trim(),
    card: computedStyle.getPropertyValue('--card').trim(),
    'card-foreground': computedStyle.getPropertyValue('--card-foreground').trim(),
    popover: computedStyle.getPropertyValue('--popover').trim(),
    'popover-foreground': computedStyle.getPropertyValue('--popover-foreground').trim(),
    primary: computedStyle.getPropertyValue('--primary').trim(),
    'primary-foreground': computedStyle.getPropertyValue('--primary-foreground').trim(),
    secondary: computedStyle.getPropertyValue('--secondary').trim(),
    'secondary-foreground': computedStyle.getPropertyValue('--secondary-foreground').trim(),
    muted: computedStyle.getPropertyValue('--muted').trim(),
    'muted-foreground': computedStyle.getPropertyValue('--muted-foreground').trim(),
    accent: computedStyle.getPropertyValue('--accent').trim(),
    'accent-foreground': computedStyle.getPropertyValue('--accent-foreground').trim(),
    destructive: computedStyle.getPropertyValue('--destructive').trim(),
    'destructive-foreground': computedStyle.getPropertyValue('--destructive-foreground').trim(),
    border: computedStyle.getPropertyValue('--border').trim(),
    input: computedStyle.getPropertyValue('--input').trim(),
    ring: computedStyle.getPropertyValue('--ring').trim(),
    radius: computedStyle.getPropertyValue('--radius').trim(),
  };
}
