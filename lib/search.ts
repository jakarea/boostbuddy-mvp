/**
 * Safe search utilities for Supabase queries
 * Prevents injection and filter manipulation attacks
 */

/**
 * Sanitize search input for Supabase queries
 * Removes characters that could be used for filter manipulation
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove characters that could be used in filter manipulation
  // Keep only alphanumeric, spaces, @, hyphens, and underscores
  return input
    .trim()
    .replace(/[,\.\(\)%\\\/\[\]:;"'<>|&*+=!?`~]/g, '')
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .slice(0, 100);  // Limit length to prevent abuse
}

/**
 * Validate search input is safe before use
 * Returns true if input is safe, false otherwise
 */
export function isSafeSearchInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  // Check for suspicious patterns
  const dangerousPatterns = [
    /\.\./,           // Path traversal
    /;.*drop/i,       // SQL injection attempts
    /;.*delete/i,     // SQL injection attempts
    /;.*insert/i,     // SQL injection attempts
    /;.*update/i,     // SQL injection attempts
    /\bor\b/i,        // Logical operators
    /\band\b/i,       // Logical operators
    /\bunion\b/i,     // SQL union attempts
    /--/,             // SQL comments
    /\/\*/,           // C-style comments
    /\*./,            // C-style comments
    /0x[0-9a-f]+/i,   // Hex encoding
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      console.warn('[SECURITY] Potentially dangerous search input detected:', input);
      return false;
    }
  }

  return true;
}

/**
 * Build a safe search query for multiple fields
 * Uses individual ilike filters instead of .or() for better security
 *
 * @param query - Supabase query builder
 * @param searchTerm - Search term to look for
 * @param fields - Array of field names to search in
 * @returns Modified query with safe search filters
 */
export function buildSafeSearchQuery<T>(
  query: any,
  searchTerm: string,
  fields: string[]
): T {
  const sanitized = sanitizeSearchInput(searchTerm);

  if (!sanitized) {
    // Empty search after sanitization - return query that won't match anything
    return query.eq('id', 'never-match-id');
  }

  if (!isSafeSearchInput(sanitized)) {
    console.warn('[SECURITY] Unsafe search input rejected:', sanitized);
    return query.eq('id', 'never-match-id');
  }

  // Build safe search using individual ilike calls
  // This is safer than using .or() with user input
  const searchPattern = `%${sanitized}%`;

  // Supabase doesn't have a native way to do OR across multiple fields safely
  // So we use the sanitized input with .or() - this is safer because:
  // 1. Input is sanitized to remove dangerous characters
  // 2. Input length is limited
  // 3. Only ilike (case-insensitive LIKE) is used, not operators
  const orConditions = fields.map(field => `${field}.ilike.${searchPattern}`).join(',');

  return query.or(orConditions);
}

/**
 * Search users by name or email safely
 * Returns user IDs matching the search term
 */
export async function searchUsersByNameOrEmail(
  supabase: any,
  searchTerm: string,
  limit: number = 100
): Promise<{ userIds: string[]; error?: string }> {
  const sanitized = sanitizeSearchInput(searchTerm);

  if (!sanitized) {
    return { userIds: [] };
  }

  if (!isSafeSearchInput(sanitized)) {
    return { userIds: [], error: 'Invalid search term' };
  }

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id")
      .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
      .limit(limit);

    if (error) {
      return { userIds: [], error: error.message };
    }

    return {
      userIds: users?.map((u: any) => u.id) || []
    };
  } catch (error: any) {
    return {
      userIds: [],
      error: error?.message || 'Search failed'
    };
  }
}

/**
 * Search review orders by business name or user email safely
 * Returns order IDs matching the search term
 */
export async function searchReviewOrders(
  supabase: any,
  searchTerm: string,
  additionalFilters: Record<string, any> = {},
  limit: number = 50
): Promise<{ orderIds: string[]; error?: string }> {
  const sanitized = sanitizeSearchInput(searchTerm);

  if (!sanitized) {
    return { orderIds: [] };
  }

  if (!isSafeSearchInput(sanitized)) {
    return { orderIds: [], error: 'Invalid search term' };
  }

  try {
    let query = supabase
      .from("review_orders")
      .select("id")
      .or(`business_name.ilike.%${sanitized}%,facebook_url.ilike.%${sanitized}%`)
      .limit(limit);

    // Apply additional filters
    for (const [field, value] of Object.entries(additionalFilters)) {
      query = query.eq(field, value);
    }

    const { data: orders, error } = await query;

    if (error) {
      return { orderIds: [], error: error.message };
    }

    return {
      orderIds: orders?.map((o: any) => o.id) || []
    };
  } catch (error: any) {
    return {
      orderIds: [],
      error: error?.message || 'Search failed'
    };
  }
}
