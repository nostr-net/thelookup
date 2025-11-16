import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useNipsByKind(kind: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nips-by-kind', kind],
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [{
          kinds: [30817],
          '#k': [kind],
          limit: 200,
        }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!kind,
  });
}