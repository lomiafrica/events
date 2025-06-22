"use client";

import { useState, useEffect } from "react";
import { X, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface FloatingPromoProps {
  imageUrl?: string;
  onClose?: () => void;
  onButtonClick?: () => void;
  href?: string;
  title?: string;
  buttonText?: string;
}

export default function FloatingPromo({
  imageUrl = "/placeholder.svg?height=180&width=320",
  onClose = () => {},
  onButtonClick = () => {},
  href,
  title = "Promotional event flyer",
  buttonText = "Get your ticket",
}: FloatingPromoProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow for animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
      transition={{ duration: 0.3 }}
      className="fixed z-50 
                 right-4 bottom-4 w-[160px]  // Mobile: smaller, lower, less horizontal space
                 sm:right-6 sm:bottom-6 sm:w-[180px] // Small screens: default size & pos
                 md:right-8 md:bottom-16 md:w-[200px] // Medium screens and up: larger, higher up
                 lg:right-10 lg:bottom-20 lg:w-[220px] // Larger screens: even more offset and larger
                 "
    >
      {/* Close button - positioned as a separate element */}
      <div className="absolute -top-3 -right-3 z-20">
        <button
          onClick={handleClose}
          className="bg-[#2a2a2a] rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-[#3a3a3a] transition-colors border border-gray-700"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5 text-gray-300" />
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden border border-gray-800 relative">
        {/* Traffic light buttons */}
        <div className="flex items-center px-2 py-1.5 bg-[#252525]">
          <div className="flex space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2 h-2 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2 h-2 rounded-full bg-[#27c93f]"></div>
          </div>
        </div>

        {/* Image - 16:9 ratio */}
        <div className="relative w-full aspect-video">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Button */}
        <div className="w-full">
          {href ? (
            <Link href={href} passHref legacyBehavior>
              <a className="w-full py-2.5 px-4 bg-blue-600/80 hover:bg-blue-500/90 text-white text-sm font-medium transition-colors rounded-b-lg text-center flex items-center justify-center">
                <PartyPopper className="h-3.5 w-3.5 mr-1.5" />
                {buttonText}
              </a>
            </Link>
          ) : (
            <button
              onClick={onButtonClick}
              className="w-full py-2.5 px-4 bg-blue-600/80 hover:bg-blue-500/90 text-white text-sm font-medium transition-colors rounded-b-lg flex items-center justify-center"
            >
              <PartyPopper className="h-3.5 w-3.5 mr-1.5" />
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
