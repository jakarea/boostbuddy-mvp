import { getCachedUser } from '@/lib/auth/cached-auth';

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
  const cachedUser = await getCachedUser();
  if (!cachedUser) {
    return { success: false, error: "Unauthorized" };
  }

  // Check role if required
  if (options?.role && cachedUser.role !== options.role) {
    return { success: false, error: "Forbidden" };
  }

  return {
    success: true,
    user: {
      id: cachedUser.id,
      email: cachedUser.email,
      name: cachedUser.name,
      role: cachedUser.role,
      status: cachedUser.status,
    }
  };
}
