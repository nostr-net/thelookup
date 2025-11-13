import { useState, useEffect } from 'react';
import { parseResourcesMarkdown, type Resource } from '@/lib/parseResources';

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the RESOURCES.md file from the public directory
        const response = await fetch(`${import.meta.env.BASE_URL}RESOURCES.md`);
        
        if (!response.ok) {
          throw new Error(`Failed to load resources: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        const parsedResources = parseResourcesMarkdown(markdownContent);
        
        setResources(parsedResources);
      } catch (err) {
        console.error('Error loading resources:', err);
        setError(err instanceof Error ? err.message : 'Failed to load resources');
        
        // Fallback to empty array if loading fails
        setResources([]);
      } finally {
        setLoading(false);
      }
    }

    loadResources();
  }, []);

  return {
    resources,
    loading,
    error,
  };
}
