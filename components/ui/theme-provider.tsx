"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force dark theme and disable system preference
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark" // Force dark theme
      enableSystem={false} // Disable system theme detection
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
