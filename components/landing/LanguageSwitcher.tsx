import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { languages } from "@/lib/i18n/config";
import { useTranslation } from "@/lib/contexts/TranslationContext";

interface LanguageSwitcherProps {
  onLanguageChange?: (language: string) => void;
  className?: string;
}

export const LanguageSwitcher = memo(
  ({ onLanguageChange, className = "" }: LanguageSwitcherProps) => {
    const { currentLanguage, setLanguage } = useTranslation();
    const pathname = usePathname();

    const currentLangObj = languages.find((l) => l.code === currentLanguage);
    const isPortalRoute = pathname.startsWith("/portal");

    const toggleLanguage = useCallback(
      (e: React.MouseEvent) => {
        // Prevent the event from bubbling up to any parent forms
        e.preventDefault();
        e.stopPropagation();

        if (isPortalRoute) {
          return;
        }

        const currentIndex = languages.findIndex(
          (l) => l.code === currentLanguage,
        );
        const nextIndex = (currentIndex + 1) % languages.length;
        const nextLang = languages[nextIndex]?.code || "en";
        const nextLangName = languages[nextIndex]?.name || "English";

        // Update language via context
        setLanguage(nextLang);

        // Call the callback if provided (for onboarding step)
        if (onLanguageChange) {
          onLanguageChange(nextLangName);
        }
      },
      [currentLanguage, isPortalRoute, onLanguageChange, setLanguage],
    );

    // Don't render the switcher in portal routes
    if (isPortalRoute) {
      return null;
    }

    return (
      <button
        onClick={toggleLanguage}
        type="button" // Explicitly set type to prevent form submission
        className={`relative overflow-visible text-xs text-jumbo-elements-textSecondary hover:text-jumbo-elements-textPrimary transition-colors bg-transparent ${className}`}
        aria-label="Switch language"
      >
        <div className="relative w-[70px] h-[16px] overflow-visible">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentLanguage}
              className="absolute inset-0 flex items-center justify-start whitespace-nowrap truncate translate-y-[1px] select-none"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              transition={{
                duration: 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {currentLangObj?.name}
            </motion.span>
          </AnimatePresence>
        </div>
      </button>
    );
  },
);

LanguageSwitcher.displayName = "LanguageSwitcher";
