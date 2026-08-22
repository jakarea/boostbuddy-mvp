"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState<"EN" | "IT">("EN");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateLang = (lng?: string) => {
      const current = lng || i18n.language || "en";
      setLang(current.toLowerCase().startsWith("it") ? "IT" : "EN");
    };

    updateLang(i18n.language);

    i18n.on("languageChanged", updateLang);
    return () => {
      i18n.off("languageChanged", updateLang);
    };
  }, [i18n]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  const changeLang = async (newLang: "en" | "it") => {
    setIsOpen(false);
    await i18n.changeLanguage(newLang);
    setLang(newLang === "it" ? "IT" : "EN");

    if (typeof document !== "undefined") {
      document.cookie = `i18next=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem("i18nextLng", newLang);
      } catch (e) {}
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 gap-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{lang}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {isOpen && (
        <>
          {/* Overlay to click away */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 bottom-full mb-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => changeLang("en")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">🇬🇧</span> English
              </span>
              {lang === "EN" && <Check className="h-3.5 w-3.5 text-[#168BB0]" />}
            </button>
            <button
              type="button"
              onClick={() => changeLang("it")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">🇮🇹</span> Italiano
              </span>
              {lang === "IT" && <Check className="h-3.5 w-3.5 text-[#168BB0]" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
