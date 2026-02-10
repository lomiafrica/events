"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  getButtonTheme,
  type ButtonThemeClasses,
} from "@/lib/theme/buttonColors";

interface ThemeContextType {
  /** Site-wide primary button color name from Sanity (e.g. "teal", "red") */
  primaryButtonColor: string;
  /** Precomputed Tailwind classes for themed buttons (cart, floating promo, etc.) */
  button: ButtonThemeClasses;
}

const defaultButton = getButtonTheme("teal");

const ThemeContext = createContext<ThemeContextType>({
  primaryButtonColor: "teal",
  button: defaultButton,
});

/** Provider for button/accent theme from Sanity. Use inside app layout. */
export function ButtonThemeProvider({
  children,
  primaryButtonColor = "teal",
}: {
  children: React.ReactNode;
  primaryButtonColor?: string;
}) {
  const value = useMemo(
    () => ({
      primaryButtonColor,
      button: getButtonTheme(primaryButtonColor),
    }),
    [primaryButtonColor],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      primaryButtonColor: "teal" as const,
      button: defaultButton,
    };
  }
  return context;
}
