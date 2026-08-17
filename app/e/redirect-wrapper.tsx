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

    // Use status from JWT metadata (no DB query)
    const isEmployeeActive = user.status === 'ACTIVE' || user.isActive;

    // Inactive employees go to pending (except if already there)
    if (!isEmployeeActive && pathname !== '/e/pending') {
      router.replace('/e/pending');
      return;
    }
  }, [user, pathname, router]);

  // Don't render children if redirect is needed
  if (!user) return null;

  const isEmployeeActive = user?.status === 'ACTIVE' || user?.isActive;
  if (!isEmployeeActive && pathname !== '/e/pending') return null;

  return <>{children}</>;
}
