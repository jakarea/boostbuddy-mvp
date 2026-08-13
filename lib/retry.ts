/**
 * Retry utility with exponential backoff for handling concurrent updates
 * Helps prevent race conditions when updating shared resources like credit balances
 */

export interface RetryOptions {
  maxRetries?: number;      // Maximum number of retry attempts (default: 3)
  initialDelay?: number;    // Initial delay in milliseconds (default: 100)
  maxDelay?: number;        // Maximum delay between retries (default: 2000)
  factor?: number;          // Exponential backoff factor (default: 2)
  shouldRetry?: (error: any) => boolean;  // Function to determine if error is retryable
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result with success status, data/error, and attempt count
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 2000,
    factor = 2,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt + 1
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error)) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, errorMessage);

        // Wait before next retry
        await sleep(delay);

        // Exponential backoff with jitter
        delay = Math.min(delay * factor, maxDelay);
        delay = delay + Math.random() * 100; // Add jitter to avoid thundering herd
      } else {
        // No more retries or error not retryable
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[RETRY] All ${maxRetries + 1} attempts failed:`, errorMessage);
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    attempts: maxRetries + 1
  };
}

/**
 * Default retry condition - retry on version conflicts and concurrent updates
 */
function defaultShouldRetry(error: unknown): boolean {
  // Check for common conflict/concurrency error patterns
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Prisma/PostgreSQL version conflict
  if (errorMessage.includes('version') || errorMessage.includes('conflict')) {
    return true;
  }

  // Optimistic concurrency check failures
  if (errorMessage.includes('version check failed') || errorMessage.includes('concurrent')) {
    return true;
  }

  // Supabase specific errors
  if (errorMessage.includes('PGRST116') || errorMessage.includes('version mismatch')) {
    return true;
  }

  // Network/timeout errors (transient)
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
    return true;
  }

  return false;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute multiple functions concurrently with limited concurrency
 * Useful for batch operations where you want to limit simultaneous requests
 */
export async function withConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}
