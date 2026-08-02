"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AuthContextType, AuthState, AuthUser } from "@/lib/auth/types";
import {
  getCurrentSession,
  signInUser as signInUserUtil,
  signUpUser as signUpUserUtil,
  signOutUser as signOutUserUtil,
  hasRole,
  isUserActive,
} from "@/lib/auth/pure-functions-client";
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

  // Setup Supabase auth listener on mount
  useEffect(() => {
    console.group(`${LOG_PREFIX} Initializing auth listener`);
    let isMounted = true;

    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.group(`${LOG_PREFIX} Auth state changed`);
        console.log("Event:", event);

        if (!isMounted) {
          console.log("Component unmounted, skipping update");
          console.groupEnd();
          return;
        }

        // Skip INITIAL_SESSION — server already provided initialUser
        if (event === 'INITIAL_SESSION') {
          console.log(`${LOG_PREFIX} Skipping INITIAL_SESSION, relying on server state`);
          console.groupEnd();
          return;
        }

        // Skip SIGNED_IN and TOKEN_REFRESHED — these fire simultaneously with the
        // server action's router.push() and cause a "unexpected response" race condition.
        // The server action + router.push() already handle navigation on login.
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log(`${LOG_PREFIX} Skipping ${event} event — server action handles this redirect`);
          console.groupEnd();
          return;
        }

        // Only handle SIGNED_OUT to clear client state
        if (event === 'SIGNED_OUT') {
          console.log(`${LOG_PREFIX} User signed out, clearing state`);
          setUser(null);
          setState("UNAUTHENTICATED");
          setError(null);
          console.groupEnd();
          return;
        }

        // For any other events (PASSWORD_RECOVERY, USER_UPDATED, etc.) refresh the user
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            console.log(`${LOG_PREFIX} User updated via event:`, user.email);
            const basicUser: AuthUser = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'CLIENT',
              isActive: user.user_metadata?.isActive !== undefined ? user.user_metadata?.isActive : true,
              createdAt: new Date(user.created_at),
            };
            setUser(basicUser);
            setState("AUTHENTICATED");
            setError(null);
          } else {
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

    console.groupEnd();

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

      console.log("Step 2: Getting current session...");
      const session = await getCurrentSession();

      if (session?.user) {
        console.log("Step 3: ✅ Sign in complete");
        // Create basic user from Supabase auth data
        const basicUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'CLIENT',
          isActive: session.user.user_metadata?.isActive !== undefined ? session.user.user_metadata?.isActive : true,
          createdAt: new Date(session.user.created_at),
        };

        setUser(basicUser);
        setState("AUTHENTICATED");
      } else {
        throw new Error("No session after sign in");
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

      console.log("Step 2: ✅ Sign up complete (profile will be created by server)");
      // Create basic user from Supabase auth data
      // Note: User profile in database will be created by server-side action
      const basicUser: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || name,
        role: authUser.user_metadata?.role || 'CLIENT',
        isActive: authUser.user_metadata?.isActive !== undefined ? authUser.user_metadata?.isActive : true,
        createdAt: new Date(authUser.created_at),
      };

      setUser(basicUser);
      setState("AUTHENTICATED");
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
