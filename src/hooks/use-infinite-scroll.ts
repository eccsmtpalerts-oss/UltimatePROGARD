import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

interface UseInfiniteScrollOptions {
  queryKey: string[];
  fetchFunction: (page: number, limit: number) => Promise<{ data: unknown[]; total: number }>;
  initialLimit?: number;
  preloadLimit?: number;
  enabled?: boolean;
}

export function useInfiniteScroll({
  queryKey,
  fetchFunction,
  initialLimit = 20,
  preloadLimit = 10,
  enabled = true
}: UseInfiniteScrollOptions) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => fetchFunction(pageParam, initialLimit),
    getNextPageParam: (lastPage, pages) => {
      // Check if there are more pages
      const totalLoaded = pages.reduce((acc, page) => acc + page.data.length, 0);
      return totalLoaded < lastPage.total ? pages.length + 1 : undefined;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Flatten the data
  const items = data?.pages.flatMap(page => page.data) || [];
  const total = data?.pages[0]?.total || 0;

  // Preload next page when we're close to the end
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && items.length > 0) {
      const remainingItems = total - items.length;
      if (remainingItems <= preloadLimit) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, items.length, total, preloadLimit, fetchNextPage]);

  return {
    items,
    total,
    error,
    isLoading: status === 'pending',
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    loadMore: fetchNextPage,
  };
}

// Hook for triggering load when element comes into view
export function useLoadMoreTrigger() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before the element is visible
  });

  return { ref, inView };
}