/**
 * Cache invalidation utilities
 * Use to clear caches when data changes
 */

/**
 * Cache keys - central registry for all cache keys
 */
export const CACHE_KEYS = {
  // Admin
  ADMIN_DASHBOARD: 'admin_dashboard',
  ADMIN_CLIENTS: 'admin_clients',
  ADMIN_PROFILES: 'admin_profiles',
  ADMIN_ORDERS: 'admin_orders',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  ADMIN_EMPLOYEES: 'admin_employees',
  ADMIN_REVIEWS: 'admin_reviews',
  ADMIN_EMPLOYEE_PERFORMANCE: 'admin_employee_performance',

  // Client
  CLIENT_DASHBOARD: 'client_dashboard',
  CLIENT_BILLING: 'client_billing',
  CLIENT_NOTIFICATIONS: 'client_notifications',
  CLIENT_WALLET: 'client_wallet',
  CLIENT_TRANSACTIONS: 'client_transactions',
  CLIENT_BOXES: 'client_boxes',
  CLIENT_REVIEWS_DASHBOARD: 'client_reviews_dashboard',
  CLIENT_REVIEW_ORDERS: 'client_review_orders',

  // Employee
  EMPLOYEE_DASHBOARD: 'employee_dashboard',
  EMPLOYEE_ORDERS: 'employee_orders',
  EMPLOYEE_NOTIFICATIONS: 'employee_notifications',

  // Configuration (longer cache)
  PAYMENT_RULES: 'payment_rules',
  CREDIT_PACKAGES: 'credit_packages',
  REVIEW_PRICING: 'review_pricing',
  SERVICES_LIST: 'services_list',
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

/**
 * Invalidate specific caches when data changes
 * Call this after mutations
 */
export function invalidateCaches(keys: CacheKey[]): void {
  if (typeof window === 'undefined') return;

  keys.forEach(key => {
    // Clear SWR memory cache
    const { clearSWRCache } = require('./swr');
    clearSWRCache(key);

    // Clear localStorage cache
    const { clearCache } = require('./localCache');
    clearCache(key);

    // Dispatch custom event for cross-tab sync
    window.dispatchEvent(new CustomEvent('cache-invalidate', { detail: { key } }));
  });
}

/**
 * Listen for cache invalidation from other tabs
 */
export function listenToInvalidations(callback: (key: string) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ key: string }>;
    callback(customEvent.detail.key);
  };

  window.addEventListener('cache-invalidate', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('cache-invalidate', handler);
  };
}
