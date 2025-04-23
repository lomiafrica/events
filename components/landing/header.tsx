"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "../ui/sheet";
import styles from "@/lib/styles/header.module.css";

export default function Header() {
  const [isScrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Events", path: "/events" },
    { name: "Gallery", path: "/gallery" },
    { name: "Shop", path: "/shop", isComingSoon: true },
    { name: "Blog", path: "/blog" },
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
          {navItems.map((item) => (
            item.isComingSoon ? (
              <span key={item.path} className={`${styles.navLink} ${styles.disabledNavLink}`}>
                {item.name}
                <span className={styles.comingSoonBadge}>Soon</span>
              </span>
            ) : (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navLink} ${isActive(item.path) ? styles.activeNavLink : ""}`}
              >
                {item.name}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className={`${styles.mobileMenuButton} bg-transparent border-none hover:bg-transparent focus:ring-0`}
              >
                <Menu className="h-5 w-5 text-white" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="top"
              className={`${styles.customSheetContent} bg-zinc-900 text-white h-screen w-screen p-16 duration-200 flex flex-col items-start justify-start`}
            >
              <SheetTitle className="sr-only">Mobile Menu</SheetTitle>

              <div className="absolute top-4 right-4">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800 hover:text-white">
                    <X className="h-6 w-6" />
                    <span className="sr-only">Close menu</span>
                  </Button>
                </SheetClose>
              </div>

              <div className="mt-16 flex flex-col gap-8 text-left w-auto">
                {navItems.map((item) => (
                  item.isComingSoon ? (
                    <div key={item.path} className={`${styles.mobileNavLink} ${styles.disabledMobileNavLink}`}>
                      {item.name}
                      <span className={styles.comingSoonBadge}>Soon</span>
                    </div>
                  ) : (
                    <SheetClose asChild key={item.path}>
                      <Link
                        href={item.path}
                        className={`${styles.mobileNavLink} ${isActive(item.path) ? styles.activeMobileNavLink : ""} text-3xl font-semibold text-white hover:text-gray-400 border-none`}
                      >
                        {item.name}
                      </Link>
                    </SheetClose>
                  )
                ))}
              </div>

              <p className="mt-24 text-sm text-bold text-zinc-400 max-w-md">
                Djaouli Entertainment is a boundary-pushing DJ collective from Abidjan, Côte d&apos;Ivoire,
                creating spaces where musical freedom thrives and social barriers dissolve.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
