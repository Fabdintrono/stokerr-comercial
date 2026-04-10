"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define locale type
type Locale = "pt" | "es";
type Translations = Record<string, unknown>;

// Import translations
const translations: Record<Locale, Translations> = {
  pt: {} as Translations,
  es: {} as Translations,
};

// Context
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider
interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale = "pt" }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [loadedTranslations, setLoadedTranslations] = useState<Record<Locale, Translations>>({
    pt: {},
    es: {},
  });

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const [ptModule, esModule] = await Promise.all([
          import("../../locales/pt.json"),
          import("../../locales/es.json"),
        ]);
        setLoadedTranslations({
          pt: ptModule.default,
          es: esModule.default,
        });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };
    loadTranslations();
  }, []);

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = loadedTranslations[locale];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, paramValue),
        value
      );
    }

    return value;
  };

  // Persist locale preference
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale | null;
    if (savedLocale && (savedLocale === "pt" || savedLocale === "es")) {
      setLocale(savedLocale);
    }
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Available locales
export const locales: Locale[] = ["pt", "es"];
export const defaultLocale: Locale = "pt";