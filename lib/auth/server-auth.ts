"use server";

import "server-only";
import { createClient } from '@/lib/supabase/server';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
  isActive: boolean;
  status?: 'ACTIVE' | 'PENDING' | 'DEACTIVATED';
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
  role?: 'ADMIN' | 'CLIENT' | 'EMPLOYEE'
}): Promise<AuthResult<never>> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Get user profile from custom users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, status, name")
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !userData) {
    return { success: false, error: "User profile not found" };
  }

  // Check role if required
  if (options?.role && userData.role !== options.role) {
    return { success: false, error: "Forbidden" };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email || '',
      name: userData.name || user.email?.split('@')[0] || 'User',
      role: userData.role as 'ADMIN' | 'CLIENT' | 'EMPLOYEE',
      isActive: userData.status === 'ACTIVE',
      status: userData.status as 'ACTIVE' | 'PENDING' | 'DEACTIVATED'
    }
  };
}
