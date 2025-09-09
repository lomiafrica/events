"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const codeItemsData = [
  {
    number: "1",
    titleKey: "djaouliCode.item1.title",
    descriptionKey: "djaouliCode.item1.description",
  },
  {
    number: "2",
    titleKey: "djaouliCode.item2.title",
    descriptionKey: "djaouliCode.item2.description",
  },
  {
    number: "3",
    titleKey: "djaouliCode.item3.title",
    descriptionKey: "djaouliCode.item3.description",
  },
  {
    number: "4",
    titleKey: "djaouliCode.item4.title",
    descriptionKey: "djaouliCode.item4.description",
  },
  {
    number: "5",
    titleKey: "djaouliCode.item5.title",
    descriptionKey: "djaouliCode.item5.description",
  },
  {
    number: "6",
    titleKey: "djaouliCode.item6.title",
    descriptionKey: "djaouliCode.item6.description",
  },
  {
    number: "7",
    titleKey: "djaouliCode.item7.title",
    descriptionKey: "djaouliCode.item7.description",
  },
  {
    number: "8",
    titleKey: "djaouliCode.item8.title",
    descriptionKey: "djaouliCode.item8.description",
  },
  {
    number: "9",
    titleKey: "djaouliCode.item9.title",
    descriptionKey: "djaouliCode.item9.description",
  },
  {
    number: "10",
    titleKey: "djaouliCode.item10.title",
    descriptionKey: "djaouliCode.item10.description",
  },
  {
    number: "11",
    titleKey: "djaouliCode.item11.title",
    descriptionKey: "djaouliCode.item11.description",
  },
];

interface DjaouliCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DjaouliCodeDialog({
  isOpen,
  onClose,
}: DjaouliCodeDialogProps) {
  const { currentLanguage } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // Check if dialog has been shown before
    const hasShown = localStorage.getItem("djaouli-code-shown") === "true";
    setHasBeenShown(hasShown);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleClose = () => {
    // Mark as shown in localStorage
    localStorage.setItem("djaouli-code-shown", "true");
    setHasBeenShown(true);
    onClose();
  };

  // Don't show if already shown
  if (hasBeenShown && !isOpen) {
    return null;
  }

  // Only render portal content if mounted
  if (!isMounted) return null;

  const itemsToRender = [];
  const totalItems = codeItemsData.length;
  for (let i = 0; i < totalItems; i++) {
    itemsToRender.push(
      <CodeItem
        key={codeItemsData[i].number}
        number={codeItemsData[i].number}
        titleKey={codeItemsData[i].titleKey}
        descriptionKey={codeItemsData[i].descriptionKey}
        lang={currentLanguage}
        isMobile={isMobile}
      />,
    );
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[60] bg-foreground/30 will-change-auto cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 bottom-0 left-0 flex w-full md:w-[500px] p-4 z-[70] will-change-transform pointer-events-auto"
            style={{ position: "fixed", top: 0, left: 0, bottom: 0 }}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling to backdrop
          >
            <div className="flex flex-col w-full bg-[#1a1a1a] backdrop-blur-xl rounded-xs shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center px-3 md:px-4 py-6 mb-0">
                <div className="flex-1">
                  <Image
                    src="/code.webp"
                    alt="Djaouli Code"
                    width={140}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-muted/50"
                  aria-label="Close modal"
                  onClick={handleClose}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-3 md:px-4">
                <div className="py-4">
                  <div className="grid gap-3 grid-cols-1">{itemsToRender}</div>
                </div>
              </div>

              {/* Footer with Gotcha Button */}
              <div className="px-3 md:px-4 py-4 border-t border-border">
                <button
                  onClick={handleClose}
                  className="bg-teal-800 hover:bg-teal-700 text-teal-200 rounded-xs text-sm w-full font-medium h-10 transition-all shadow-lg hover:shadow-xl transform hover:scale-[0.98] active:scale-[0.95]"
                >
                  Gotcha!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface CodeItemProps {
  number: string;
  titleKey: string;
  descriptionKey: string;
  lang: string;
  isMobile: boolean;
}

function CodeItem({ number, titleKey, descriptionKey, lang }: CodeItemProps) {
  return (
    <div className="bg-muted/30 p-3 rounded-xs border border-slate-700">
      <div className="flex items-start gap-3">
        <div className="text-primary font-semibold text-sm flex-shrink-0">
          {number}.
        </div>
        <div className="flex-1">
          <h4 className="text-gray-100 font-bold text-sm uppercase leading-tight mb-2">
            {t(lang, titleKey)}
          </h4>
          <p className="text-gray-400 leading-relaxed text-sm">
            {t(lang, descriptionKey)}
          </p>
        </div>
      </div>
    </div>
  );
}
