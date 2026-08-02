import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type CachedUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
  isActive: boolean;
  status?: 'ACTIVE' | 'PENDING' | 'DEACTIVATED';
  createdAt: Date;
};

/**
 * Request-level cache for user data.
 * Uses Supabase only - no local database.
 * React's cache() ensures this function is only called once per request.
 */
export const getCachedUser = cache(async (): Promise<CachedUser | null> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  try {
    // Read role and status from custom users table (source of truth)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, status, name")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userData) {
      console.warn('[getCachedUser] No user data found in users table:', userError?.message);
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      name: userData.name || user.email?.split('@')[0] || 'User',
      role: userData.role as 'ADMIN' | 'CLIENT' | 'EMPLOYEE',
      isActive: userData.status === 'ACTIVE',
      status: userData.status as 'ACTIVE' | 'PENDING' | 'DEACTIVATED',
      createdAt: new Date(user.created_at)
    };
  } catch (error: any) {
    console.error('[getCachedUser] Error processing user data:', error);
    return null;
  }
});
