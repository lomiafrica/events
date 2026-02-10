"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

export default function Barcode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentLanguage } = useTranslation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas - REMOVED to make background transparent
    // ctx.fillStyle = "white"
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw barcode with a lighter grey color
    ctx.fillStyle = "hsl(0, 0%, 70%)"; // Changed from white to grey

    // Generate random barcode pattern
    let x = 0;
    while (x < canvas.width) {
      // Random bar width between 1 and 4 pixels
      const barWidth = Math.floor(Math.random() * 4) + 1;

      // Random decision to draw a bar or leave a gap
      if (Math.random() > 0.4) {
        ctx.fillRect(x, 0, barWidth, canvas.height);
      }

      // Move to next position with a small random gap
      x += barWidth + (Math.random() > 0.7 ? 1 : 0);
    }
  }, []);

  return (
    <div className="w-11/12 md:w-3/4 relative my-8 mx-auto select-none">
      <div className="relative opacity-45 brightness-200">
        <canvas ref={canvasRef} className="w-full h-26" />
        <div className="absolute top-2/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 sm:px-4 text-center">
          <span className="text-sm tracking-normal sm:tracking-widest font-medium text-white">
            M A D E &nbsp; I N &nbsp; B A B I
          </span>
        </div>
      </div>
      <a
        href="https://github.com/djaoulient/djaoulient.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute -bottom-6 right-0 text-xs text-muted-foreground font-mono hover:text-foreground underline-offset-4 hover:underline transition-colors"
      >
        {t(currentLanguage, "barcode.opensource")}
      </a>
    </div>
  );
}
