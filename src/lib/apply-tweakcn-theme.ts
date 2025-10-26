import { applyShadcnTheme } from './theme-manager';

/**
 * Apply the specific tweakcn theme you mentioned
 */
export async function applySpecificTheme() {
  const themeUrl = 'https://tweakcn.com/r/themes/cmh82wf67000h04jr3azxcy1u';
  
  try {
    const success = await applyShadcnTheme(themeUrl);
    if (success) {
      console.log('Theme applied successfully!');
    } else {
      console.log('Theme application failed - try manual method');
      
      // Manual fallback - you can add the actual theme values here
      // after visiting the URL and copying them
      console.log('Visit this URL to get theme values:', themeUrl);
    }
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

/**
 * Example of how to manually add a tweakcn theme
 * Replace these values with actual ones from the tweakcn.com URL
 */
export const EXAMPLE_TWEAKCN_THEME = {
  light: {
    background: "0 0% 100%",
    foreground: "240 10% 3.9%",
    card: "0 0% 100%",
    'card-foreground': "240 10% 3.9%",
    popover: "0 0% 100%",
    'popover-foreground': "240 10% 3.9%",
    primary: "346.8 77.2% 49.8%", // Example - replace with actual values
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
};
