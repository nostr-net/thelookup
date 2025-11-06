import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { AppInfo } from '@/hooks/useApps';

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

export function useApp(naddr: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['app', naddr],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Decode the naddr
        const decoded = nip19.decode(naddr);
        if (decoded.type !== 'naddr') {
          throw new Error('Invalid naddr format');
        }

        const naddrData = decoded.data;
        if (naddrData.kind !== 31990) {
          throw new Error('Not an app event');
        }

        // Query for the specific app
        const events = await nostr.query(
          [{
            kinds: [naddrData.kind],
            authors: [naddrData.pubkey],
            '#d': [naddrData.identifier],
          }],
          { signal }
        );

        if (events.length === 0) {
          return null;
        }

        // Get the most recent event (in case there are multiple)
        const event = events.sort((a, b) => b.created_at - a.created_at)[0];

        if (!validateAppEvent(event)) {
          throw new Error('Invalid app event');
        }

        return parseAppEvent(event);
      } catch (error) {
        console.error('Error fetching app:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}