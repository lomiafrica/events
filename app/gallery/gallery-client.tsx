"use client";

import Image from "next/image";
import React, { useState, useEffect, useMemo } from "react";
import type { ImageProps } from "@/lib/utils/types";
import LoadingSpinner from "@/components/ui/Bouncer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

// Renamed component to GalleryClientComponent
export default function GalleryClientComponent() {
  const { currentLanguage } = useTranslation();
  const [images, setImages] = useState<ImageProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImageId, setZoomedImageId] = useState<number | null>(null); // State for zoomed image ID
  const [isFurtherZoomed, setIsFurtherZoomed] = useState(false); // State for secondary zoom

  // Group images by gallery title (from Sanity gallery document title)
  const imagesByTitle = useMemo(() => {
    const groups: { title: string; images: ImageProps[] }[] = [];
    const titleOrder: string[] = [];
    const map = new Map<string, ImageProps[]>();

    for (const img of images) {
      const title =
        img.title?.trim() || t(currentLanguage, "galleryPage.untitledSection");
      if (!map.has(title)) {
        titleOrder.push(title);
        map.set(title, []);
      }
      map.get(title)!.push(img);
    }

    for (const title of titleOrder) {
      const list = map.get(title);
      if (list?.length) groups.push({ title, images: list });
    }
    return groups;
  }, [images, currentLanguage]);

  // Fetch images from the API route
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      console.log("[Gallery Client] Fetching images from API route...");
      try {
        const response = await fetch("/api/gallery-images"); // Call the API route

        if (!response.ok) {
          // Try to parse error message from API response body
          let errorMsg = `API Error: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMsg = errorData.error;
            }
          } catch (parseError) {
            // Ignore if response body is not JSON or empty
            console.error(
              "[Gallery Client] Failed to parse error response:",
              parseError,
            );
          }
          throw new Error(errorMsg);
        }

        const fetchedImages: ImageProps[] = await response.json();

        // Validate fetched data structure (optional but recommended)
        if (!Array.isArray(fetchedImages)) {
          console.error(
            "[Gallery Client] API response is not an array:",
            fetchedImages,
          );
          throw new Error("Invalid data format received from server.");
        }

        console.log(
          `[Gallery Client] Successfully fetched ${fetchedImages.length} images.`,
        );
        setImages(fetchedImages); // Update state with fetched images
      } catch (err) {
        console.error("[Gallery Client] Error fetching images from API:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unknown fetch error occurred",
        );
        setImages([]); // Ensure images array is empty on error
      } finally {
        setIsLoading(false);
        console.log("[Gallery Client] Image fetch attempt complete.");
      }
    };

    fetchImages();
  }, []); // Fetch only once on component mount

  // Find the image object based on zoomedImageId
  const zoomedImage =
    zoomedImageId !== null
      ? images.find((img) => img.id === zoomedImageId)
      : null;

  // Reset further zoom when modal closes or image changes
  useEffect(() => {
    if (!zoomedImage) {
      setIsFurtherZoomed(false);
    }
  }, [zoomedImage]);

  // --- Render Logic ---
  if (isLoading) {
    // Render only the spinner, Header/Footer are in the parent page
    return <LoadingSpinner />;
  }

  if (error) {
    // Render error message, Header/Footer are in the parent page
    return (
      <div className="flex justify-center items-center h-screen text-red-500 pt-20">
        Error loading gallery: {error}
      </div>
    );
  }

  // Function to handle closing the modal
  const handleCloseModal = () => {
    setZoomedImageId(null);
    // No need to reset isFurtherZoomed here, useEffect handles it
  };

  // Function to toggle further zoom on image click
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal close
    setIsFurtherZoomed((prev) => !prev); // Toggle further zoom state
  };

  // Return the main gallery content and modal
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-0 max-w-7xl">
        {/* Gallery Header Section */}
        <div className="relative pt-24 md:pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6">
              {t(currentLanguage, "galleryPage.title")}
            </h1>
            <div className="text-muted-foreground text-lg mt-4 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t(currentLanguage, "galleryPage.description")}
            </div>
          </div>
        </div>

        {/* Gallery Images Section */}
        <div className="pb-24">
          {/* Display error inline if needed, without blocking gallery */}
          {error && (
            <p className="text-center text-red-500 mb-4">
              Error loading images: {error}
            </p>
          )}
          {images.length === 0 && !isLoading && !error && (
            <p className="text-center">
              {t(currentLanguage, "galleryPage.noImages")}
            </p>
          )}

          {/* Sections grouped by gallery title (from Sanity gallery document) */}
          {imagesByTitle.map(
            ({ title: sectionTitle, images: sectionImages }) => (
              <section key={sectionTitle} className="mb-24 first:mt-0 mt-4">
                <h2 className="text-2xl sm:text-3xl font-medium text-zinc-800 dark:text-white mb-6 tracking-tight">
                  {sectionTitle}
                </h2>
                <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
                  {sectionImages.map(
                    ({ id, url, width, height, tags }, index) => {
                      const numericWidth = parseInt(width, 10);
                      const numericHeight = parseInt(height, 10);
                      return (
                        <div
                          key={`${sectionTitle}-${id}`}
                          onClick={() => setZoomedImageId(id)}
                          className={`
                                        relative 
                                        mb-5 block w-full cursor-zoom-in
                                        after:content after:pointer-events-none after:absolute after:inset-0 after:rounded-sm after:shadow-highlight
                                    `}
                        >
                          <Image
                            alt={
                              sectionTitle
                                ? `Gallery photo - ${sectionTitle}`
                                : "Gallery photo"
                            }
                            className="transform rounded-sm brightness-90 transition will-change-auto group-hover:brightness-110"
                            style={{ transform: "translate3d(0, 0, 0)" }}
                            src={url}
                            width={!isNaN(numericWidth) ? numericWidth : 720}
                            height={!isNaN(numericHeight) ? numericHeight : 480}
                            sizes="(max-width: 640px) 100vw,
                                          (max-width: 1280px) 50vw,
                                          (max-width: 1536px) 33vw,
                                          25vw"
                            priority={index < 3}
                          />
                          {tags && tags.length > 0 && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm shadow-lg z-10">
                              {tags[0]}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      </div>

      {/* Zoomed Image Modal / Backdrop */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity duration-300"
          onClick={handleCloseModal} // Use handler to close
        >
          {(() => {
            // Use IIFE to calculate classes based on zoomedImage
            const numericWidth = parseInt(zoomedImage.width, 10);
            const numericHeight = parseInt(zoomedImage.height, 10);
            const isValidDimensions =
              !isNaN(numericWidth) && !isNaN(numericHeight);
            const isLandscape =
              isValidDimensions && numericWidth > numericHeight;

            // Determine container size based on orientation
            const containerMaxWidth = isLandscape
              ? "md:max-w-4xl"
              : "md:max-w-xl"; // Larger for landscape
            const containerMaxHeight = "md:max-h-[70vh]"; // Increased height slightly

            const containerClasses = `
                            relative w-auto flex items-center justify-center 
                            max-w-[95vw] max-h-[85vh] // Allow more space on mobile too
                            ${containerMaxWidth} 
                            ${containerMaxHeight}
                        `;

            // Build optimized Sanity image URL for modal (larger size)
            // Use the base URL and add width parameter for better quality
            const baseUrl = zoomedImage.url.split("?")[0]; // Remove existing query params
            const imageSrcWidth = isLandscape ? 1080 : 720;
            const imageSrc = `${baseUrl}?w=${imageSrcWidth}&auto=format&q=85`;

            // Calculate base width/height for the Image component (guides aspect ratio)
            const baseWidth = numericWidth || (isLandscape ? 1080 : 720);
            const baseHeight = numericHeight || (isLandscape ? 720 : 1080); // Approximate inverse aspect

            // Determine sizes prop based on container logic
            const imageSizes = `(max-width: 767px) 95vw, ${isLandscape ? "80vw" : "50vw"}`;

            return (
              <div // This is containerClasses (outermost modal content box)
                className={containerClasses}
                onClick={(e) => e.stopPropagation()} // Stop backdrop click from closing if click is on padding of containerClasses
              >
                {/* New scaling and clickable wrapper */}
                <div
                  className={`
                    relative cursor-zoom-in 
                    transition-transform duration-300 ease-in-out
                    ${isFurtherZoomed ? "scale-125" : "scale-100"}
                  `}
                  style={{ transformOrigin: "center center" }} // Ensure scaling is from the center
                  onClick={handleImageClick} // Click this whole area to further zoom/unzoom
                >
                  <Image
                    alt={
                      zoomedImage.title
                        ? `Gallery - ${zoomedImage.title}`
                        : `Zoomed gallery photo ${zoomedImage.id}`
                    }
                    className="object-contain w-full h-full rounded-sm" // Transform class removed
                    style={{ transform: "translate3d(0, 0, 0)" }} // Keep for potential GPU layer promotion
                    src={imageSrc}
                    width={baseWidth}
                    height={baseHeight}
                    sizes={imageSizes}
                  />
                  {/* Gallery title and tag relative to this scaling wrapper */}
                  {(zoomedImage.title ||
                    (zoomedImage.tags && zoomedImage.tags.length > 0)) && (
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-2 z-10">
                      {zoomedImage.title && (
                        <span className="bg-black/70 text-white text-sm px-2 py-1 rounded-sm">
                          {zoomedImage.title}
                        </span>
                      )}
                      {zoomedImage.tags && zoomedImage.tags.length > 0 && (
                        <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                          {zoomedImage.tags[0]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
