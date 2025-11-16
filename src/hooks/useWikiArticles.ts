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
      // Fetch only 15 initially for instant page load
      const events = await nostr.query([{ kinds: [30818], limit: 15 }], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateWikiArticleEvent);

      // Parse events into wiki article info
      const articles = validEvents.map(parseWikiArticleEvent);

      // Sort by creation date (newest first)
      return articles.sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Background fetching to get ALL events through progressive loading
  useEffect(() => {
    if (!query.data || fetchingRef.current) return;

    fetchingRef.current = true;

    const fetchAllInBackground = async () => {
      try {
        const allArticles: WikiArticleInfo[] = [...query.data];
        const seenIds = new Set(allArticles.map(a => a.id));

        // Progressive fetching strategy: fetch increasingly large batches
        const limits = [1000, 2000, 5000, 10000];

        for (const limit of limits) {
          try {
            console.log(`Fetching wiki articles with limit ${limit}...`);
            const signal = AbortSignal.timeout(20000);

            const batch = await nostr.query(
              [{ kinds: [30818], limit }],
              { signal }
            );

            let newEventCount = 0;
            const newArticles: WikiArticleInfo[] = [];

            batch.forEach(event => {
              if (!seenIds.has(event.id) && validateWikiArticleEvent(event)) {
                const article = parseWikiArticleEvent(event);
                allArticles.push(article);
                newArticles.push(article);
                seenIds.add(event.id);
                newEventCount++;
              }
            });

            console.log(`Found ${newEventCount} new wiki articles in batch of ${batch.length}`);

            // Update cache after each batch
            if (newEventCount > 0) {
              allArticles.sort((a, b) => b.createdAt - a.createdAt);
              queryClient.setQueryData(['wiki-articles'], [...allArticles]);
            }

            // If we got fewer events than the limit, we likely have everything
            if (batch.length < limit * 0.9) {
              console.log(`Got ${batch.length} events with limit ${limit}, stopping`);
              break;
            }

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.log(`Failed to fetch with limit ${limit}:`, err);
          }
        }

        console.log(`Total wiki articles loaded: ${allArticles.length}`);

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
