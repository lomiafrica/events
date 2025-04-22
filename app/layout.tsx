import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/react"


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Djaouli Ent. | Events in Côte d'Ivoire",
  description:
    "Experience the best events in Côte d'Ivoire with Djaouli Entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex-grow">{children}</main>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
