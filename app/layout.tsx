import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { TranslationProvider } from "@/lib/contexts/TranslationContext";
import { NavigationSettingsProvider } from "@/lib/contexts/NavigationSettingsContext";
import { CartProvider } from "@/components/merch/cart/cart-context";
import { WishlistProvider } from "@/components/merch/wishlist/wishlist-context";
import { FacebookPixel } from "@/components/ui/FacebookPixel";
import {
  getNavigationSettings,
  getHomepageThemeSettings,
} from "@/lib/sanity/queries";
import { ButtonThemeProvider } from "@/lib/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

const siteConfig = {
  name: "Djaouli Ent.",
  description: "Breaking musical boundaries since 2022.",
  url: "https://djaoulient.com",
  ogImage: "/banner.webp",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@lomiafrica",
    site: "https://lomi.africa",
  },
  // Optional: Add robots and manifest info if needed
  // robots: { index: true, follow: true },
  // manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [navSettings, themeSettings] = await Promise.all([
    getNavigationSettings(),
    getHomepageThemeSettings(),
  ]);
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <FacebookPixel />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ButtonThemeProvider
            primaryButtonColor={themeSettings.primaryButtonColor}
          >
            <NavigationSettingsProvider
              showBlogInNavigation={navSettings.showBlogInNavigation}
              showGalleryInNavigation={navSettings.showGalleryInNavigation}
            >
              <TranslationProvider>
                <CartProvider>
                  <WishlistProvider>
                    <main className="grow">{children}</main>
                  </WishlistProvider>
                </CartProvider>
              </TranslationProvider>
            </NavigationSettingsProvider>
          </ButtonThemeProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
