import { useState, useEffect } from 'react';
import { useNWC } from '@/hooks/useNWCContext';
import type { WebLNProvider } from '@webbtc/webln-types';

export function useWallet() {
  const [webln, setWebln] = useState<WebLNProvider | null>(null);
  const { getActiveConnection, activeNWC } = useNWC();

  useEffect(() => {
    // Check for WebLN provider
    if (typeof window !== 'undefined' && 'webln' in window) {
      setWebln((window as any).webln as WebLNProvider);
    }
  }, []);

  return {
    webln,
    activeNWC,
    getActiveConnection,
  };
}