"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { translations, Language, TranslationKey } from "@/lib/i18n/translations";
import { useEffect, useState } from "react";

export function useTranslation() {
  const { user } = useAuth();
  const [currentLang, setCurrentLang] = useState<Language>("pt-PT");

  // Sincronizar con el idioma del usuario o localStorage
  useEffect(() => {
    // Primero intentar localStorage para cambios inmediatos
    const savedLang = localStorage.getItem("userLanguage") as Language | null;
    if (savedLang && translations[savedLang]) {
      setCurrentLang(savedLang);
      return;
    }

    // Luego usar el idioma del usuario de la DB
    if (user?.language && translations[user.language as Language]) {
      setCurrentLang(user.language as Language);
    }
  }, [user?.language]);

  // Función para obtener traducción
  const t = (key: TranslationKey): string => {
    return translations[currentLang]?.[key] || key;
  };

  // Función para cambiar idioma manualmente
  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem("userLanguage", lang);
    document.documentElement.lang = lang.split("-")[0];
  };

  return {
    t,
    currentLang,
    setLanguage,
    languages: [
      { code: "pt-PT", label: "Português", flag: "🇵🇹" },
      { code: "es-ES", label: "Español", flag: "🇪🇸" },
      { code: "en-GB", label: "English", flag: "🇬🇧" },
    ] as const,
  };
}