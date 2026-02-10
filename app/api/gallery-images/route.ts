import { NextResponse } from "next/server";
import { getAllGalleryImages } from "@/lib/sanity/queries";
import type { ImageProps } from "@/lib/utils/types";

export const dynamic = "force-dynamic"; // Ensure fresh data on each request

export async function GET() {
  try {
    // Fetch gallery images from Sanity
    const sanityImages = await getAllGalleryImages();

    if (sanityImages.length === 0) {
      return NextResponse.json([]); // Return empty array if no images
    }

    // Helper function to build optimized Sanity image URLs
    const buildSanityImageUrl = (baseUrl: string, width?: number) => {
      if (!baseUrl) return "";

      try {
        // Check if URL already has query parameters
        const hasParams = baseUrl.includes("?");
        const separator = hasParams ? "&" : "?";

        if (width) {
          return `${baseUrl}${separator}w=${width}&auto=format&q=80`;
        }
        return baseUrl;
      } catch {
        // Fallback to original URL if parsing fails
        return baseUrl;
      }
    };

    // Transform Sanity images to match ImageProps interface (includes gallery title from schema)
    const imageProps: ImageProps[] = sanityImages.map((img) => {
      // Extract format from URL (e.g., "image.jpg" -> "jpg")
      const urlParts = img.url.split(".");
      const format = urlParts[urlParts.length - 1]?.split("?")[0] || "jpg";

      // Build optimized URL for grid view (720px width)
      const optimizedUrl = buildSanityImageUrl(img.url, 720);

      const galleryTitle =
        "galleryTitle" in img && typeof img.galleryTitle === "string"
          ? img.galleryTitle
          : undefined;

      return {
        id: img.id,
        height: img.height?.toString() || "480",
        width: img.width?.toString() || "720",
        public_id: img.assetId || img._id, // Use assetId or _id as public_id
        format: format,
        url: optimizedUrl || img.url, // Use optimized URL for grid view
        tags: [],
        title: galleryTitle,
      };
    });

    // Sort images: maintain order from galleries (already sorted by _createdAt desc)
    // Tagged images first if we add tags later, otherwise maintain current order
    const finalImages = imageProps.sort((a, b) => {
      const aHasTags = a.tags && a.tags.length > 0;
      const bHasTags = b.tags && b.tags.length > 0;

      if (aHasTags && !bHasTags) {
        return -1; // a (tagged) comes before b (untagged)
      }
      if (!aHasTags && bHasTags) {
        return 1; // b (tagged) comes before a (untagged)
      }
      // Maintain original order (by id, which reflects gallery creation order)
      return a.id - b.id;
    });

    return NextResponse.json(finalImages);
  } catch (error: unknown) {
    console.error(
      "[API Route] Error fetching or processing Sanity gallery data:",
      error,
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal Server Error fetching gallery images.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
