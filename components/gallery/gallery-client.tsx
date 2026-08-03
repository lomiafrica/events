"use client";

import Image from "next/image";
import React, { useState, useMemo, useEffect } from "react";
import type { ImageProps } from "@/lib/utils/types";
import LoadingSpinner from "@/components/ui/Bouncer";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";
import { ZoomImage } from "./zoom-image";

function useColumnCount() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const mq = (n: number) => window.matchMedia(`(min-width: ${n}px)`).matches;
    const update = () => {
      if (mq(1280)) setCols(4);
      else if (mq(1024)) setCols(3);
      else if (mq(640)) setCols(2);
      else setCols(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

function SectionGallery({
  sectionTitle,
  sectionImages,
  columnCount,
  toSectionId,
  setZoomedState,
}: {
  sectionTitle: string;
  sectionImages: ImageProps[];
  columnCount: number;
  toSectionId: (title: string) => string;
  setZoomedState: (state: {
    sectionTitle: string;
    sectionImages: ImageProps[];
    sectionIndex: number;
  }) => void;
}) {
  const columns = useMemo(() => {
    const cols: ImageProps[][] = Array.from({ length: columnCount }, () => []);
    sectionImages.forEach((img, i) => cols[i % columnCount].push(img));
    return cols;
  }, [sectionImages, columnCount]);

  return (
    <section
      id={toSectionId(sectionTitle)}
      className="mb-24 first:mt-0 mt-4 scroll-mt-24"
    >
      <h2 className="text-2xl sm:text-3xl font-medium text-zinc-800 dark:text-white mb-6 tracking-tight">
        {sectionTitle}
      </h2>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="flex flex-col min-w-0">
            {col.map((img, i) => {
              const globalIndex = colIndex + i * columnCount;
              return (
                <GalleryItem
                  key={`${sectionTitle}-${img.id}-${globalIndex}`}
                  img={img}
                  sectionTitle={sectionTitle}
                  tags={img.tags}
                  onClick={() =>
                    setZoomedState({
                      sectionTitle,
                      sectionImages,
                      sectionIndex: globalIndex,
                    })
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function GalleryItem({
  img,
  sectionTitle,
  onClick,
  tags,
}: {
  img: ImageProps;
  sectionTitle: string;
  onClick: () => void;
  tags?: string[];
}) {
  const numericWidth = parseInt(img.width, 10);
  const numericHeight = parseInt(img.height, 10);
  const hasDimensions = !isNaN(numericWidth) && !isNaN(numericHeight);
  const aspectStyle = hasDimensions
    ? { aspectRatio: `${numericWidth} / ${numericHeight}` }
    : undefined;

  return (
    <figure
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        relative overflow-hidden rounded-sm bg-muted mb-2 cursor-zoom-in
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
        after:content after:pointer-events-none after:absolute after:inset-0 after:rounded-sm after:shadow-highlight
        ${!hasDimensions ? "aspect-square" : ""}
      `}
      style={aspectStyle}
      aria-label={
        sectionTitle ? `Gallery photo - ${sectionTitle}` : "Gallery photo"
      }
    >
      <Image
        src={img.url}
        alt={sectionTitle ? `Gallery photo - ${sectionTitle}` : "Gallery photo"}
        fill
        className="object-cover brightness-90 transition will-change-auto hover:brightness-110"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
      />
      {tags && tags.length > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm shadow-lg z-10">
          {tags[0]}
        </div>
      )}
    </figure>
  );
}

// Renamed component to GalleryClientComponent
export default function GalleryClientComponent() {
  const { currentLanguage } = useTranslation();
  const columnCount = useColumnCount();
  const [images, setImages] = useState<ImageProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedState, setZoomedState] = useState<{
    sectionTitle: string;
    sectionImages: ImageProps[];
    sectionIndex: number;
  } | null>(null);

  // Slug for section anchor (safe for URLs)
  const toSectionId = (title: string) =>
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

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

  const handleCloseModal = () => {
    setZoomedState(null);
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

          {/* Section navigation by title */}
          {imagesByTitle.length > 1 && (
            <nav
              className="flex flex-wrap justify-center gap-2 mt-6"
              aria-label="Gallery sections"
            >
              {imagesByTitle.map(({ title: sectionTitle }) => {
                const sectionId = toSectionId(sectionTitle);
                return (
                  <a
                    key={sectionId}
                    href={`#${sectionId}`}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {sectionTitle}
                  </a>
                );
              })}
            </nav>
          )}
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
              <SectionGallery
                key={sectionTitle}
                sectionTitle={sectionTitle}
                sectionImages={sectionImages}
                columnCount={columnCount}
                toSectionId={toSectionId}
                setZoomedState={setZoomedState}
              />
            ),
          )}
        </div>
      </div>

      {/* Zoomed Image Modal – carousel shows only images from the clicked section */}
      {zoomedState && (
        <ZoomImage
          images={zoomedState.sectionImages}
          initialIndex={zoomedState.sectionIndex}
          sectionTitle={zoomedState.sectionTitle}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
