import { useState, useEffect } from 'react';
import { parseFeaturedAppsMarkdown, type FeaturedApp } from '@/lib/parseFeaturedApps';

export function useFeaturedApps() {
  const [apps, setApps] = useState<FeaturedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeaturedApps() {
      try {
        setLoading(true);
        setError(null);

        // Fetch the FEATURED_APPS.md file from the public directory
        // Use BASE_URL to support deployment to subdirectories (e.g., GitHub Pages)
        const baseUrl = import.meta.env.BASE_URL || '/';
        let url = `${baseUrl}FEATURED_APPS.md`.replace(/\/+/g, '/'); // Remove duplicate slashes

        // In test/Node environments, fetch requires absolute URLs
        // In browser, make it absolute if window is available
        if (typeof window !== 'undefined' && !url.startsWith('http')) {
          url = new URL(url, window.location.origin).href;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load featured apps: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        const parsedApps = parseFeaturedAppsMarkdown(markdownContent);
        
        setApps(parsedApps);
      } catch (err) {
        console.error('Error loading featured apps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load featured apps');
        
        // Fallback to empty array if loading fails
        setApps([]);
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedApps();
  }, []);

  return {
    apps,
    loading,
    error,
  };
}
