import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Only import default locale upfront - saves 70KB!
import enTranslations from "../locales/en.json";

// Track dynamically loaded locales
const loadedLocales = new Set(["en"]);

// Dynamic locale loader
const loadLocaleAsync = async (lng: string) => {
  if (loadedLocales.has(lng)) return true;

  try {
    const translations = (await import(`../locales/${lng}.json`)).default;
    // Add each top-level namespace separately to support useTranslation(namespace)
    Object.keys(translations).forEach((namespace) => {
      i18n.addResourceBundle(lng, namespace, translations[namespace]);
    });
    loadedLocales.add(lng);
    return true;
  } catch (error) {
    console.error(`Failed to load locale: ${lng}`, error);
    return false;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use({
    type: "backend",
    read: async (lng: string, ns: string) => {
      // Load each namespace separately
      if (!loadedLocales.has(lng)) {
        await loadLocaleAsync(lng);
      }
      return true; // Resources loaded via addResourceBundle
    }
  })
  .init({
    resources: {}, // Will be populated dynamically
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

// Load English translations on initialization
Object.keys(enTranslations).forEach((namespace) => {
  i18n.addResourceBundle("en", namespace, enTranslations[namespace as keyof typeof enTranslations]);
});

export default i18n;

