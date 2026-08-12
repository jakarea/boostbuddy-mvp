/**
 * Cached server action wrappers
 * Wraps server actions with caching logic
 */

import { cache } from 'react';

/**
 * Cache duration constants
 */
export const CACHE_TTL = {
  MINUTE_1: 60 * 1000,
  MINUTE_2: 2 * 60 * 1000,
  MINUTE_5: 5 * 60 * 1000,
  MINUTE_10: 10 * 60 * 1000,
  MINUTE_30: 30 * 60 * 1000,
  HOUR_1: 60 * 60 * 1000,
  HOUR_6: 6 * 60 * 60 * 1000,
  HOUR_12: 12 * 60 * 60 * 1000,
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

/**
 * Create a cached version of a server action
 * Use for: Lists, stats, configurations
 *
 * @param actionFn - The server action to cache
 * @param ttl - Time to live in milliseconds
 */
export function createCachedAction<T>(
  actionFn: () => Promise<T>,
  ttl: number
) {
  const cachedAction = cache(async () => {
    return actionFn();
  });

  return cachedAction;
}

/**
 * Invalidate cache for a specific action
 * Call this after mutations
 */
export function invalidateAction(key: string): void {
  // This will be called from client components
  if (typeof window !== 'undefined') {
    const { clearCache } = require('@/lib/cache/localCache');
    clearCache(key);
  }
}
