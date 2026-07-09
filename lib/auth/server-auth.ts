import { createClient } from '@/lib/supabase/server';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  status: 'ACTIVE' | 'PENDING' | string;
};

export type AuthResult<T> =
  | { success: true; user: AuthenticatedUser; data?: T }
  | { success: false; error: string };

/**
 * Centralized auth wrapper that combines user auth + profile fetch.
 * Replaces the pattern repeated 40+ times across action files.
 *
 * Usage:
 *   const auth = await requireAuth({ role: 'ADMIN' });
 *   if (!auth.success) return auth; // Return error to client
 *
 *   // Now auth.user is guaranteed to exist
 *   const user = auth.user;
 */
export async function requireAuth(options?: {
  role?: 'ADMIN' | 'CLIENT'
}): Promise<AuthResult<never>> {
  const supabase = await createClient();

  // Step 1: Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Step 2: Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, name, role, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" };
  }

  // Step 3: Check role if required
  if (options?.role && profile.role !== options.role) {
    return { success: false, error: "Forbidden" };
  }

  return {
    success: true,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      status: profile.status,
    }
  };
}
