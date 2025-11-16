import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useMemo } from 'react';
import { transformAppToSearchResult, transformRepoToSearchResult } from '@/lib/search/transformers';
import { rankResults, applyFilters, sortResults } from '@/lib/search/ranking';
import type { SearchOptions, UniversalSearchResult } from '@/lib/search/types';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validate app event (kind 31990)
 */
function validateAppEvent(event: NostrEvent): boolean {
  if (event.kind !== 31990) return false;
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return false;
  const kTags = event.tags.filter(([name]) => name === 'k');
  if (kTags.length === 0) return false;
  return true;
}

/**
 * Validate repository event (kind 30617)
 */
function validateRepositoryEvent(event: NostrEvent): boolean {
  if (event.kind !== 30617) return false;
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  if (!d) return false;
  const clone = event.tags.find(([name]) => name === 'clone')?.[1];
  if (!clone) return false;
  try {
    new URL(clone);
  } catch {
    return false;
  }
  return true;
}

/**
 * Main universal search hook
 * Searches across apps and repositories with filtering and ranking
 */
export function useUniversalSearch(options: SearchOptions) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['universal-search', options],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Build queries based on selected types
      const queries: Promise<NostrEvent[]>[] = [];

      if (options.filters.types.includes('app')) {
        queries.push(nostr.query([{ kinds: [31990], limit: 500 }], { signal }));
      }

      if (options.filters.types.includes('repository')) {
        // Fetch more to ensure we get all repos including those with future timestamps
        queries.push(nostr.query([{ kinds: [30617], limit: 1000 }], { signal }));
      }

      // If no types selected, return empty
      if (queries.length === 0) {
        return [];
      }

      // Parallel fetch
      const results = await Promise.all(queries);

      // Separate and validate events
      const appEvents: NostrEvent[] = [];
      const repoEvents: NostrEvent[] = [];

      results.forEach((events, index) => {
        if (options.filters.types[index] === 'app') {
          appEvents.push(...events.filter(validateAppEvent));
        } else if (options.filters.types[index] === 'repository') {
          repoEvents.push(...events.filter(validateRepositoryEvent));
        }
      });

      // Transform to unified format
      const searchResults: UniversalSearchResult[] = [
        ...appEvents.map(transformAppToSearchResult),
        ...repoEvents.map(transformRepoToSearchResult),
      ];

      // Apply filters
      let filtered = applyFilters(searchResults, options.filters);

      // Apply ranking if there's a query
      if (options.query && options.query.trim() !== '') {
        filtered = rankResults(filtered, options.query);
        // Hide non-matching results when a query is present
        filtered = filtered.filter((r) => (r.relevanceScore || 0) > 0);
      }

      // Apply sorting
      filtered = sortResults(filtered, options.sortBy);

      // Return all results without pagination limits
      return filtered;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get all available tags across apps and repositories
 * Useful for populating filter options
 */
export function useAllSearchTags() {
  const { nostr } = useNostr();

  const { data: allResults } = useQuery({
    queryKey: ['all-search-tags'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Fetch both apps and repos
      const [appEvents, repoEvents] = await Promise.all([
        nostr.query([{ kinds: [31990], limit: 100 }], { signal }),
        nostr.query([{ kinds: [30617], limit: 100 }], { signal }),
      ]);

      // Validate and transform
      const validApps = appEvents.filter(validateAppEvent);
      const validRepos = repoEvents.filter(validateRepositoryEvent);

      const results = [
        ...validApps.map(transformAppToSearchResult),
        ...validRepos.map(transformRepoToSearchResult),
      ];

      return results;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return useMemo(() => {
    if (!allResults) return [];
    const tags = new Set<string>();
    allResults.forEach(result => {
      result.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [allResults]);
}

/**
 * Hook to get statistics about search results
 */
export function useSearchStats(results?: UniversalSearchResult[]) {
  return useMemo(() => {
    if (!results) {
      return {
        total: 0,
        apps: 0,
        repositories: 0,
        tags: [],
      };
    }

    const stats = {
      total: results.length,
      apps: results.filter(r => r.type === 'app').length,
      repositories: results.filter(r => r.type === 'repository').length,
      tags: Array.from(new Set(results.flatMap(r => r.tags))).sort(),
    };

    return stats;
  }, [results]);
}
