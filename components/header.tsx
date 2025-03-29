"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, ShoppingCart } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setIsMounted(true)

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Events", path: "/events" },
    { name: "Blog", path: "/blog" },
    { name: "Story", path: "/story" },
    { name: "Contact", path: "/contact" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${isScrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
    >
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          {isMounted && (
            <Image
              src={resolvedTheme === 'dark' ? "/white.svg" : "/dark.svg"}
              alt="Djaouli Entertainment Logo"
              width={120}
              height={40}
              priority
            />
          )}
          {!isMounted && <div style={{ width: 120, height: 40 }} />}
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              0
            </span>
          </Button>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="mb-6">
                {isMounted && (
                  <Link href="/" className="flex items-center">
                    <Image
                      src={resolvedTheme === 'dark' ? "/white.svg" : "/dark.svg"}
                      alt="Djaouli Ent. Logo"
                      width={100}
                      height={33}
                      priority
                    />
                  </Link>
                )}
                {!isMounted && <div style={{ width: 100, height: 33 }} />}
              </div>

              <div className="flex flex-col gap-8 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`text-lg font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

