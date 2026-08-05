import { createClient } from '@supabase/supabase-js';

// Use a non-null assertion or throw an error if missing.
// The service role key is REQUIRED for admin operations like inviting users.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Singleton admin client - created once and reused
 * Uses static service role key (not cookies), safe to cache
 */
let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Creates a Supabase client with the Service Role key.
 * IMPORTANT: This client bypasses RLS policies. It should ONLY be used in
 * Server Actions or API routes, and NEVER exposed to the client.
 */
export const createAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined. Please add it to your .env.local file.');
  }

  // Return cached client if available (singleton pattern)
  if (_adminClient) return _adminClient;

  _adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
};
