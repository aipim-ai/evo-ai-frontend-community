import { useCallback, useEffect, useRef, useState } from 'react';
import { contactHistoryService } from '@/services/contacts';
import type {
  PriorityContact,
  PriorityCounts,
  PriorityGroup,
  PrioritySort,
} from '@/types/contacts';

const PAGE_SIZE = 25;
const EMPTY_COUNTS: PriorityCounts = { all: 0, overdue: 0, today: 0, cooling: 0, ok: 0 };

interface UsePriorityContactsParams {
  search: string;
  group: PriorityGroup | 'all';
  sort: PrioritySort;
}

// "Today" ends at the viewer's midnight, so the server needs the browser zone.
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function usePriorityContacts({ search, group, sort }: UsePriorityContactsParams) {
  const [contacts, setContacts] = useState<PriorityContact[]>([]);
  const [counts, setCounts] = useState<PriorityCounts>(EMPTY_COUNTS);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const response = await contactHistoryService.listPriority(
        {
          q: search.trim() || undefined,
          group: group === 'all' ? undefined : group,
          sort,
          timezone: timezone(),
          page: nextPage,
          per_page: PAGE_SIZE,
        },
        { signal: controller.signal },
      );
      setCounts(response.meta?.counts ?? EMPTY_COUNTS);
      setHasMore(!!response.meta?.pagination?.has_next_page);
      setPage(nextPage);
      return response.data ?? [];
    },
    [search, group, sort],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setContacts(await fetchPage(1));
      setLoading(false);
    } catch (err) {
      // A newer request replaced this one; it owns the loading state now.
      if ((err as { name?: string })?.name === 'CanceledError') return;
      console.error('Error loading priority contacts:', err);
      setError(true);
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const more = await fetchPage(page + 1);
      setContacts(prev => [...prev, ...more]);
    } catch (err) {
      console.error('Error loading more priority contacts:', err);
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, page]);

  useEffect(() => {
    void reload();
    return () => controllerRef.current?.abort();
  }, [reload]);

  return { contacts, counts, hasMore, loading, loadingMore, error, reload, loadMore };
}
