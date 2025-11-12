import type { NostrEvent } from '@nostrify/nostrify';
import type { UniversalSearchResult } from './types';

/**
 * Transform app event (kind 31990) to universal search result
 */
export function transformAppToSearchResult(event: NostrEvent): UniversalSearchResult {
  // Parse app event inline to avoid circular dependencies
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

  const name = metadata.name as string | undefined;
  const about = metadata.about as string | undefined;
  const picture = metadata.picture as string | undefined;
  const website = metadata.website as string | undefined;

  return {
    type: 'app',
    id: event.id,
    name: name || `App ${dTag}`,
    description: about,
    tags,
    pubkey: event.pubkey,
    createdAt: event.created_at,
    app: {
      picture,
      website,
      supportedKinds,
      webHandlers,
    },
    event,
  };
}

/**
 * Transform repository event (kind 30617) to universal search result
 */
export function transformRepoToSearchResult(event: NostrEvent): UniversalSearchResult {
  // Parse repository event inline to avoid circular dependencies
  const tags = event.tags;

  const id = tags.find(([name]) => name === 'd')?.[1] || '';
  const name = tags.find(([name]) => name === 'name')?.[1] || id;
  const description = tags.find(([name]) => name === 'description')?.[1];

  // Collect multiple values for certain tags
  const web = new Set<string>();
  const clone = new Set<string>();
  const maintainers = new Set<string>();
  const repoTags = new Set<string>();

  const isWebURL = (url: string) => {
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  };

  for (const [tagName, ...values] of tags) {
    if (tagName === 'web') {
      values.filter(isWebURL).forEach(value => web.add(value));
    } else if (tagName === 'clone') {
      values.filter(isWebURL).forEach(value => clone.add(value));
    } else if (tagName === 'maintainers') {
      values.forEach(value => maintainers.add(value));
    } else if (tagName === 't') {
      if (values[0]) {
        repoTags.add(values[0]);
      }
    }
  }

  return {
    type: 'repository',
    id: event.id,
    name,
    description,
    tags: [...repoTags],
    pubkey: event.pubkey,
    createdAt: event.created_at,
    repository: {
      cloneUrls: [...clone],
      webUrls: [...web],
      maintainers: [...maintainers],
    },
    event,
  };
}
