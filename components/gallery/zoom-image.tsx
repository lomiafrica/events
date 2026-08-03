"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ImageProps } from "@/lib/utils/types";
import { Download } from "lucide-react";
import { useIsMobile } from "@/lib/utils/use-is-mobile";

type ZoomImageProps = {
  images: ImageProps[];
  initialIndex: number;
  sectionTitle?: string;
  onClose: () => void;
};

export function ZoomImage({
  images,
  initialIndex,
  sectionTitle,
  onClose,
}: ZoomImageProps) {
  const isMobile = useIsMobile();
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = document.getElementById(`zoom-image-${initialIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [initialIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    setZoomedIndex(null);
    onClose();
  };

  const handleImageClick = (index: number) => {
    if (!isMobile) return;

    setZoomedIndex((current) => (current === index ? null : index));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sectionTitle ? `Gallery: ${sectionTitle}` : "Gallery zoom"}
      className="fixed inset-0 z-[80] bg-black/90 pt-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col overflow-x-hidden overscroll-contain"
      onClick={handleClose}
    >
      {sectionTitle && (
        <div className="flex-shrink-0 text-center py-2 text-white/80 text-sm font-medium">
          {sectionTitle}
        </div>
      )}
      {/* Scrollable vertical column of images */}
      <div className="mx-auto max-w-5xl w-full flex-1 min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex flex-col items-center gap-8 py-4">
          {images.map((img, index) => {
            const numericWidth = parseInt(img.width, 10);
            const numericHeight = parseInt(img.height, 10);
            const isValidDimensions =
              !isNaN(numericWidth) && !isNaN(numericHeight);
            const isLandscape =
              isValidDimensions && numericWidth > numericHeight;

            const baseUrl = img.url.split("?")[0];
            // Request at most the original width, but cap for performance
            const imageSrcWidth = isValidDimensions
              ? Math.min(numericWidth, 1600)
              : isLandscape
                ? 1400
                : 1000;
            const imageSrc = `${baseUrl}?w=${imageSrcWidth}&auto=format&q=90`;

            // Full-size URL for download (original dimensions, cap at 4000px for very large images)
            const downloadWidth = isValidDimensions
              ? Math.min(numericWidth, 4000)
              : 4000;
            const downloadUrl = `${baseUrl}?w=${downloadWidth}&auto=format&q=95`;

            // Use original dimensions when available (no artificial upscaling)
            const baseWidth = isValidDimensions
              ? numericWidth
              : isLandscape
                ? 1400
                : 1000;
            const baseHeight = isValidDimensions
              ? numericHeight
              : isLandscape
                ? 900
                : 1200;

            const imageSizes = `(max-width: 767px) 90vw, ${
              isLandscape ? "70vw" : "55vw"
            }`;

            const isZoomed = isMobile && zoomedIndex === index;
            const imageMaxWidth = isZoomed ? "max-w-[100vw]" : "max-w-[70vw]";
            const imageMaxHeight = isZoomed ? "max-h-[85vh]" : "max-h-[65vh]";

            return (
              <div
                key={img.id ?? index}
                id={`zoom-image-${index}`}
                className="w-full flex justify-center"
              >
                <div
                  className="relative inline-block max-w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(index);
                  }}
                >
                  <Image
                    alt={
                      img.title
                        ? `Gallery - ${img.title}`
                        : `Gallery photo ${img.id ?? index}`
                    }
                    className={`object-contain rounded-md ${imageMaxHeight} ${imageMaxWidth}`}
                    style={{ transform: "translate3d(0, 0, 0)" }}
                    src={imageSrc}
                    width={baseWidth}
                    height={baseHeight}
                    sizes={imageSizes}
                    loading={index === initialIndex ? "eager" : "lazy"}
                  />

                  {/* Download button – inside image, bottom-right */}
                  <a
                    href={`/api/download-image?url=${encodeURIComponent(downloadUrl)}`}
                    className="absolute bottom-3 right-3 inline-flex items-center justify-center rounded-sm bg-black/80 px-2 py-1 text-white hover:bg-white hover:text-black border border-white/60 hover:border-white transition-colors shadow-md"
                    aria-label="Download image"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
