"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.push("/");
      return;
    }

    // Redirect based on role
    switch (user.role) {
      case "ADMIN":
        router.push("/a/dashboard");
        break;
      case "EMPLOYEE":
        router.push("/e/dashboard");
        break;
      case "CLIENT":
        router.push("/c/dashboard");
        break;
      default:
        // Fallback to client dashboard
        router.push("/c/dashboard");
    }
  }, [user, isLoading, router]);

  // Show loading screen while redirecting
  return <LoadingScreen />;
}
