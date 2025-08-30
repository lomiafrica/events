"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";
import { cn } from "@/lib/actions/utils";
import Image from "next/image";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "overflow-y-auto bg-gradient-to-b from-sidebar to-background text-white border-slate-700",
          isMobile ? "max-w-[90vw] max-h-[80vh] mx-4" : "max-w-lg max-h-[70vh]",
        )}
        style={{
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        <DialogHeader className="relative">
          <DialogTitle className="text-center">
            <Image
              src="/code.webp"
              alt="Djaouli Code"
              width={isMobile ? 120 : 140}
              height={20}
              className="object-contain mx-auto"
            />
          </DialogTitle>
          <button
            onClick={handleClose}
            className={cn(
              "absolute rounded-sm transition-colors flex items-center justify-center",
              isMobile
                ? "right-2 top-2 w-8 h-8 bg-white/10 hover:bg-white/20"
                : "right-4 top-4 p-1 hover:bg-white/10",
            )}
            aria-label="Close"
          >
            <X
              className={cn(
                "text-white/70 hover:text-white",
                isMobile ? "h-5 w-5" : "h-4 w-4",
              )}
            />
          </button>
        </DialogHeader>
        <div className={cn("pb-2", isMobile ? "px-2" : "px-3")}>
          <div className="grid gap-3 grid-cols-1">{itemsToRender}</div>
        </div>

        {/* Gotcha! Button */}
        <div
          className={cn(
            "flex justify-center pt-2 pb-4",
            isMobile ? "px-2" : "px-3",
          )}
        >
          <button
            onClick={handleClose}
            className={cn(
              "bg-blue-600 hover:bg-blue-700",
              "text-white font-bold rounded-sm transition-all duration-200",
              "shadow-lg hover:shadow-xl transform hover:scale-105",
              isMobile
                ? "px-6 py-3 text-sm min-w-[120px]"
                : "px-8 py-3 text-base min-w-[140px]",
            )}
          >
            Gotcha!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CodeItemProps {
  number: string;
  titleKey: string;
  descriptionKey: string;
  lang: string;
  isMobile: boolean;
}

function CodeItem({
  number,
  titleKey,
  descriptionKey,
  lang,
  isMobile,
}: CodeItemProps) {
  return (
    <div
      className={cn(
        "border w-full rounded-sm overflow-hidden shadow-lg",
        "bg-background",
        "border-slate-700 md:border-slate-800",
        "h-full flex flex-col",
      )}
    >
      <div
        className={cn(
          "size-full bg-repeat p-1",
          "bg-dot-pattern-light dark:bg-dot-pattern",
          "bg-[length:20px_20px]",
        )}
      >
        <div
          className={cn(
            "size-full bg-gradient-to-br",
            "from-background/95 via-background/70 to-background/40",
            "rounded-sm flex flex-col flex-grow",
            isMobile ? "p-3" : "p-4",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isMobile ? "mb-1" : "mb-1.5",
            )}
          >
            <h3
              className={cn(
                "text-slate-400 font-semibold",
                isMobile ? "text-xs" : "text-sm",
              )}
            >
              {t(lang, "djaouliCode.prefix")} {number}.
            </h3>
          </div>
          <div
            className={cn(
              "text-gray-100 font-bold uppercase leading-tight",
              isMobile ? "text-sm mb-1" : "text-base mb-1.5",
            )}
          >
            {t(lang, titleKey)}
          </div>
          <p
            className={cn(
              "text-gray-400 italic leading-relaxed flex-grow",
              isMobile ? "text-xs" : "text-sm",
            )}
          >
            {t(lang, descriptionKey)}
          </p>
        </div>
      </div>
    </div>
  );
}
