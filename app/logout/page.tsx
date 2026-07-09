"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

import { useEffect } from "react";
import { logoutAndRedirect } from "@/lib/auth/logout";

const LOG_PREFIX = "[LOGOUT-PAGE]";

/**
 * Logout page - Handles complete logout and redirect to home
 * Navigate to /logout to trigger logout
 */
export default function LogoutPage() {
  useEffect(() => {
    console.log(`${LOG_PREFIX} Logout page mounted, starting logout sequence...`);
    void logoutAndRedirect();
  }, []);

  return <LoadingScreen message="Logging out..." />;
}
