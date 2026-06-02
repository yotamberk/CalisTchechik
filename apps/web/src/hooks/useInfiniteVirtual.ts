import { useRef, useEffect } from 'react';
import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Paginated<T> {
  items: T[];
  total: number;
  nextOffset: number | null;
}

interface UseInfiniteVirtualOptions<T> {
  queryKey: QueryKey;
  fetchPage: (offset: number) => Promise<Paginated<T>>;
  pageSize?: number;
  estimateSize?: number;
  overscan?: number;
}

/**
 * Combines useInfiniteQuery with useVirtualizer.
 * Returns a scrollRef to attach to the scroll container, plus virtualizer rows.
 * Automatically fetches the next page when the user scrolls near the bottom.
 */
export function useInfiniteVirtual<T>({
  queryKey,
  fetchPage,
  pageSize = 20,
  estimateSize = 72,
  overscan = 5,
}: UseInfiniteVirtualOptions<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery<Paginated<T>, Error, InfiniteData<Paginated<T>>, QueryKey, number>({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });

  const allItems = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const hasMore = allItems.length < total;

  const virtualizer = useVirtualizer({
    count: hasMore ? allItems.length + 1 : allItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Fetch next page when the sentinel (last virtual item) comes into view
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= allItems.length - 1 && hasMore && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [virtualItems, allItems.length, hasMore, query.isFetchingNextPage, query.fetchNextPage]);

  return {
    scrollRef,
    virtualizer,
    virtualItems,
    allItems,
    total,
    hasMore,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
