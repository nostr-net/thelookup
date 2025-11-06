import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
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

export function useAppsByAuthor(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['apps-by-author', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query(
        [{ kinds: [31990], authors: [pubkey], limit: 100 }],
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
}