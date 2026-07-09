"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AuthContextType, AuthState, AuthUser } from "@/lib/auth/types";
import {
  getCurrentSession,
  getFullAuthUser,
  signInUser as signInUserUtil,
  signUpUser as signUpUserUtil,
  signOutUser as signOutUserUtil,
  createUserProfile,
} from "@/lib/auth/pure-functions";
import { createClient } from "@/lib/supabase/client";

const LOG_PREFIX = "[AUTH-CONTEXT]";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode, initialUser?: AuthUser | null }) {
  const [state, setState] = useState<AuthState>(initialUser ? "AUTHENTICATED" : "UNAUTHENTICATED");
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [error, setError] = useState<string | null>(null);

  console.log(`${LOG_PREFIX} Provider initializing... Initial user:`, initialUser?.email || "none");

  // Sync state when initialUser prop changes from server (e.g. after Server Action redirect)
  useEffect(() => {
    if (initialUser?.id !== user?.id) {
      console.log(`${LOG_PREFIX} initialUser prop changed, updating state...`);
      if (initialUser) {
        setUser(initialUser);
        setState("AUTHENTICATED");
      } else {
        setUser(null);
        setState("UNAUTHENTICATED");
      }
    }
  }, [initialUser, user?.id]);

  // Initialize auth on mount - restore session
  useEffect(() => {
    console.group(`${LOG_PREFIX} Initializing auth system`);

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log(`${LOG_PREFIX} Step 1: Checking for existing session...`);
        const authUser = await getFullAuthUser();

        if (!isMounted) {
          console.log(`${LOG_PREFIX} Component unmounted, skipping state update`);
          console.groupEnd();
          return;
        }

        if (authUser) {
          console.log(`${LOG_PREFIX} Step 2: ✅ User found in session:`, authUser.email);
          setUser(authUser);
          setState("AUTHENTICATED");
          setError(null);
        } else {
          console.log(`${LOG_PREFIX} Step 2: No user in session`);
          setUser(null);
          setState("UNAUTHENTICATED");
          setError(null);
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} ❌ Auth initialization error:`, err);
        if (isMounted) {
          setUser(null);
          setState("UNAUTHENTICATED");
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        console.groupEnd();
      }
    };

    initializeAuth();

    // Listen to Supabase auth changes
    const supabase = createClient();
    console.log(`${LOG_PREFIX} Setting up auth state change listener...`);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.group(`${LOG_PREFIX} Auth state changed`);
        console.log("Event:", event);
        console.log("Session user:", session?.user?.email || "none");

        if (!isMounted) {
          console.log("Component unmounted, skipping update");
          console.groupEnd();
          return;
        }

        try {
          if (session?.user) {
            console.log(`${LOG_PREFIX} Step 1: User authenticated:`, session.user.email);

            // Fetch fresh profile
            const authUser = await getFullAuthUser();

            if (authUser) {
              console.log(`${LOG_PREFIX} Step 2: ✅ Profile loaded, role:`, authUser.role);
              setUser(authUser);
              setState("AUTHENTICATED");
              setError(null);
            } else {
              console.warn(`${LOG_PREFIX} ⚠️ Session exists but profile not found`);
              setUser(null);
              setState("UNAUTHENTICATED");
            }
          } else {
            console.log(`${LOG_PREFIX} User signed out`);
            setUser(null);
            setState("UNAUTHENTICATED");
            setError(null);
          }
        } catch (err) {
          console.error(`${LOG_PREFIX} ❌ Error in auth listener:`, err);
          setUser(null);
          setState("UNAUTHENTICATED");
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          console.groupEnd();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    console.group(`${LOG_PREFIX} Sign in action`);
    setError(null);
    setState("LOADING");

    try {
      console.log("Step 1: Calling signInUser with:", email);
      await signInUserUtil(email, password);

      console.log("Step 2: Fetching user profile...");
      const authUser = await getFullAuthUser();

      if (authUser) {
        console.log("Step 3: ✅ Sign in complete");
        setUser(authUser);
        setState("AUTHENTICATED");
      } else {
        throw new Error("Profile not found after sign in");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sign in failed";
      console.error("❌ Sign in error:", errorMsg);
      setUser(null);
      setState("UNAUTHENTICATED");
      setError(errorMsg);
      throw err;
    } finally {
      console.groupEnd();
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, name: string) => {
    console.group(`${LOG_PREFIX} Sign up action`);
    setError(null);
    setState("LOADING");

    try {
      console.log("Step 1: Creating Supabase auth user with:", email);
      const authUser = await signUpUserUtil(email, password, name);

      if (!authUser?.id) {
        throw new Error("No user ID returned from signup");
      }

      console.log("Step 2: Creating user profile in database...");
      const profile = await createUserProfile(authUser.id, email, name, "CLIENT");

      if (profile) {
        console.log("Step 3: ✅ Sign up complete, user is ACTIVE");
        setUser(profile);
        setState("AUTHENTICATED");
      } else {
        throw new Error("Failed to create user profile");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sign up failed";
      console.error("❌ Sign up error:", errorMsg);
      setUser(null);
      setState("UNAUTHENTICATED");
      setError(errorMsg);
      throw err;
    } finally {
      console.groupEnd();
    }
  };

  // Sign out
  const signOut = async () => {
    console.group(`${LOG_PREFIX} Sign out action`);

    try {
      console.log("Step 1: Signing out...");
      await signOutUserUtil();

      console.log("Step 2: ✅ Clearing user state");
      setUser(null);
      setState("UNAUTHENTICATED");
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sign out failed";
      console.error("❌ Sign out error:", errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      console.groupEnd();
    }
  };

  const value: AuthContextType = {
    state,
    user,
    isLoading: state === "LOADING",
    isAuthenticated: state === "AUTHENTICATED",
    signIn,
    signUp,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
