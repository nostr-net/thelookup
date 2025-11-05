import { useContext } from 'react';
import { createContext } from 'react';
import { useNWCInternal } from './useNWC';

type NWCContextType = ReturnType<typeof useNWCInternal>;

export const NWCContext = createContext<NWCContextType | null>(null);

export function useNWC(): NWCContextType {
  const context = useContext(NWCContext);
  if (!context) {
    // Provide a safe fallback in tests or environments without provider
    return {
      connections: [],
      activeConnection: null,
      connectionInfo: {},
      addConnection: async () => false,
      removeConnection: () => {},
      setActiveConnection: () => {},
      getActiveConnection: () => null,
      sendPayment: async () => {
        throw new Error('NWC not configured');
      },
    } as unknown as NWCContextType;
  }
  return context;
}
