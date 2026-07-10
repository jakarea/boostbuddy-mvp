"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    __linkClickTime?: number;
  }
}

export function ClientPerformanceLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  // Setup click listener once
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      
      if (anchor && anchor.href && !anchor.target) {
        // Record the exact time the user clicked a link
        window.__linkClickTime = Date.now();
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, []);

  // Log on every route change (including query params)
  useEffect(() => {
    if (isFirstRender.current) {
      // Initial Page Load (Hard refresh)
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const loadTime = Math.round(navEntry.loadEventEnd);
        console.log(
          `%c[Page Load] %c${pathname} %cHard Refresh took: %c${loadTime}ms`,
          "color: #888; font-weight: bold",
          "color: #168BB0; font-weight: bold",
          "color: inherit",
          `color: ${loadTime > 1000 ? 'red' : 'green'}; font-weight: bold; font-size: 14px;`
        );
      }
      isFirstRender.current = false;
      return;
    }

    // SPA Navigation (Link click)
    if (window.__linkClickTime) {
      // Small timeout to ensure browser paint is finished
      setTimeout(() => {
        const loadTime = Date.now() - window.__linkClickTime!;
        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        
        console.log(
          `%c[Navigation] %c${url} %cClick to fully render took: %c${loadTime}ms`,
          "color: #888; font-weight: bold",
          "color: #168BB0; font-weight: bold",
          "color: inherit",
          `color: ${loadTime > 500 ? 'red' : 'green'}; font-weight: bold; font-size: 14px;`
        );
        
        // Reset so we don't log it again for non-link changes
        window.__linkClickTime = undefined;
      }, 0);
    }
  }, [pathname, searchParams]);

  return null;
}
