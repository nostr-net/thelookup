import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useOfficialNips } from './useOfficialNips';
import type { NostrEvent } from '@/types/nostr';
import type { OfficialNip } from './useOfficialNips';

export interface NipResult {
  type: 'official' | 'custom';
  data: OfficialNip | NostrEvent;
  sortKey: number; // For unified sorting
}

export function useAllNipsByKind(kind: string) {
  const { nostr } = useNostr();
  const { data: officialNips, isLoading: isLoadingOfficial, error: officialError } = useOfficialNips();

  const customNipsQuery = useQuery({
    queryKey: ['custom-nips-by-kind', kind],
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

  const combinedQuery = useQuery({
    queryKey: ['all-nips-by-kind', kind, officialNips?.length, customNipsQuery.data?.length],
    queryFn: async () => {
      const results: NipResult[] = [];

      // Add official NIPs that have the specified kind
      if (officialNips) {
        const matchingOfficialNips = officialNips.filter(nip => 
          nip.eventKinds?.some(eventKind => eventKind.kind === kind)
        );

        for (const nip of matchingOfficialNips) {
          results.push({
            type: 'official',
            data: nip,
            sortKey: parseInt(nip.number, 16) || 0, // Convert hex to number for sorting, fallback to 0
          });
        }
      }

      // Add custom NIPs
      if (customNipsQuery.data) {
        for (const event of customNipsQuery.data) {
          results.push({
            type: 'custom',
            data: event,
            sortKey: event.created_at, // Use creation timestamp for custom NIPs
          });
        }
      }

      // Sort: Official NIPs first (by number), then custom NIPs (by creation date, newest first)
      return results.sort((a, b) => {
        if (a.type === 'official' && b.type === 'custom') return -1;
        if (a.type === 'custom' && b.type === 'official') return 1;
        
        if (a.type === 'official' && b.type === 'official') {
          return a.sortKey - b.sortKey; // Official NIPs by number (ascending)
        }
        
        return b.sortKey - a.sortKey; // Custom NIPs by creation date (descending)
      });
    },
    enabled: !!kind && (!!officialNips || !!customNipsQuery.data),
  });

  return {
    data: combinedQuery.data,
    isLoading: isLoadingOfficial || customNipsQuery.isLoading || combinedQuery.isLoading,
    error: officialError || customNipsQuery.error || combinedQuery.error,
  };
}