"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Silence React 19 false positive warning for inline script tag in next-themes
if (process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Encountered a script tag") ||
       args[0].includes("extra attributes from the server") ||
       args[0].includes("did not match"))
    ) {
      return;
    }
    orig.apply(console, args);
  };
}


export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
