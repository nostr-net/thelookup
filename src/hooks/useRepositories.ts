import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, NostrSigner } from '@nostrify/nostrify';
import { getClientTag } from '@/lib/siteConfig';
import { useEffect, useRef } from 'react';

/**
 * Validates a NIP-34 repository announcement event
 */
function validateRepositoryEvent(event: NostrEvent): boolean {
  // Check if it's a repository announcement kind
  if (event.kind !== 30617) return false;

  // Check for required 'd' tag
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  if (!d) return false;

  // Check for required 'clone' tag
  const clone = event.tags.find(([name]) => name === 'clone')?.[1];
  if (!clone) return false;

  // Validate that 'clone' is a valid URL
  try {
    new URL(clone);
  } catch {
    return false;
  }

  return true;
}

/**
 * Hook to fetch all repository announcements with background batch fetching
 */
export function useRepositories() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const fetchingRef = useRef(false);

  const query = useQuery({
    queryKey: ['repositories'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      // Fetch a larger initial batch to reduce missing events
      const events = await nostr.query([{ kinds: [30617], limit: 500 }], { signal });

      // Filter events through validator to ensure they meet NIP-34 requirements
      return events.filter(validateRepositoryEvent);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Background fetching to get ALL events comprehensively
  useEffect(() => {
    if (!query.data || fetchingRef.current) return;

    fetchingRef.current = true;

    const fetchAllInBackground = async () => {
      try {
        const allEvents: NostrEvent[] = [...query.data];
        const seenIds = new Set(allEvents.map(e => e.id));

        // Strategy 1: Fetch older events
        if (allEvents.length > 0) {
          let oldestTimestamp = Math.min(...allEvents.map(e => e.created_at));
          const BATCH_SIZE = 200;
          let oldBatchCount = 0;
          const MAX_OLD_BATCHES = 15;

          while (oldBatchCount < MAX_OLD_BATCHES) {
            const signal = AbortSignal.timeout(8000);
            const batch = await nostr.query(
              [{ kinds: [30617], until: oldestTimestamp - 1, limit: BATCH_SIZE }],
              { signal }
            );

            if (batch.length === 0) break;

            const newEvents = batch
              .filter(e => !seenIds.has(e.id))
              .filter(validateRepositoryEvent);

            if (newEvents.length === 0) break;

            newEvents.forEach(e => {
              allEvents.push(e);
              seenIds.add(e.id);
            });

            oldestTimestamp = Math.min(...newEvents.map(e => e.created_at));
            oldBatchCount++;

            // Update cache incrementally
            queryClient.setQueryData(['repositories'], [...allEvents]);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Strategy 2: Fetch without time constraints to catch any missed events
        try {
          const signal = AbortSignal.timeout(10000);
          const allBatch = await nostr.query(
            [{ kinds: [30617], limit: 1000 }],
            { signal }
          );

          const missedEvents = allBatch
            .filter(e => !seenIds.has(e.id))
            .filter(validateRepositoryEvent);

          if (missedEvents.length > 0) {
            missedEvents.forEach(e => {
              allEvents.push(e);
              seenIds.add(e.id);
            });

            // Final update with all events
            queryClient.setQueryData(['repositories'], [...allEvents]);
          }
        } catch (err) {
          console.log('Failed to fetch comprehensive batch:', err);
        }

      } catch (error) {
        console.error('Background fetch error:', error);
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchAllInBackground();
  }, [query.data, nostr, queryClient]);

  return query;
}

/**
 * Hook to fetch repositories by a specific author
 */
export function useRepositoriesByAuthor(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['repositories', 'author', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [30617],
        authors: [pubkey],
        limit: 20
      }], { signal });

      return events.filter(validateRepositoryEvent);
    },
    enabled: !!pubkey,
  });
}

/**
 * Hook to fetch a specific repository by naddr
 */
export function useRepository(pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['repository', pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [30617],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      }], { signal });

      const validEvents = events.filter(validateRepositoryEvent);
      return validEvents[0] || null;
    },
    enabled: !!pubkey && !!identifier,
  });
}

/**
 * Hook to create a new issue for a repository
 */
export function useCreateIssue() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      repositoryPubkey: string;
      repositoryId: string;
      subject: string;
      content: string;
      labels?: string[];
      signer: NostrSigner; // The user's signer from useCurrentUser
    }) => {
      const { repositoryPubkey, repositoryId, subject, content, labels = [], signer } = params;

      // Build tags according to NIP-34
      const tags = [
        ['a', `30617:${repositoryPubkey}:${repositoryId}`],
        ['p', repositoryPubkey],
        ['subject', subject],
        ['client', getClientTag()], // Add client tag
      ];

      // Add label tags
      labels.forEach(label => {
        tags.push(['t', label]);
      });

      // Sign the event
      const event = await signer.signEvent({
        kind: 1621,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      // Publish to relays
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });

      return event;
    },
    onSuccess: (_, variables) => {
      // Invalidate repository issues query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['repository-issues', variables.repositoryPubkey, variables.repositoryId],
      });
    },
  });
}

/**
 * Hook to fetch repository state announcements for a specific repository
 */
export function useRepositoryState(pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['repository-state', pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [30618],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      }], { signal });

      return events[0] || null;
    },
    enabled: !!pubkey && !!identifier,
  });
}

/**
 * Hook to fetch patches for a specific repository
 */
export function useRepositoryPatches(pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['repository-patches', pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [1617],
        '#a': [`30617:${pubkey}:${identifier}`],
        limit: 20
      }], { signal });

      return events;
    },
    enabled: !!pubkey && !!identifier,
  });
}

/**
 * Hook to fetch issues for a specific repository
 */
export function useRepositoryIssues(pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['repository-issues', pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [1621],
        '#a': [`30617:${pubkey}:${identifier}`],
        limit: 20
      }], { signal });

      return events;
    },
    enabled: !!pubkey && !!identifier,
  });
}

/**
 * Hook to fetch a specific patch by ID
 */
export function usePatch(patchId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['patch', patchId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [1617],
        ids: [patchId],
        limit: 1
      }], { signal });

      return events[0] || null;
    },
    enabled: !!patchId,
  });
}

/**
 * Hook to fetch patch comments
 */
export function usePatchComments(patchId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['patch-comments', patchId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [1],
        '#e': [patchId],
        limit: 50
      }], { signal });

      return events.sort((a, b) => a.created_at - b.created_at);
    },
    enabled: !!patchId,
  });
}

/**
 * Hook to fetch issue status events for a specific issue
 */
export function useIssueStatusEvents(issueId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['issue-status-events', issueId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [1630, 1631, 1632, 1633], // Open, Resolved, Closed, Draft
        '#e': [issueId],
        limit: 20
      }], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!issueId,
  });
}