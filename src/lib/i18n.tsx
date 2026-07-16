"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { normalizeLocale, DEFAULT_LOCALE, type Locale } from "./i18n/normalizeLocale";
import { useAuth } from "@/components/providers/AuthProvider";
import es from "../../locales/es.json";
import pt from "../../locales/pt.json";
import en from "../../locales/en.json";

type Dict = Record<string, unknown>;
const DICTS: Record<Locale, Dict> = { es, pt, en };

function lookup(dict: Dict, key: string): string | undefined {
  let value: unknown = dict;
  for (const k of key.split(".")) {
    if (value && typeof value === "object" && k in (value as Dict)) {
      value = (value as Dict)[k];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [userTouched, setUserTouched] = useState(false);

  // Resolve initial locale. Priority: explicit user choice (localStorage) →
  // logged-in User.language → browser language → default (es).
  // Re-runs when `user` loads so a fresh device honors the saved profile language,
  // unless the visitor already picked a language this session (userTouched).
  useEffect(() => {
    if (userTouched) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem("locale") : null;
    const nav = typeof navigator !== "undefined" ? navigator.language : null;
    const initial = normalizeLocale(saved ?? user?.language ?? nav);
    setLocaleState(initial);
    if (typeof document !== "undefined") document.documentElement.lang = initial;
  }, [user, userTouched]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw = lookup(DICTS[locale], key) ?? lookup(DICTS.es, key) ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        raw,
      );
    },
    [locale],
  );

  const setLocale = useCallback((next: Locale) => {
    setUserTouched(true);
    setLocaleState(next);
    if (typeof window !== "undefined") localStorage.setItem("locale", next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
    // Persist to user profile (best-effort; ignore failure for logged-out users)
    fetch("/api/users/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    }).catch(() => {});
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

export { LOCALES, type Locale } from "./i18n/normalizeLocale";
