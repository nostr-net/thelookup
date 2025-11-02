import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Unified search result interface combining apps and repositories
 */
export interface UniversalSearchResult {
  // Common fields
  type: 'app' | 'repository';
  id: string;
  name: string;
  description?: string;
  tags: string[];
  pubkey: string;
  createdAt: number;

  // Type-specific fields
  app?: {
    picture?: string;
    website?: string;
    supportedKinds: number[];
    webHandlers: Array<{
      url: string;
      type?: string;
    }>;
  };

  repository?: {
    cloneUrls: string[];
    webUrls: string[];
    maintainers: string[];
  };

  // Original event for reference
  event: NostrEvent;

  // Search metadata
  relevanceScore?: number;
  matchedFields?: string[];
}

/**
 * Search filter configuration
 */
export interface SearchFilters {
  types: Array<'app' | 'repository'>;
  tags: string[];
  kinds?: number[]; // For apps only
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  author?: string;
}

/**
 * Complete search options
 */
export interface SearchOptions {
  query: string;
  filters: SearchFilters;
  sortBy: 'relevance' | 'date' | 'name';
  limit?: number;
  offset?: number;
}
