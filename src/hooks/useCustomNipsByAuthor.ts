import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useCustomNipsByAuthor(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['custom-nips-by-author', pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        throw new Error('Pubkey is required');
      }

      const events = await nostr.query(
        [{
          kinds: [30817],
          authors: [pubkey],
          limit: 200,
        }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!pubkey,
  });
}