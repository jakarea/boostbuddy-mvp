"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface RedirectWrapperProps {
  children: React.ReactNode;
}

export default function RedirectWrapper({ children }: RedirectWrapperProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    // Inactive users go to pending (except if already there)
    if (!user.isActive && pathname !== '/c/pending') {
      router.replace('/c/pending');
      return;
    }

    // Active users on pending page go to dashboard
    if (user.isActive && pathname === '/c/pending') {
      router.replace('/c/dashboard');
      return;
    }

    // Redirect /c root to /c/dashboard
    if (pathname === '/c') {
      router.replace('/c/dashboard');
      return;
    }
  }, [user, pathname, router]);

  // Don't render children if redirect is needed
  if (!user) return null;
  if (!user.isActive && pathname !== '/c/pending') return null;
  if (user.isActive && pathname === '/c/pending') return null;
  if (pathname === '/c') return null;

  return <>{children}</>;
}
