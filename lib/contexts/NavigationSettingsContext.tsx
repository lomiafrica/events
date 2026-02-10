"use client";

import React, { createContext, useContext } from "react";

export interface NavigationSettings {
  showBlogInNavigation: boolean;
  showGalleryInNavigation: boolean;
}

const defaultSettings: NavigationSettings = {
  showBlogInNavigation: true,
  showGalleryInNavigation: true,
};

const NavigationSettingsContext = createContext<NavigationSettings>(defaultSettings);

export function NavigationSettingsProvider({
  children,
  showBlogInNavigation = true,
  showGalleryInNavigation = true,
}: {
  children: React.ReactNode;
  showBlogInNavigation?: boolean;
  showGalleryInNavigation?: boolean;
}) {
  const value: NavigationSettings = {
    showBlogInNavigation,
    showGalleryInNavigation,
  };
  return (
    <NavigationSettingsContext.Provider value={value}>
      {children}
    </NavigationSettingsContext.Provider>
  );
}

export function useNavigationSettings(): NavigationSettings {
  const context = useContext(NavigationSettingsContext);
  return context ?? defaultSettings;
}
