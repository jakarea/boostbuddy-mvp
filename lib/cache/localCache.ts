/**
 * LocalStorage Cache Manager for Non-Sensitive Data
 * Use for: Payment rules, pricing, packages, configurations
 * DO NOT use for: User-specific data, financial data, auth tokens
 */

import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'bb_cache_';
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes in ms

export type CachedData<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

/**
 * Set cached data in localStorage
 */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  if (typeof window === 'undefined') return;

  const cacheItem: CachedData<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };

  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn(`Failed to cache ${key}:`, error);
  }
}

/**
 * Get cached data from localStorage
 * Returns null if expired or not found
 */
export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const cacheItem: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - cacheItem.timestamp;

    // Check if expired
    if (age > cacheItem.ttl) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.warn(`Failed to retrieve cache ${key}:`, error);
    return null;
  }
}

/**
 * Clear specific cache
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn(`Failed to clear cache ${key}:`, error);
  }
}

/**
 * Clear all BoostBuddy caches
 */
export function clearAllCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear caches:', error);
  }
}

/**
 * Hook for cached data fetching with automatic cache invalidation
 * Usage: const { data, loading } = useCachedFetch('payment_rules', fetchPaymentRules, 3600000)
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL
): { data: T | null; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(() => getCache<T>(key));
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const freshData = await fetcher();
      setData(freshData);
      setCache(key, freshData, ttlMs);
    } catch (error) {
      console.error(`Failed to fetch ${key}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check cache first
    const cached = getCache<T>(key);
    if (cached) {
      setData(cached);
    } else {
      refresh();
    }
  }, [key]);

  return { data, loading, refresh };
}
