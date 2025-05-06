"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Language } from "@/lib/i18n/config";
import { languages } from "@/lib/i18n/config";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "@/lib/utils/localStorage";

interface TranslationContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType>({
  currentLanguage: "en",
  setLanguage: () => {},
});

// Main provider component
export function TranslationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");

  useEffect(() => {
    // Try to get language from localStorage
    const savedLanguage = getLocalStorageItem("jumbo.language");

    if (
      savedLanguage &&
      languages.some((lang) => lang.code === savedLanguage)
    ) {
      setCurrentLanguage(savedLanguage as Language);
    } else {
      // Try to detect browser language
      if (typeof navigator !== "undefined") {
        const browserLang = navigator.language.split("-")[0];

        if (languages.some((lang) => lang.code === browserLang)) {
          setCurrentLanguage(browserLang as Language);
        }
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    setLocalStorageItem("jumbo.language", lang);
  };

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

// Hook component
export function useTranslation() {
  const context = useContext(TranslationContext);

  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }

  return context;
}
