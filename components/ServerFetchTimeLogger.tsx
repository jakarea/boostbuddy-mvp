"use client";

import { useEffect } from "react";

export function ServerFetchTimeLogger({ 
  pageName, 
  fetchTimeMs 
}: { 
  pageName: string; 
  fetchTimeMs: number 
}) {
  useEffect(() => {
    console.log(
      `%c[Performance] %c${pageName} %cserver data fetch took: %c${fetchTimeMs}ms`,
      "color: #888; font-weight: bold",
      "color: #168BB0; font-weight: bold",
      "color: inherit",
      `color: ${fetchTimeMs > 500 ? 'red' : 'green'}; font-weight: bold; font-size: 14px;`
    );
  }, [pageName, fetchTimeMs]);

  return null;
}
