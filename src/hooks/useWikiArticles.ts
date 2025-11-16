import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useRef } from 'react';

export interface WikiArticleInfo {
  id: string;
  pubkey: string;
  title?: string;
  summary?: string;
  image?: string;
  tags: string[];
  createdAt: number;
  dTag: string;
  event: NostrEvent;
}

/**
 * Validates a NIP-54 wiki article event
 */
function validateWikiArticleEvent(event: NostrEvent): boolean {
  // Check if it's a wiki article kind
  if (event.kind !== 30818) return false;

  // Check for required 'd' tag
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  if (!d) return false;

  return true;
}

/**
 * Parses a wiki article event into structured info
 */
function parseWikiArticleEvent(event: NostrEvent): WikiArticleInfo {
  const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';

  // Parse title from 'title' tag or 'name' tag
  const title = event.tags.find(([name]) => name === 'title')?.[1] ||
                event.tags.find(([name]) => name === 'name')?.[1];

  // Parse summary from 'summary' tag
  const summary = event.tags.find(([name]) => name === 'summary')?.[1];

  // Parse image from 'image' tag
  const image = event.tags.find(([name]) => name === 'image')?.[1];

  // Parse tags from 't' tags
  const tags = event.tags
    .filter(([name]) => name === 't')
    .map(([, tag]) => tag);

  return {
    id: event.id,
    pubkey: event.pubkey,
    title,
    summary,
    image,
    tags,
    createdAt: event.created_at,
    dTag,
    event,
  };
}

/**
 * Hook to fetch all wiki articles with background batch fetching
 */
export function useWikiArticles() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const fetchingRef = useRef(false);

  const query = useQuery({
    queryKey: ['wiki-articles'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{ kinds: [30818], limit: 100 }], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateWikiArticleEvent);

      // Parse events into wiki article info
      const articles = validEvents.map(parseWikiArticleEvent);

      // Sort by creation date (newest first)
      return articles.sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Background fetching to get all events
  useEffect(() => {
    if (!query.data || query.data.length === 0 || fetchingRef.current) return;

    fetchingRef.current = true;

    const fetchAllInBackground = async () => {
      try {
        const allArticles: WikiArticleInfo[] = [...query.data];
        let oldestTimestamp = Math.min(...allArticles.map(a => a.createdAt));
        const BATCH_SIZE = 100;
        const MAX_BATCHES = 20; // Limit to prevent infinite loops
        let batchCount = 0;

        while (batchCount < MAX_BATCHES) {
          const signal = AbortSignal.timeout(5000);
          const batch = await nostr.query(
            [{ kinds: [30818], until: oldestTimestamp, limit: BATCH_SIZE }],
            { signal }
          );

          if (batch.length === 0) break;

          // Filter out duplicates and validate
          const newEvents = batch
            .filter(e => !allArticles.some(existing => existing.id === e.id))
            .filter(validateWikiArticleEvent);

          if (newEvents.length === 0) break;

          const newArticles = newEvents.map(parseWikiArticleEvent);
          allArticles.push(...newArticles);
          oldestTimestamp = Math.min(...newArticles.map(a => a.createdAt));
          batchCount++;

          // Sort and update cache
          allArticles.sort((a, b) => b.createdAt - a.createdAt);
          queryClient.setQueryData(['wiki-articles'], allArticles);

          // Small delay between batches to avoid overwhelming the relay
          await new Promise(resolve => setTimeout(resolve, 100));
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
 * Hook to fetch wiki articles by tag
 */
export function useWikiArticlesByTag(tag: string) {
  const { data: articles, ...rest } = useWikiArticles();

  const filteredArticles = articles?.filter(article =>
    article.tags.includes(tag)
  ) || [];

  return {
    data: filteredArticles,
    ...rest,
  };
}

/**
 * Hook to fetch a specific wiki article
 */
export function useWikiArticle(pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['wiki-article', pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [30818],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      }], { signal });

      const validEvents = events.filter(validateWikiArticleEvent);
      const event = validEvents[0];
      return event ? parseWikiArticleEvent(event) : null;
    },
    enabled: !!pubkey && !!identifier,
  });
}
