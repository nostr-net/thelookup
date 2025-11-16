import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** Total number of items available */
  totalItems: number;
  /** Initial number of items to display */
  initialItems?: number;
  /** Number of items to load per batch */
  itemsPerBatch?: number;
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string;
}

/**
 * Hook to manage infinite scroll pagination for already-loaded data
 * This is optimized for smooth scrolling with data that's already in memory
 */
export function useInfiniteScroll({
  totalItems,
  initialItems = 20,
  itemsPerBatch = 20,
  rootMargin = '100px',
}: UseInfiniteScrollOptions) {
  const [displayCount, setDisplayCount] = useState(initialItems);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Calculate if there are more items to show
  const hasMore = displayCount < totalItems;

  // Load more items
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount(prev => Math.min(prev + itemsPerBatch, totalItems));
    }
  }, [hasMore, itemsPerBatch, totalItems]);

  // Set up intersection observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [loadMore, hasMore, rootMargin]);

  // Reset display count when total items change significantly
  useEffect(() => {
    if (totalItems < displayCount) {
      setDisplayCount(Math.min(initialItems, totalItems));
    }
  }, [totalItems, displayCount, initialItems]);

  return {
    /** Number of items to display */
    displayCount,
    /** Whether there are more items to load */
    hasMore,
    /** Ref to attach to the sentinel element that triggers loading */
    observerTarget,
    /** Manually trigger loading more items */
    loadMore,
  };
}
