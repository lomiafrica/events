"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "../ui/sheet";
import styles from "@/lib/styles/header.module.css";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface NavItem {
  nameKey: string;
  path: string;
  isComingSoon?: boolean;
  isComingSoonBadgeOnly?: boolean;
}

export default function Header() {
  const [isScrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { currentLanguage } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems: NavItem[] = [
    { nameKey: "header.nav.home", path: "/" },
    { nameKey: "header.nav.events", path: "/events" },
    { nameKey: "header.nav.gallery", path: "/gallery" },
    { nameKey: "header.nav.shop", path: "/shop", isComingSoon: true },
    { nameKey: "header.nav.blog", path: "/blog", isComingSoonBadgeOnly: true },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.headerContent}>
        <Link href="/" className="flex items-center" aria-label="Djaouli Ent.">
          <Image
            src={"/white.svg"}
            alt="Djaouli Ent. Logo"
            width={120}
            height={37.5}
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item: NavItem) => {
            if (item.isComingSoon) {
              return (
                <span
                  key={item.path}
                  className={`${styles.navLink} ${styles.disabledNavLink}`}
                >
                  {t(currentLanguage, item.nameKey)}
                  <span className={styles.comingSoonBadge}>
                    {t(currentLanguage, "header.nav.soon")}
                  </span>
                </span>
              );
            }
            if (item.isComingSoonBadgeOnly) {
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navLink} ${isActive(item.path) ? styles.activeNavLink : ""}`}
                >
                  {t(currentLanguage, item.nameKey)}
                  <span
                    className={styles.comingSoonBadge}
                    style={{ marginLeft: "8px" }}
                  >
                    {t(currentLanguage, "header.nav.soon")}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navLink} ${isActive(item.path) ? styles.activeNavLink : ""}`}
              >
                {t(currentLanguage, item.nameKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className={`${styles.mobileMenuButton} bg-transparent border-none hover:bg-transparent focus:ring-0`}
              >
                <Menu className="h-5 w-5 text-white" />
                <span className="sr-only">
                  {t(currentLanguage, "header.mobileMenu.toggle")}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="top"
              className={`${styles.customSheetContent} bg-zinc-900 text-white h-screen w-screen p-16 duration-200 flex flex-col items-start justify-start`}
            >
              <SheetTitle className="sr-only">
                {t(currentLanguage, "header.mobileMenu.title")}
              </SheetTitle>

              <div className="absolute top-4 right-4">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-zinc-800 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                    <span className="sr-only">
                      {t(currentLanguage, "header.mobileMenu.close")}
                    </span>
                  </Button>
                </SheetClose>
              </div>

              <div className="mt-16 flex flex-col gap-8 text-left w-auto">
                {navItems.map((item: NavItem) => {
                  if (item.isComingSoon) {
                    return (
                      <div
                        key={item.path}
                        className={`${styles.mobileNavLink} ${styles.disabledMobileNavLink}`}
                      >
                        {t(currentLanguage, item.nameKey)}
                        <span className={styles.comingSoonBadge}>
                          {t(currentLanguage, "header.nav.soon")}
                        </span>
                      </div>
                    );
                  }
                  if (item.isComingSoonBadgeOnly) {
                    return (
                      <SheetClose asChild key={item.path}>
                        <Link
                          href={item.path}
                          className={`${styles.mobileNavLink} ${isActive(item.path) ? styles.activeMobileNavLink : ""} text-3xl font-semibold text-white hover:text-gray-400 border-none`}
                        >
                          {t(currentLanguage, item.nameKey)}
                          <span
                            className={styles.comingSoonBadge}
                            style={{
                              marginLeft: "8px",
                              fontSize: "0.5em",
                            }}
                          >
                            {t(currentLanguage, "header.nav.soon")}
                          </span>
                        </Link>
                      </SheetClose>
                    );
                  }
                  return (
                    <SheetClose asChild key={item.path}>
                      <Link
                        href={item.path}
                        className={`${styles.mobileNavLink} ${isActive(item.path) ? styles.activeMobileNavLink : ""} text-3xl font-semibold text-white hover:text-gray-400 border-none`}
                      >
                        {t(currentLanguage, item.nameKey)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              <p className="mt-24 text-sm text-bold text-zinc-400 max-w-md">
                {t(currentLanguage, "header.mobileMenu.description")}
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
