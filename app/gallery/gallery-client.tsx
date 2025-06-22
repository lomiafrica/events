"use client";

import Image from "next/image";
import React, { useState, useEffect, useMemo } from "react";
import type { ImageProps } from "@/lib/utils/types";
import LoadingSpinner from "@/components/ui/Bouncer";

// Renamed component to GalleryClientComponent
export default function GalleryClientComponent() {
  const [images, setImages] = useState<ImageProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImageId, setZoomedImageId] = useState<number | null>(null); // State for zoomed image ID
  const [isFurtherZoomed, setIsFurtherZoomed] = useState(false); // State for secondary zoom

  // Memoize filtered image lists
  const taggedImages = useMemo(
    () => images.filter((img) => img.tags && img.tags.length > 0),
    [images],
  );
  const untaggedImages = useMemo(
    () => images.filter((img) => !img.tags || img.tags.length === 0),
    [images],
  );

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
    <>
      <main className="mx-auto max-w-[1960px] p-4 pt-20">
        {/* Display error inline if needed, without blocking gallery */}
        {error && (
          <p className="text-center text-red-500 mb-4">
            Error loading images: {error}
          </p>
        )}
        {images.length === 0 && !isLoading && !error && (
          <p className="text-center">No images found. Check API route logs.</p>
        )}

        {/* Tagged Images Section */}
        {taggedImages.length > 0 && (
          <section className="mb-12">
            {/* <h2 className="text-3xl font-bold mb-6 text-white tracking-tight">
              Highlights
            </h2> */}
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
              {taggedImages.map(
                ({ id, public_id, format, width, height, tags }, index) => {
                  const numericWidth = parseInt(width, 10);
                  const numericHeight = parseInt(height, 10);
                  // console.log(`Tagged Image ${public_id} tags:`, tags);
                  return (
                    <div
                      key={`tagged-${id}`}
                      onClick={() => setZoomedImageId(id)}
                      className={`
                                        relative 
                                        mb-5 block w-full cursor-zoom-in
                                        after:content after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:shadow-highlight
                                    `}
                    >
                      <Image
                        alt="Gallery photo - Highlight"
                        className="transform rounded-md brightness-90 transition will-change-auto group-hover:brightness-110"
                        style={{ transform: "translate3d(0, 0, 0)" }}
                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_720,f_auto,q_auto/${public_id}.${format}`}
                        width={!isNaN(numericWidth) ? numericWidth : 720}
                        height={!isNaN(numericHeight) ? numericHeight : 480}
                        sizes="(max-width: 640px) 100vw,
                                          (max-width: 1280px) 50vw,
                                          (max-width: 1536px) 33vw,
                                          25vw"
                        priority={index < 3} // Priority for first few tagged images
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
        )}

        {/* Untagged Images Section */}
        {untaggedImages.length > 0 && (
          <section>
            {taggedImages.length > 0 && ( // Only show this title if there was a tagged section
              <h2 className="text-2xl font-semibold mb-6 text-slate-200 tracking-tight">
                More shots
              </h2>
            )}
            {taggedImages.length === 0 &&
              images.length > 0 && ( // If only untagged, use a more general title
                <h2 className="text-3xl font-bold mb-6 text-white tracking-tight">
                  Gallery
                </h2>
              )}
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
              {untaggedImages.map(
                ({ id, public_id, format, width, height }, index) => {
                  const numericWidth = parseInt(width, 10);
                  const numericHeight = parseInt(height, 10);
                  // console.log(`Untagged Image ${public_id} tags:`, tags);
                  return (
                    <div
                      key={`untagged-${id}`}
                      onClick={() => setZoomedImageId(id)}
                      className={`
                                        relative 
                                        mb-5 block w-full cursor-zoom-in
                                        after:content after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:shadow-highlight
                                    `}
                    >
                      <Image
                        alt="Gallery photo"
                        className="transform rounded-md brightness-90 transition will-change-auto group-hover:brightness-110"
                        style={{ transform: "translate3d(0, 0, 0)" }}
                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_720,f_auto,q_auto/${public_id}.${format}`}
                        width={!isNaN(numericWidth) ? numericWidth : 720}
                        height={!isNaN(numericHeight) ? numericHeight : 480}
                        sizes="(max-width: 640px) 100vw,
                                          (max-width: 1280px) 50vw,
                                          (max-width: 1536px) 33vw,
                                          25vw"
                        priority={index < 3 && taggedImages.length === 0} // Priority only if no tagged images were prioritized
                      />
                      {/* No tag display for untagged images, or could be an empty placeholder if design requires */}
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}
      </main>

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

            // Determine image source width based on orientation for better quality/speed balance
            const imageSrcWidth = isLandscape ? 1080 : 720;
            const imageSrc = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_${imageSrcWidth},f_auto,q_auto/${zoomedImage.public_id}.${zoomedImage.format}`;

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
                    alt={`Zoomed gallery photo ${zoomedImage.id}`}
                    className="object-contain w-full h-full rounded-md" // Transform class removed
                    style={{ transform: "translate3d(0, 0, 0)" }} // Keep for potential GPU layer promotion
                    src={imageSrc}
                    width={baseWidth}
                    height={baseHeight}
                    sizes={imageSizes}
                  />
                  {/* Tag is now relative to this scaling wrapper */}
                  {zoomedImage.tags && zoomedImage.tags.length > 0 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm shadow-lg z-10">
                      {zoomedImage.tags[0]}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}
