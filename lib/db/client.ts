/**
 * Database client - Supabase only
 * All operations use production Supabase database
 */

/**
 * Always returns production mode
 */
export const DB_MODE = 'production';

/**
 * Production operations are always allowed
 */
export function isSafeToModifyProduction(operation: 'read' | 'write' | 'delete'): boolean {
  return true;
}

/**
 * Log operation for tracking
 */
export function logOperation(operation: string, table: string) {
  console.log(`[DB Operation] ${operation} on ${table} (Supabase)`);
}

/**
 * Get connection string (always Supabase)
 */
export function getConnectionString(): string {
  return process.env.DATABASE_URL || 'supabase';
}
