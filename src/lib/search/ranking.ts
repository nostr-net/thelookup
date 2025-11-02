import type { UniversalSearchResult } from './types';

/**
 * Rank search results by relevance to the query
 * Returns results sorted by relevance score (highest first)
 */
export function rankResults(
  results: UniversalSearchResult[],
  query: string
): UniversalSearchResult[] {
  if (!query || query.trim() === '') {
    return results;
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

  return results
    .map(result => {
      let score = 0;
      const matchedFields: string[] = [];

      const nameLower = result.name?.toLowerCase() || '';
      const descriptionLower = result.description?.toLowerCase() || '';

      // Name matches (highest weight)
      if (nameLower.includes(queryLower)) {
        score += 10;
        matchedFields.push('name');

        // Exact match bonus
        if (nameLower === queryLower) {
          score += 5;
        }

        // Starts with query bonus
        if (nameLower.startsWith(queryLower)) {
          score += 3;
        }
      }

      // Description matches (medium weight)
      if (descriptionLower && descriptionLower.includes(queryLower)) {
        score += 5;
        matchedFields.push('description');
      }

      // Tag matches (lower weight)
      result.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes(queryLower)) {
          score += 3;
          if (!matchedFields.includes('tag')) {
            matchedFields.push('tag');
          }
        }
        // Exact tag match bonus
        if (tagLower === queryLower) {
          score += 2;
        }
      });

      // Word-by-word matching for partial matches
      queryWords.forEach(word => {
        if (word.length < 2) return; // Skip very short words

        if (nameLower.includes(word)) {
          score += 2;
        }
        if (descriptionLower && descriptionLower.includes(word)) {
          score += 1;
        }
      });

      // Type-specific bonuses
      if (result.type === 'app') {
        // Apps with website are more complete
        if (result.app?.website) {
          score += 1;
        }
        // Apps with picture are more complete
        if (result.app?.picture) {
          score += 1;
        }
        // Apps supporting more kinds might be more useful
        if (result.app?.supportedKinds && result.app.supportedKinds.length > 0) {
          score += Math.min(result.app.supportedKinds.length * 0.1, 2);
        }
      }

      if (result.type === 'repository') {
        // Repositories with maintainers are more active
        if (result.repository?.maintainers?.length) {
          score += Math.min(result.repository.maintainers.length * 0.5, 3);
        }
        // Repositories with web URLs are more accessible
        if (result.repository?.webUrls?.length) {
          score += 1;
        }
      }

      // Recency bonus (newer items get slight boost)
      const ageInDays = (Date.now() / 1000 - result.createdAt) / (60 * 60 * 24);
      if (ageInDays < 7) {
        score += 2;
      } else if (ageInDays < 30) {
        score += 1;
      }

      return {
        ...result,
        relevanceScore: score,
        matchedFields: matchedFields.length > 0 ? matchedFields : undefined,
      };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Filter results based on filters
 */
export function applyFilters(
  results: UniversalSearchResult[],
  filters: {
    types?: Array<'app' | 'repository'>;
    tags?: string[];
    kinds?: number[];
    dateRange?: { from?: Date; to?: Date };
    author?: string;
  }
): UniversalSearchResult[] {
  let filtered = results;

  // Filter by type
  if (filters.types && filters.types.length > 0 && filters.types.length < 2) {
    filtered = filtered.filter(result => filters.types!.includes(result.type));
  }

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(result =>
      filters.tags!.some(tag => result.tags.includes(tag))
    );
  }

  // Filter by kinds (apps only)
  if (filters.kinds && filters.kinds.length > 0) {
    filtered = filtered.filter(result => {
      if (result.type !== 'app') return false;
      return filters.kinds!.some(kind =>
        result.app?.supportedKinds.includes(kind)
      );
    });
  }

  // Filter by date range
  if (filters.dateRange) {
    const { from, to } = filters.dateRange;
    filtered = filtered.filter(result => {
      const resultDate = result.createdAt * 1000; // Convert to milliseconds
      if (from && resultDate < from.getTime()) return false;
      if (to && resultDate > to.getTime()) return false;
      return true;
    });
  }

  // Filter by author
  if (filters.author) {
    filtered = filtered.filter(result =>
      result.pubkey === filters.author
    );
  }

  return filtered;
}

/**
 * Sort results by specified criteria
 */
export function sortResults(
  results: UniversalSearchResult[],
  sortBy: 'relevance' | 'date' | 'name'
): UniversalSearchResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'relevance':
      // Already sorted by relevance if rankResults was called
      return sorted.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    case 'date':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);

    case 'name':
      return sorted.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });

    default:
      return sorted;
  }
}
