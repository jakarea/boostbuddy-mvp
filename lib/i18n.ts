import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "../locales/en.json";
import itTranslations from "../locales/it.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
      it: itTranslations,
    },
    // Always start with English so SSR and first client render agree.
    // The I18nProvider will call changeLanguage() after hydration
    // using the cookie value, avoiding any mismatch warning.
    lng: "en",
    fallbackLng: "en",
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["cookie", "localStorage", "navigator"],
      lookupCookie: "i18next",
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage", "cookie"],
    },
  });

export default i18n;

