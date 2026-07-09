/**
 * Pure auth functions - no side effects, fully testable
 * Each function does ONE thing and does it well
 */

import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "./types";

const LOG_PREFIX = "[AUTH-PURE]";

/**
 * Get current Supabase session (pure - just reads)
 */
export async function getCurrentSession() {
  console.log(`${LOG_PREFIX} Getting current session...`);
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error(`${LOG_PREFIX} ❌ Session fetch error:`, error.message);
    return null;
  }

  if (!session?.user) {
    console.log(`${LOG_PREFIX} No active session found`);
    return null;
  }

  console.log(`${LOG_PREFIX} ✅ Session found for:`, session.user.email);
  return session;
}

/**
 * Fetch user profile from database
 */
export async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  console.log(`${LOG_PREFIX} Fetching user profile for ID:`, userId);

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, name, role, status, email_verified, created_at")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn(`${LOG_PREFIX} ⚠️ Profile fetch failed:`, error.message);
    return null;
  }

  if (!profile) {
    console.log(`${LOG_PREFIX} No profile found in database`);
    return null;
  }

  console.log(`${LOG_PREFIX} ✅ Profile fetched:`, profile.email, `| Role: ${profile.role} | Verified: ${profile.email_verified}`);

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    createdAt: profile.created_at,
  };
}

/**
 * Create new user profile in database (called after Supabase signup)
 */
export async function createUserProfile(
  userId: string,
  email: string,
  name: string,
  role: "ADMIN" | "CLIENT"
): Promise<AuthUser | null> {
  console.log(`${LOG_PREFIX} Creating user profile:`, email, `| Role: ${role}`);

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("users")
    .insert([
      {
        id: userId,
        email,
        name,
        role,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      },
    ])
    .select("id, email, name, role, status, created_at")
    .single();

  if (error) {
    console.error(`${LOG_PREFIX} ❌ Profile creation failed:`, error.message);
    return null;
  }

  console.log(`${LOG_PREFIX} ✅ Profile created successfully`);

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    createdAt: profile.created_at,
  };
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
      data: { name, role: "CLIENT", status: "ACTIVE" },
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
 * Get full auth user (session + profile)
 */
export async function getFullAuthUser(): Promise<AuthUser | null> {
  console.group(`${LOG_PREFIX} Getting full auth user...`);

  try {
    const session = await getCurrentSession();

    if (!session) {
      console.log(`${LOG_PREFIX} No session, returning null`);
      console.groupEnd();
      return null;
    }

    const userId = session.user.id;
    const profile = await fetchUserProfile(userId);

    if (!profile) {
      console.warn(`${LOG_PREFIX} ⚠️ Session exists but no profile found`);
      console.groupEnd();
      return null;
    }

    console.log(`${LOG_PREFIX} ✅ Full auth user retrieved`);
    console.groupEnd();
    return profile;
  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ Error getting full auth user:`, err);
    console.groupEnd();
    return null;
  }
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
 * Check if user is active (for CLIENT role)
 */
export function isUserActive(user: AuthUser | null): boolean {
  if (!user) return false;

  const isActive = user.status === "ACTIVE";
  console.log(`${LOG_PREFIX} isUserActive check: Status is ${user.status} → ${isActive}`);
  return isActive;
}

/**
 * Check if user is pending approval
 */
export function isUserPending(user: AuthUser | null): boolean {
  if (!user) return false;

  const isPending = user.status === "PENDING";
  console.log(`${LOG_PREFIX} isUserPending check: Status is ${user.status} → ${isPending}`);
  return isPending;
}
