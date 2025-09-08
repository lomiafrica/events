"use client";

import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";

import { IG } from "@/components/icons/IG";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import Barcode from "@/components/ui/barcode";
import { Soundcloud } from "@/components/icons/Soundcloud";
import AnimatedTextCycle from "@/components/ui/animated-text";
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

export default function Footer() {
  const { currentLanguage } = useTranslation();

  const footerLinks = [
    { href: "", labelKey: "footer.links.terms", icon: Newspaper },
    { href: "", labelKey: "footer.links.privacy", icon: Newspaper },
  ];

  const animatedWordsKeys = [
    "footer.animatedWords.freedom",
    "footer.animatedWords.energy",
    "footer.animatedWords.respect",
  ];

  return (
    <footer className="bg-gradient-to-b from-sidebar to-background pt-2 pb-6 select-none">
      <div className="container mx-auto px-4 lg:px-8">
        {/* --- Top Section (Single Row): Brand -> Icons -> Toggle --- */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 md:gap-6">
          {/* Brand Info */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-x-2 -ml-2 mt-5"
              aria-label="Djaouli Ent."
            >
              <Image
                src={"/white.svg"}
                alt="Djaouli Ent. Logo"
                width={160}
                height={50}
                priority
              />
            </Link>
            <div className="text-muted-foreground text-xs mt-1 mb-1 max-w-xs">
              {t(currentLanguage, "footer.tagline.intro")}{" "}
              <AnimatedTextCycle
                words={animatedWordsKeys.map((key) => t(currentLanguage, key))}
                interval={5000}
                className="font-extrabold"
              />{" "}
              {t(currentLanguage, "footer.tagline.outro")}
            </div>
          </div>

          {/* --- Right Aligned Group: Icons ONLY --- */}
          <div className="flex items-center gap-x-2">
            {/* Contact/Social Icons (Using custom icons) */}
            <ul className="flex items-center space-x-2 list-none flex-wrap justify-center">
              {/* WhatsApp */}
              <li>
                <Link
                  href="https://chat.whatsapp.com/BxTiBjirPMzFbCTAZ4eJqC?fbclid=PAZXh0bgNhZW0CMTEAAadv_FFXVz71jmu9zE5cSsaFB9b5cvqGivmL3cFD8hKPD_OtuwKXffahUqI3sw_aem_KaHbiZrZBfI2Yzzn-ozjKw"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xs text-white transition-colors hover:text-[#25D366]"
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
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xs text-white transition-colors hover:text-[#ff5500]"
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
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xs transition-colors text-white hover:text-[#1877F2]"
                >
                  <FacebookIcon className="h-[19.5px] w-[19.5px]" />
                </Link>
              </li>
              {/* Instagram */}
              <li>
                <Link
                  href="https://www.instagram.com/djaouli_ent/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xs transition-colors text-white hover:text-[#E4405F]"
                >
                  <IG className="h-[23px] w-[23px]" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* --- Bottom Section (Single Row): Copyright / Links --- */}
        <div className="border-t mt-6 pt-6 grid gap-4 md:gap-8 md:grid-cols-2 items-start">
          {/* Copyright - Moved first and aligned left */}
          <div className="text-xs text-muted-foreground text-center md:text-left md:col-span-1">
            {t(currentLanguage, "footer.copyright", {
              year: new Date().getFullYear(),
            })}
          </div>

          {/* Combined Footer Links - Moved second */}
          <nav className="md:col-span-1">
            <ul className="list-none flex text-xs flex-wrap justify-center md:justify-end gap-x-4 gap-y-1 items-center">
              {footerLinks.map((link, i) => (
                <li key={`footer-link-${i}`} className="shrink-0">
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    {t(currentLanguage, link.labelKey)}
                  </Link>
                </li>
              ))}
              <li className="shrink-0">
                <LanguageSwitcher className="text-muted-foreground hover:text-foreground" />
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Barcode remains untouched at the bottom */}
      <div className="w-full mt-16">
        <Barcode />
      </div>
    </footer>
  );
}
