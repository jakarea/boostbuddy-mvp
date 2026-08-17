/**
 * SWR (Stale-While-Revalidate) Hook
 *
 * Shows cached data immediately, then refreshes in background if stale.
 * Perfect for: Dashboard stats, lists, configurations
 *
 * @param key - Unique cache key
 * @param fetcher - Function to fetch fresh data
 * @param ttl - Time to live in milliseconds (default: 2 minutes)
 * @param initialData - Initial data from server (optional)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface SWRResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isValid: boolean;
  lastFetch: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function useSWR<T>({
  key,
  fetcher,
  ttl = 2 * 60 * 1000, // 2 minutes default
  initialData = null,
  enabled = true,
}: {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  initialData?: T | null;
  enabled?: boolean;
}): SWRResult<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(0);

  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current || !enabled) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const freshData = await fetcher();

      // Update memory cache
      memoryCache.set(key, {
        data: freshData,
        timestamp: Date.now(),
      });

      setData(freshData);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
      // Don't clear data on error - preserve existing data
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [key, fetcher, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    const cached = memoryCache.get(key);

    // Use cached data if available
    if (cached && !initialData) {
      setData(cached.data);
      setLastFetch(cached.timestamp);
    }

    // Check if refresh needed (stale data)
    const shouldRefresh = !cached || (now - cached.timestamp) > ttl;

    if (shouldRefresh && !isFetchingRef.current) {
      refresh();
    }
  }, [key, ttl, refresh, initialData, enabled]);

  const isValid = lastFetch ? (Date.now() - lastFetch) < ttl : false;

  return {
    data,
    loading,
    error,
    refresh,
    isValid,
    lastFetch,
  };
}

/**
 * Clear specific cache entry
 */
export function clearSWRCache(key: string): void {
  memoryCache.delete(key);
}

/**
 * Clear all SWR cache entries
 */
export function clearAllSWRCache(): void {
  memoryCache.clear();
}

/**
 * Preload cache data (useful for server hydration)
 */
export function preloadSWRData<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}
