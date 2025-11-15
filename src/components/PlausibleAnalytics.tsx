import { useEffect } from 'react';

/**
 * Plausible Analytics Component
 *
 * Loads the Plausible analytics script if enabled via environment variables.
 *
 * Environment variables:
 * - VITE_PLAUSIBLE_ENABLED: Set to 'true' to enable analytics
 * - VITE_PLAUSIBLE_DOMAIN: The domain to track (e.g., 'nostrhub.io')
 * - VITE_PLAUSIBLE_SCRIPT_URL: Optional custom script URL (defaults to 'https://plausible.io/js/script.js')
 */
export function PlausibleAnalytics() {
  useEffect(() => {
    const enabled = import.meta.env.VITE_PLAUSIBLE_ENABLED === 'true';
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    const scriptUrl = import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL || 'https://plausible.io/js/script.js';

    // Only load if explicitly enabled and domain is set
    if (!enabled || !domain) {
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(`script[data-domain="${domain}"]`);
    if (existingScript) {
      return;
    }

    // Create and append the Plausible script
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = domain;
    script.src = scriptUrl;

    document.head.appendChild(script);

    // Cleanup function to remove the script if the component unmounts
    return () => {
      const scriptToRemove = document.querySelector(`script[data-domain="${domain}"]`);
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}
