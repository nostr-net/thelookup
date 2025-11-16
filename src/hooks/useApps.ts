import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useRef } from 'react';

export interface AppInfo {
  id: string;
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  website?: string;
  lud16?: string;
  supportedKinds: number[];
  webHandlers: Array<{
    url: string;
    type?: string;
  }>;
  iosHandlers: string[];
  androidHandlers: string[];
  tags: string[];
  createdAt: number;
  dTag: string;
  event: NostrEvent; // Include the original event for reference
}

function validateAppEvent(event: NostrEvent): boolean {
  // Check if it's the correct kind
  if (event.kind !== 31990) return false;

  // Check for required 'd' tag
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return false;

  // Check for at least one 'k' tag (supported kind)
  const kTags = event.tags.filter(([name]) => name === 'k');
  if (kTags.length === 0) return false;

  return true;
}

function parseAppEvent(event: NostrEvent): AppInfo {
  const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';

  // Parse supported kinds from 'k' tags
  const supportedKinds = event.tags
    .filter(([name]) => name === 'k')
    .map(([, kind]) => parseInt(kind))
    .filter(kind => !isNaN(kind));

  // Parse web handlers
  const webHandlers = event.tags
    .filter(([name]) => name === 'web')
    .map(([, url, type]) => ({ url, type }));

  // Parse iOS handlers
  const iosHandlers = event.tags
    .filter(([name]) => name === 'ios')
    .map(([, url]) => url);

  // Parse Android handlers
  const androidHandlers = event.tags
    .filter(([name]) => name === 'android')
    .map(([, url]) => url);

  // Parse tags from 't' tags
  const tags = event.tags
    .filter(([name]) => name === 't')
    .map(([, tag]) => tag);

  // Parse metadata from content if available
  let metadata: Record<string, unknown> = {};
  try {
    if (event.content) {
      metadata = JSON.parse(event.content) as Record<string, unknown>;
    }
  } catch {
    // If content is not valid JSON, ignore it
  }

  return {
    id: event.id,
    pubkey: event.pubkey,
    name: metadata.name as string | undefined,
    about: metadata.about as string | undefined,
    picture: metadata.picture as string | undefined,
    website: metadata.website as string | undefined,
    lud16: metadata.lud16 as string | undefined,
    supportedKinds,
    webHandlers,
    iosHandlers,
    androidHandlers,
    tags,
    createdAt: event.created_at,
    dTag,
    event,
  };
}

export function useApps() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const fetchingRef = useRef(false);

  const query = useQuery({
    queryKey: ['apps'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [31990], limit: 300 }],
        { signal }
      );

      // Filter and validate events
      const validEvents = events.filter(validateAppEvent);

      // Parse events into app info
      const apps = validEvents.map(parseAppEvent);

      // Sort by creation date (newest first)
      return apps.sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Background fetching to get ALL events comprehensively
  useEffect(() => {
    if (!query.data || fetchingRef.current) return;

    fetchingRef.current = true;

    const fetchAllInBackground = async () => {
      try {
        const allApps: AppInfo[] = [...query.data];
        const seenIds = new Set(allApps.map(a => a.id));

        // Strategy 1: Fetch older events
        if (allApps.length > 0) {
          let oldestTimestamp = Math.min(...allApps.map(a => a.createdAt));
          const BATCH_SIZE = 200;
          let oldBatchCount = 0;
          const MAX_OLD_BATCHES = 15;

          while (oldBatchCount < MAX_OLD_BATCHES) {
            const signal = AbortSignal.timeout(8000);
            const batch = await nostr.query(
              [{ kinds: [31990], until: oldestTimestamp - 1, limit: BATCH_SIZE }],
              { signal }
            );

            if (batch.length === 0) break;

            const newEvents = batch
              .filter(e => !seenIds.has(e.id))
              .filter(validateAppEvent);

            if (newEvents.length === 0) break;

            const newApps = newEvents.map(parseAppEvent);
            newApps.forEach(app => {
              allApps.push(app);
              seenIds.add(app.id);
            });

            oldestTimestamp = Math.min(...newApps.map(a => a.createdAt));
            oldBatchCount++;

            // Sort and update cache
            allApps.sort((a, b) => b.createdAt - a.createdAt);
            queryClient.setQueryData(['apps'], [...allApps]);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Strategy 2: Fetch without time constraints to catch any missed events
        try {
          const signal = AbortSignal.timeout(10000);
          const comprehensiveBatch = await nostr.query(
            [{ kinds: [31990], limit: 1000 }],
            { signal }
          );

          const missedEvents = comprehensiveBatch
            .filter(e => !seenIds.has(e.id))
            .filter(validateAppEvent);

          if (missedEvents.length > 0) {
            const missedApps = missedEvents.map(parseAppEvent);
            missedApps.forEach(app => {
              allApps.push(app);
              seenIds.add(app.id);
            });

            // Final sort and update
            allApps.sort((a, b) => b.createdAt - a.createdAt);
            queryClient.setQueryData(['apps'], [...allApps]);
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

export function useAppsByKind(kind: number) {
  const { data: apps, ...rest } = useApps();
  
  const filteredApps = apps?.filter(app => 
    app.supportedKinds.includes(kind)
  ) || [];

  return {
    data: filteredApps,
    ...rest,
  };
}