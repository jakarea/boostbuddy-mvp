/**
 * Client-side auth functions - no database operations
 * Only uses Supabase auth, no Prisma
 */

import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "./types";

const LOG_PREFIX = "[AUTH-CLIENT]";

/**
 * Get current Supabase session (pure - just reads)
 */
export async function getCurrentSession() {
  console.log(`${LOG_PREFIX} Getting current session...`);
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error(`${LOG_PREFIX} ❌ User fetch error:`, error.message);
    return null;
  }

  if (!user) {
    console.log(`${LOG_PREFIX} No active user found`);
    return null;
  }

  console.log(`${LOG_PREFIX} ✅ User found:`, user.email);
  return { user };
}

/**
 * Sign in user with email and password
 */
export async function signInUser(email: string, password: string) {
  console.log(`${LOG_PREFIX} Signing in user:`, email);

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`${LOG_PREFIX} ❌ Sign in failed:`, error.message);
    throw new Error(error.message);
  }

  console.log(`${LOG_PREFIX} ✅ Sign in successful`);
}

/**
 * Sign up new user with email and password
 */
export async function signUpUser(email: string, password: string, name: string) {
  console.log(`${LOG_PREFIX} Signing up user:`, email);

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "CLIENT", isActive: true },
    },
  });

  if (error) {
    console.error(`${LOG_PREFIX} ❌ Sign up failed:`, error.message);
    throw new Error(error.message);
  }

  console.log(`${LOG_PREFIX} ✅ Sign up successful, user ID:`, data.user?.id);
  return data.user;
}

/**
 * Sign out user
 */
export async function signOutUser() {
  console.log(`${LOG_PREFIX} Signing out user...`);

  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(`${LOG_PREFIX} ❌ Sign out failed:`, error.message);
    throw new Error(error.message);
  }

  console.log(`${LOG_PREFIX} ✅ Sign out successful`);
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRole: "ADMIN" | "CLIENT"): boolean {
  if (!user) {
    console.log(`${LOG_PREFIX} hasRole check: No user, returning false`);
    return false;
  }

  const hasAccess = user.role === requiredRole;
  console.log(`${LOG_PREFIX} hasRole check: User is ${user.role}, requires ${requiredRole} → ${hasAccess}`);
  return hasAccess;
}

/**
 * Check if user is active
 */
export function isUserActive(user: AuthUser | null): boolean {
  if (!user) return false;

  const isActive = user.isActive === true;
  console.log(`${LOG_PREFIX} isUserActive check: isActive is ${user.isActive} → ${isActive}`);
  return isActive;
}
