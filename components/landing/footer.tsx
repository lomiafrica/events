import Link from "next/link"
// import React from "react"; // Remove unused import
// import { MailIcon } from "@/components/icons/MailIcon"; // Removed unused import
import { IG } from "@/components/icons/IG";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Barcode from "@/components/ui/barcode"
import { Soundcloud } from "@/components/icons/Soundcloud";

// Define the new footer links
const footerLinks = [
  { href: "/events", label: "Events" },
  { href: "/blog", label: "Blog" },
  { href: "/story", label: "Story" },
  { href: "/code", label: "Code" },
]

export default function Footer() {
  return (
    <footer className="bg-muted pt-8 pb-6">
      <div className="container mx-auto px-4 lg:px-8">
        {/* --- Top Section (Single Row): Brand -> Icons -> Toggle --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
          {/* Brand Info */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-x-2" aria-label="Djaouli Ent.">
              <span className="font-bold text-xl">Djaouli Ent.</span>
            </Link>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Bringing the best events to Côte d&apos;Ivoire since 2015.
            </p>
          </div>

          {/* --- Right Aligned Group: Icons + Toggle --- */}
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
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-[#25D366] dark:hover:text-[#25D366]"
                >
                  <WhatsappIcon className="h-[20px] w-[20px]" />
                </Link>
              </li>
              {/* Soundcloud */}
              <li>
                <Link
                  href="https://soundcloud.com/djaouli-entertainement"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Soundcloud"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-[#ff5500] dark:hover:text-[#ff5500]"
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
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm transition-colors
                 text-muted-foreground dark:text-white hover:text-[#1877F2] dark:hover:text-[#1877F2]"
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
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-[##E4405F] dark:hover:text-[#E4405F]"
                >
                  <IG className="h-[23px] w-[23px]" />
                </Link>
              </li>
              {/* GitHub */}
              <li>
                <Link
                  href="https://github.com/lomiafrica/events"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-[#6e5494] dark:hover:text-[#6e5494]"
                >
                  <GitHubIcon className="h-[20px] w-[20px]" />
                </Link>
              </li>
            </ul>

            {/* Separator */}
            <div className="h-6 w-px bg-border mx-2"></div>

            {/* Theme Toggle - Styled to match icon containers */}
            <ThemeToggle
              variant="ghost"
              className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground dark:text-white transition-colors hover:text-foreground cursor-pointer"
            />
          </div>
        </div>

        {/* --- Bottom Section (Single Row): Copyright / Links --- */}
        <div className="border-t mt-8 pt-8 grid gap-8 md:grid-cols-2 items-start">
          {/* Copyright - Moved first and aligned left */}
          <div className="text-sm text-muted-foreground md:text-left md:col-span-1"> {/* Removed text-center, md:text-center, self-center; Added md:text-left */}
            &copy; {new Date().getFullYear()} Djaouli Ent. All rights reserved.
          </div>

          {/* Combined Footer Links - Moved second */}
          <nav className="md:col-span-1">
            <ul className="list-none flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1">
              {/* Updated to use footerLinks */}
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
              {/* REMOVED mapping over legalLinks */}
            </ul>
          </nav>
        </div>
      </div>

      {/* Barcode remains untouched at the bottom */}
      <div className="w-full mt-4">
        <Barcode />
      </div>
    </footer >
  )
}

