"use client";

import React, { ReactNode, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

interface I18nProviderProps {
  children: ReactNode;
}

// Read the language cookie value directly without relying on the detector
function getStoredLanguage(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("i18next="));
  return match ? match.split("=")[1] : "en";
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // After hydration, switch to the user's saved language from cookie.
    // This runs client-side only, after React has matched the server HTML.
    const lang = getStoredLanguage();
    if (lang && lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, []);

  // Always render with the provider — i18n.language starts as "en" (set
  // in lib/i18n.ts with `lng: "en"`), so SSR and first paint agree.
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
