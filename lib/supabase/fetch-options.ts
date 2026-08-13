/**
 * Next.js Fetch Options Integration for Supabase
 *
 * Provides utilities to add Next.js caching behavior to Supabase queries.
 */

import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

/**
 * Cache life profiles for Next.js 16
 */
export type CacheLife = 'no-store' | 'short' | 'long' | 'max';

/**
 * Cache duration mappings (in seconds)
 */
export const CacheDurations = {
  NO_STORE: 0,      // No caching
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  MAX: 86400,       // 24 hours
} as const;

/**
 * Add Next.js fetch options to a Supabase query
 *
 * @param queryBuilder - Supabase query builder
 * @param options - Cache options
 * @returns Query builder with cache headers
 */
export function withCacheOptions(
  queryBuilder: any,
  options: {
    revalidate?: number;      // Revalidation time in seconds
    tags?: string[];          // Cache tags for invalidation
  } = {}
): any {
  const { revalidate = 60, tags } = options;

  // Supabase doesn't directly support Next.js fetch options,
  // but we can add them via the query builder
  if (tags && tags.length > 0) {
    queryBuilder = queryBuilder.headers({
      'Cache-Tag': tags.join(',')
    });
  }

  return queryBuilder;
}

/**
 * Create a cached version of a Supabase query function
 *
 * @param queryFn - Function that executes the Supabase query
 * @param options - Cache options
 * @returns Cached query function
 */
export function createCachedQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    revalidate?: number;
    tags?: string[];
    keyParts?: string[];
  } = {}
): () => Promise<T> {
  const { revalidate = 60, tags, keyParts } = options;

  // Generate cache key from function name and tags
  const cacheKey = [
    'supabase-query',
    ...(keyParts || []),
    ...(tags || [])
  ].join(':');

  return unstable_cache(
    queryFn,
    [cacheKey],
    {
      revalidate,
      tags: tags || []
    }
  );
}

/**
 * Query builders with common caching strategies
 */
export const CachedQueries = {
  /**
   * Static data that rarely changes (services, pricing, etc.)
   * Cache: 1 hour
   */
  static: (queryFn: () => Promise<any>, tags: string[] = []) => {
    return createCachedQuery(queryFn, {
      revalidate: CacheDurations.LONG,
      tags
    });
  },

  /**
   * Semi-static data (user profiles, settings, etc.)
   * Cache: 5 minutes
   */
  semiStatic: (queryFn: () => Promise<any>, tags: string[] = []) => {
    return createCachedQuery(queryFn, {
      revalidate: CacheDurations.MEDIUM,
      tags
    });
  },

  /**
   * Dynamic data that changes frequently
   * Cache: 1 minute
   */
  dynamic: (queryFn: () => Promise<any>, tags: string[] = []) => {
    return createCachedQuery(queryFn, {
      revalidate: CacheDurations.SHORT,
      tags
    });
  },

  /**
   * Real-time data (no caching)
   */
  realtime: (queryFn: () => Promise<any>) => {
    return queryFn;
  }
};

/**
 * Helper to get cached credit packages
 */
export async function getCachedCreditPackages(tags: string[] = ['credit-packages']) {
  const supabase = await createClient();

  return CachedQueries.semiStatic(
    async () => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("id, name, description, price, credits_amount, is_active, created_at")
        .eq("is_active", true)
        .order("credits_amount", { ascending: true });

      if (error) throw error;

      return data?.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price,
        creditsAmount: typeof pkg.credits_amount === 'string' ? parseInt(pkg.credits_amount) : pkg.credits_amount,
        isActive: pkg.is_active,
        createdAt: pkg.created_at || new Date().toISOString()
      })) || [];
    },
    tags
  )();
}

/**
 * Helper to get cached services
 */
export async function getCachedServices(tags: string[] = ['services']) {
  const supabase = await createClient();

  return CachedQueries.static(
    async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    tags
  )();
}
