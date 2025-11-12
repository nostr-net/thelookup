import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppConfig } from './AppProvider';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, availableRelays } = useAppConfig();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);
  const available = useRef(availableRelays);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    available.current = availableRelays;
    queryClient.resetQueries();
  }, [config.relayUrl, availableRelays, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Check if this is a profile query (kind 0)
        const isProfileQuery = filters.some(filter => 
          filter.kinds?.includes(0) && filter.authors && filter.authors.length > 0
        );

        if (isProfileQuery) {
          // Query multiple relays for profiles to improve discovery
          const profileRelays = [
            relayUrl.current,
            'wss://relay.nostr.band',
            'wss://relay.damus.io',
            'wss://nos.lol',
          ];
          return new Map(profileRelays.map(url => [url, filters]));
        }

        // For all other queries, use only the selected relay
        return new Map([[relayUrl.current, filters]]);
      },
      eventRouter(_event: NostrEvent) {
        // Send events only to the currently selected relay
        return [relayUrl.current];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;