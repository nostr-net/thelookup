import { useState, useEffect, useCallback } from 'react';
import type { WebLNProvider } from '@webbtc/webln-types';

interface UseWebLNReturn {
  webln: WebLNProvider | null;
  isEnabled: boolean;
  isAvailable: boolean;
  enable: () => Promise<void>;
  sendPayment: (paymentRequest: string) => Promise<{ preimage: string; paymentHash?: string }>;
  error: string | null;
}

export function useWebLN(): UseWebLNReturn {
  const [webln, setWebln] = useState<WebLNProvider | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = typeof window !== 'undefined' && !!window.webln;

  const enable = useCallback(async () => {
    if (!window.webln) {
      throw new Error('WebLN is not available. Please install a WebLN-compatible wallet extension.');
    }

    try {
      await window.webln.enable();
      setWebln(window.webln);
      setIsEnabled(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable WebLN';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const sendPayment = useCallback(async (paymentRequest: string) => {
    if (!webln) {
      throw new Error('WebLN is not enabled');
    }

    try {
      const response = await webln.sendPayment(paymentRequest);
      setError(null);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      throw new Error(message);
    }
  }, [webln]);

  useEffect(() => {
    if (isAvailable && window.webln) {
      setWebln(window.webln);
    }
  }, [isAvailable]);

  return {
    webln,
    isEnabled,
    isAvailable,
    enable,
    sendPayment,
    error,
  };
}