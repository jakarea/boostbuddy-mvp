import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from '@/lib/auth/types';

export type CachedUser = AuthUser;

/**
 * Request-level cache for user data.
 * React's cache() ensures this function is only called once per request,
 * even if multiple components call it. Prevents duplicate Supabase queries.
 */
export const getCachedUser = cache(async (): Promise<CachedUser | null> => {
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  const user = session?.user;

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, name, role, status, created_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Map database status to AuthUser status type
  const status = (profile.status as any) || 'ACTIVE';

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as 'ADMIN' | 'CLIENT',
    status: status as 'PENDING' | 'ACTIVE' | 'DEACTIVATED',
    createdAt: profile.created_at,
  };
});
