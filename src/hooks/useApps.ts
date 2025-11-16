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

  // Background fetching to get ALL events without any time filtering
  useEffect(() => {
    if (!query.data || fetchingRef.current) return;

    fetchingRef.current = true;

    const fetchAllInBackground = async () => {
      try {
        const allApps: AppInfo[] = [...query.data];
        const seenIds = new Set(allApps.map(a => a.id));

        // Fetch ALL apps without ANY time constraints
        try {
          console.log('Fetching all apps without time filtering...');
          const signal = AbortSignal.timeout(15000);

          const comprehensiveBatch = await nostr.query(
            [{ kinds: [31990], limit: 2000 }],
            { signal }
          );

          const newEvents = comprehensiveBatch
            .filter(e => !seenIds.has(e.id))
            .filter(validateAppEvent);

          if (newEvents.length > 0) {
            console.log(`Found ${newEvents.length} additional apps`);
            const newApps = newEvents.map(parseAppEvent);
            newApps.forEach(app => {
              allApps.push(app);
              seenIds.add(app.id);
            });

            // Sort and update
            allApps.sort((a, b) => b.createdAt - a.createdAt);
            queryClient.setQueryData(['apps'], [...allApps]);
          }

          console.log(`Total apps loaded: ${allApps.length}`);
        } catch (err) {
          console.log('Failed to fetch all apps:', err);
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