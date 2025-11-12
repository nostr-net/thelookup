import { useState, useEffect } from 'react';
import { useNWC } from '@/hooks/useNWCContext';
import type { WebLNProvider } from '@/types/webln';

export function useWallet() {
  const [webln, setWebln] = useState<WebLNProvider | null>(null);
  const { getActiveConnection } = useNWC();

  useEffect(() => {
    // Check for WebLN provider
    if (typeof window !== 'undefined' && 'webln' in window) {
      setWebln((window as { webln?: WebLNProvider }).webln || null);
    }
  }, []);

  return {
    webln,
    // Consumers can call getActiveConnection() to retrieve current NWC connection
    getActiveConnection,
  };
}
