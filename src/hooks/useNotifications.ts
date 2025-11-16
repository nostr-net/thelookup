import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user?.pubkey) {
        throw new Error('User not logged in');
      }

      const events = await nostr.query(
        [
          // Reactions and comments on user's NIPs
          {
            kinds: [7, 1111],
            '#k': ['30817'],
            '#p': [user.pubkey],
            limit: 500,
          },
          // Fork notifications - custom NIPs that tag the user
          {
            kinds: [30817],
            '#p': [user.pubkey],
            limit: 200,
          }
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      // Filter out events created by the current user (self-notifications)
      const filteredEvents = events.filter(event => event.pubkey !== user.pubkey);

      // Sort by creation time (newest first)
      return filteredEvents.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}