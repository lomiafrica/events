"use client";

// Remove unused imports
// import { useState, useEffect } from 'react';
import Link from "next/link"
// Remove useTheme import
// import { useTheme } from "next-themes";
import { IG } from "@/components/icons/IG";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
// Remove ThemeToggle import
// import { ThemeToggle } from "@/components/ui/theme-toggle"
import Barcode from "@/components/ui/barcode"
import { Soundcloud } from "@/components/icons/Soundcloud";
import Image from "next/image";

// Define the new footer links
const footerLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/events", label: "Events" },
  { href: "/story", label: "Story" },
  { href: "/code", label: "Code" },
]

export default function Footer() {
  // Removed theme state and effect

  return (
    <footer className="bg-gradient-to-b from-sidebar to-background pt-2 pb-6 select-none">
      <div className="container mx-auto px-4 lg:px-8">
        {/* --- Top Section (Single Row): Brand -> Icons -> Toggle --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
          {/* Brand Info */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-x-2 -ml-2 mt-5" aria-label="Djaouli Ent.">
              <Image
                src={'/white.svg'}
                alt="Djaouli Ent. Logo"
                width={160}
                height={50}
                priority
              />
            </Link>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs">
              Bringing the best events to Côte d&apos;Ivoire since 2015.
            </p>
          </div>

          {/* --- Right Aligned Group: Icons ONLY --- */}
          <div className="flex items-center gap-x-2">
            {/* Contact/Social Icons (Using custom icons) */}
            <ul className="flex items-center space-x-2 list-none flex-wrap justify-center">
              {/* Email */}
              {/* <li>
                <Link
                  href="mailto:hello@djaoulient.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-[#4285F4] dark:hover:text-[#4285F4]"
                >
                  <MailIcon className="h-[23px] w-[23px]" />
                </Link>
              </li> */}
              {/* WhatsApp */}
              <li>
                <Link
                  href="https://chat.whatsapp.com/BxTiBjirPMzFbCTAZ4eJqC?fbclid=PAZXh0bgNhZW0CMTEAAadv_FFXVz71jmu9zE5cSsaFB9b5cvqGivmL3cFD8hKPD_OtuwKXffahUqI3sw_aem_KaHbiZrZBfI2Yzzn-ozjKw"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-white transition-colors hover:text-[#25D366]"
                >
                  <WhatsappIcon className="h-[22px] w-[22px]" />
                </Link>
              </li>
              {/* Soundcloud */}
              <li>
                <Link
                  href="https://soundcloud.com/djaouli-entertainement"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Soundcloud"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-white transition-colors hover:text-[#ff5500]"
                >
                  <Soundcloud className="h-[20px] w-[20px]" />
                </Link>
              </li>
              {/* Facebook */}
              <li>
                <Link
                  href="https://www.facebook.com/people/Djaouli-Entertainment/61551486973759/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm transition-colors text-white hover:text-[#1877F2]"
                >
                  <FacebookIcon className="h-[19.5px] w-[19.5px]" />
                </Link>
              </li>
              {/* Instagram */}
              <li>
                <Link
                  href="https://www.instagram.com/djaoulient/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm transition-colors text-white hover:text-[#E4405F]"
                >
                  <IG className="h-[23px] w-[23px]" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* --- Bottom Section (Single Row): Copyright / Links --- */}
        <div className="border-t mt-6 pt-6 grid gap-8 md:grid-cols-2 items-start">
          {/* Copyright - Moved first and aligned left */}
          <div className="text-xs text-muted-foreground md:text-left md:col-span-1">
            &copy; {new Date().getFullYear()} Djaouli Entertainment — All rights reserved.
          </div>

          {/* Combined Footer Links - Moved second */}
          <nav className="md:col-span-1">
            <ul className="list-none flex  text-xs flex-wrap justify-center md:justify-end gap-x-4 gap-y-1">
              {footerLinks.map((link, i) => (
                <li key={`footer-${i}`} className="shrink-0">
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Barcode remains untouched at the bottom */}
      <div className="w-full mt-4">
        <Barcode />
      </div>
    </footer>
  )
}

