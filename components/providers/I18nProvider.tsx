"use client";

import React, { ReactNode, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

interface I18nProviderProps {
  children: ReactNode;
}

// Read the language cookie or localStorage value
function getStoredLanguage(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("i18next="));
  if (match) {
    const val = match.split("=")[1];
    if (val) return val;
  }
  try {
    const local = localStorage.getItem("i18nextLng");
    if (local) return local;
  } catch (e) {}
  return "en";
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // After hydration, switch to the user's saved language from cookie/localStorage.
    // This runs client-side only, after React has matched the server HTML.
    const lang = getStoredLanguage();
    const normalizedLang = lang.toLowerCase().startsWith("it") ? "it" : "en";
    if (normalizedLang !== i18n.language) {
      i18n.changeLanguage(normalizedLang);
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
