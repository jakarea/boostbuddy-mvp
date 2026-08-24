/**
 * Cache Tags Strategy for BoostBuddy MVP
 *
 * Defines consistent cache tags for revalidation across the app.
 * Use these tags with revalidateTag() for fine-grained cache invalidation.
 */

import { revalidateTag } from 'next/cache';

/**
 * Cache tag constants for different data types
 */
export const CacheTags = {
  // User-related data
  USER_CREDITS: 'user-credits',
  USER_PROFILE: 'user-profile',
  USER_NOTIFICATIONS: 'user-notifications',

  // Credits system
  CREDIT_PACKAGES: 'credit-packages',
  CREDIT_TRANSACTIONS: 'credit-transactions',

  // Reviews system
  REVIEW_ORDERS: 'review-orders',
  REVIEW_URLS: 'review-urls',
  REVIEW_PRICING: 'review-pricing',

  // Services & profiles
  SERVICES: 'services',
  PROFILES: 'profiles',
  ORDERS: 'orders',

  // Admin data
  EMPLOYEES: 'employees',
  CLIENTS: 'clients',
  INVOICES: 'invoices',

  // Settings & config
  APP_SETTINGS: 'app-settings',
  TELEGRAM_GROUPS: 'telegram-groups',

  // Dashboard data
  ADMIN_DASHBOARD: 'admin-dashboard',
  CLIENT_DASHBOARD: 'client-dashboard',
  EMPLOYEE_DASHBOARD: 'employee-dashboard',
} as const;

/**
 * Cache tag type
 */
export type CacheTag = typeof CacheTags[keyof typeof CacheTags];

/**
 * Revalidation utilities
 * Note: Next.js 16 requires second argument (cacheLife profile) for revalidateTag
 */
export class CacheRevalidator {
  /**
   * Revalidate a single cache tag
   * @param tag - Cache tag to revalidate
   * @param profile - Cache life profile (default: 'max' for immediate invalidation)
   */
  static revalidate(tag: CacheTag, profile?: 'no-store' | 'short' | 'long' | 'max'): void {
    if (typeof revalidateTag === 'function') {
      revalidateTag(tag);
      console.log(`[CACHE] Revalidated tag: ${tag}${profile ? ` with profile: ${profile}` : ''}`);
    }
  }

  /**
   * Revalidate multiple cache tags
   */
  static revalidateMany(tags: CacheTag[], profile: 'no-store' | 'short' | 'long' | 'max' = 'max'): void {
    tags.forEach(tag => this.revalidate(tag, profile));
  }

  /**
   * Revalidate all user-related caches for a specific user
   */
  static revalidateUser(userId: string): void {
    this.revalidateMany([
      CacheTags.USER_CREDITS,
      CacheTags.USER_NOTIFICATIONS,
      CacheTags.USER_PROFILE,
    ]);
  }

  /**
   * Revalidate after credit operations
   */
  static revalidateCredits(): void {
    this.revalidateMany([
      CacheTags.USER_CREDITS,
      CacheTags.CREDIT_TRANSACTIONS,
      CacheTags.ADMIN_DASHBOARD,
      CacheTags.CLIENT_DASHBOARD,
    ]);
  }

  /**
   * Revalidate after review order changes
   */
  static revalidateReviewOrders(): void {
    this.revalidateMany([
      CacheTags.REVIEW_ORDERS,
      CacheTags.REVIEW_URLS,
      CacheTags.USER_CREDITS,
      CacheTags.ADMIN_DASHBOARD,
      CacheTags.EMPLOYEE_DASHBOARD,
      CacheTags.CLIENT_DASHBOARD,
    ]);
  }

  /**
   * Revalidate after service/profile changes
   */
  static revalidateServices(): void {
    this.revalidateMany([
      CacheTags.SERVICES,
      CacheTags.PROFILES,
      CacheTags.ORDERS,
      CacheTags.ADMIN_DASHBOARD,
      CacheTags.CLIENT_DASHBOARD,
    ]);
  }
}

/**
 * Next.js fetch options for different caching strategies
 */
export const FetchCacheOptions = {
  /**
   * Static data - revalidate every hour
   */
  STATIC: {
    next: {
      revalidate: 3600, // 1 hour
      tags: [] as string[]
    }
  },

  /**
   * Semi-static data - revalidate every 5 minutes
   */
  SEMI_STATIC: {
    next: {
      revalidate: 300, // 5 minutes
      tags: [] as string[]
    }
  },

  /**
   * Dynamic data - no caching
   */
  DYNAMIC: {
    next: {
      revalidate: 0,
      tags: [] as string[]
    }
  },

  /**
   * Short-lived cache - revalidate every minute
   */
  SHORT_LIVED: {
    next: {
      revalidate: 60, // 1 minute
      tags: [] as string[]
    }
  }
} as const;

/**
 * Create fetch options with specific cache tags
 */
export function createFetchOptions(
  cacheStrategy: keyof typeof FetchCacheOptions = 'SEMI_STATIC',
  tags?: CacheTag[]
): Record<string, any> {
  const baseOptions = FetchCacheOptions[cacheStrategy];

  return {
    ...baseOptions.next,
    ...(tags?.length ? { tags } : {})
  };
}

/**
 * Wallet-specific cache utilities
 */
export const WalletCache = {
  /**
   * Get cache key for user wallet
   */
  getKey(userId: string): string {
    return `wallet:${userId}`;
  },

  /**
   * Invalidate wallet cache for user
   */
  invalidate(userId: string): void {
    CacheRevalidator.revalidate(CacheTags.USER_CREDITS);
    console.log(`[WALLET] Invalidated cache for user: ${userId}`);
  }
};
