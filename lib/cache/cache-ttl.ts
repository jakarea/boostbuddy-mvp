/**
 * Standardized Cache TTL (Time To Live) constants
 * Use these for consistent caching across the application
 */

// Cache durations in milliseconds
export const CACHE_TTL = {
  // High-frequency data - changes often, needs fresh data
  NOW: 0, // No caching
  VERY_SHORT: 30 * 1000, // 30 seconds - for real-time data
  SHORT: 1 * 60 * 1000, // 1 minute - for active work/dashboard

  // Medium-frequency data - changes occasionally
  MEDIUM: 2 * 60 * 1000, // 2 minutes - for stats, notifications, orders
  MEDIUM_LONG: 3 * 60 * 1000, // 3 minutes - for user-specific data

  // Low-frequency data - changes rarely
  LONG: 5 * 60 * 1000, // 5 minutes - for admin lists, catalogs
  VERY_LONG: 15 * 60 * 1000, // 15 minutes - for static config
} as const;

/**
 * Recommended TTL by data type:
 *
 * REALTIME (VERY_SHORT, SHORT):
 * - Employee dashboard tasks
 * - Active order status
 *
 * FREQUENT (MEDIUM, MEDIUM_LONG):
 * - Dashboard stats
 * - Notifications
 * - Orders lists
 * - Client profiles
 * - Wallet balance
 *
 * OCCASIONAL (LONG):
 * - Admin client lists
 * - Admin employee lists
 * - Admin profile lists
 * - Service catalog
 * - Credit packages
 *
 * STATIC (VERY_LONG):
 * - Pricing rules
 * - System configuration
 */

export default CACHE_TTL;
