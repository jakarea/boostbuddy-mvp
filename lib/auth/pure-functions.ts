/**
 * Pure auth functions - no side effects, fully testable
 * Each function does ONE thing and does it well
 */

import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthUser } from "./types";

const LOG_PREFIX = "[AUTH-PURE]";

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
 * Fetch user profile from database
 */
export async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  console.log(`${LOG_PREFIX} Fetching user profile for ID:`, userId);

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await (supabase
      .from("users") as any)
      .select("id, email, name, role, status, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.log(`${LOG_PREFIX} No profile found in database`);
      return null;
    }

    console.log(`${LOG_PREFIX} ✅ Profile fetched:`, profile.email, `| Role: ${profile.role} | Status: ${profile.status}`);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as "ADMIN" | "CLIENT" | "EMPLOYEE",
      isActive: profile.status === "ACTIVE",
      createdAt: new Date(profile.created_at),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} ⚠️ Profile fetch error:`, error);
    return null;
  }
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

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { error: insertError } = await (supabase
      .from("users") as any)
      .insert({
        id: userId,
        email: email,
        name: name,
        role: role,
        status: "PENDING",
        email_verified: false,
        credits_balance: 0,
        accepting_orders: true,
        created_at: now,
        updated_at: now
      });

    if (insertError) {
      console.error(`${LOG_PREFIX} ❌ Profile creation failed:`, insertError);
      return null;
    }

    const { data: profile } = await (supabase
      .from("users") as any)
      .select("id, email, name, role, status, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      console.log(`${LOG_PREFIX} Failed to retrieve created profile`);
      return null;
    }

    console.log(`${LOG_PREFIX} ✅ Profile created successfully`);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as "ADMIN" | "CLIENT" | "EMPLOYEE",
      isActive: profile.status === "ACTIVE",
      createdAt: new Date(profile.created_at),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Profile creation failed:`, error);
    return null;
  }
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
 * Check if user is active
 */
export function isUserActive(user: AuthUser | null): boolean {
  if (!user) return false;

  const isActive = user.isActive === true;
  console.log(`${LOG_PREFIX} isUserActive check: isActive is ${user.isActive} → ${isActive}`);
  return isActive;
}
