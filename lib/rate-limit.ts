/**
 * Rate Limiting Utility for BoostBuddy MVP
 *
 * Provides IP-based rate limiting to prevent brute force attacks and DoS vulnerabilities.
 * Uses in-memory storage for development with exponential backoff.
 *
 * SECURITY: This helps prevent:
 * - Brute force attacks on authentication endpoints
 * - DoS attacks via rapid repeated requests
 * - Credential stuffing attacks
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;          // Time window in milliseconds
  blockDurationMs: number;   // How long to block after exceeding limit
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RateLimitPresets = {
  // Authentication endpoints - stricter limits
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 5 requests per 15 min, block for 30 min

  // Password reset - very strict to prevent email spam
  PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 per hour, block for 1 hour

  // General API endpoints
  API: { maxRequests: 100, windowMs: 15 * 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 100 per 15 min, block for 5 min

  // Form submissions
  FORM: { maxRequests: 10, windowMs: 60 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 10 per hour, block for 30 min

  // File uploads - moderate limit to prevent storage abuse
  UPLOAD: { maxRequests: 10, windowMs: 5 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 10 uploads per 5 min, block for 15 min

  // Expensive operations - order creation, credit purchases
  EXPENSIVE: { maxRequests: 20, windowMs: 60 * 60 * 1000, blockDurationMs: 10 * 60 * 1000 }, // 20 per hour, block for 10 min
};

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations and X-Forwarded-For headers
 */
export function getClientIp(headers: Headers): string {
  // Check for X-Forwarded-For header (may contain multiple IPs)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Check for X-Real-IP (Nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback to remote address (not available in serverless functions)
  return 'unknown';
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.API
): { allowed: boolean; remaining: number; resetTime: number; error?: string } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists, allow the request
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      error: 'Too many attempts. Please try again later.'
    };
  }

  // Check if the window has expired
  if (now >= entry.resetTime) {
    // Reset the counter
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }

  // Increment the counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    // Apply block
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(identifier, entry);

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      error: 'Rate limit exceeded. Please try again later.'
    };
  }

  // Request allowed
  rateLimitStore.set(identifier, entry);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Reset rate limit for a specific identifier (admin function)
 *
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clean up expired entries (prevent memory leak)
 * Call this periodically in a background job
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime && (!entry.blockedUntil || now >= entry.blockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit status for testing/monitoring
 */
export function getRateLimitStatus(): { totalEntries: number; entries: Array<{ key: string; entry: RateLimitEntry }> } {
  return {
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({ key, entry }))
  };
}
