"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XIcon as TwitterIcon } from "@/components/icons/X";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { IG } from "@/components/icons/IG";
import { Facebook, Copy, Share2, Check } from "lucide-react";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface EventShareButtonProps {
  eventTitle: string;
  eventSlug: string;
}

export function EventShareButton({
  eventTitle,
  eventSlug,
}: EventShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const { currentLanguage } = useTranslation();

  // Construct URL client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/events/${eventSlug}`);
    }
  }, [eventSlug]);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(eventTitle);

  const baseButtonClasses =
    "flex items-center justify-start gap-2 text-left h-12 rounded-[5px] text-white transition-colors duration-200";

  // Define handleCopy function BEFORE shareOptions that uses it
  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        // Optional: Add a visual cue like a toast here if you re-introduce it
        console.log("Link copied!");
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        // Optional: Add error feedback
      });
  };

  const platformTranslations = {
    twitter: t(currentLanguage, "eventShare.platformTwitter"),
    facebook: t(currentLanguage, "eventShare.platformFacebook"),
    whatsapp: t(currentLanguage, "eventShare.platformWhatsApp"),
    instagram: t(currentLanguage, "eventShare.platformInstagram"),
  };

  const shareOptions = [
    {
      id: "twitter",
      name: platformTranslations.twitter,
      icon: <TwitterIcon className="h-5 w-5" />,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      className: `${baseButtonClasses} bg-black hover:bg-zinc-800 dark:bg-black dark:text-white dark:hover:bg-black`,
    },
    {
      id: "facebook",
      name: platformTranslations.facebook,
      icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: `${baseButtonClasses} bg-[#1877F2] hover:bg-[#166FE5] dark:bg-[#1877F2] dark:hover:bg-[#3B82F6]`,
    },
    {
      id: "whatsapp",
      name: platformTranslations.whatsapp,
      icon: <WhatsappIcon className="h-5 w-5" />,
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      className: `${baseButtonClasses} bg-[#128C7E] hover:bg-[#075E54] dark:bg-[#128C7E] dark:hover:bg-[#075E54]`,
    },
    {
      id: "instagram",
      name: platformTranslations.instagram,
      icon: <IG className="h-5 w-5" />,
      onClick: handleCopy,
      className: `${baseButtonClasses} bg-[#E1306C] hover:bg-[#C13584] dark:bg-[#E1306C] dark:hover:bg-[#C13584]`,
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Button to trigger the modal */}
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {t(currentLanguage, "eventShare.triggerButton")}
      </Button>

      {/* The Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] p-4 rounded-[5px] border border-border/40 bg-background backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Share2 className="h-5 w-5 mr-2" />{" "}
              {t(currentLanguage, "eventShare.modalTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(currentLanguage, "eventShare.modalDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {shareOptions.map((option) => {
              if (option.url) {
                // Render link button
                return (
                  <Button
                    key={option.id}
                    variant="default"
                    className={option.className}
                    asChild
                  >
                    <a
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {option.icon}
                      <span>{option.name}</span>
                    </a>
                  </Button>
                );
              } else if (option.onClick) {
                // Render action button
                return (
                  <Button
                    key={option.id}
                    variant="default"
                    className={option.className}
                    onClick={option.onClick}
                  >
                    {option.icon}
                    <span>{option.name}</span>
                  </Button>
                );
              }
              return null; // Should not happen with current config
            })}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 -mt-2">
            <div className="flex items-center space-x-2 flex-1">
              <Input
                id="link"
                value={shareUrl}
                readOnly
                className="flex-1 rounded-[5px]"
                placeholder={t(currentLanguage, "eventShare.inputPlaceholder")}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="rounded-[5px] hover:bg-accent/30"
                disabled={!shareUrl}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {copied
                    ? t(currentLanguage, "eventShare.copyButtonCopied")
                    : t(currentLanguage, "eventShare.copyButtonCopy")}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
