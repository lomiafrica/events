import { NextResponse } from "next/server";
import cloudinary from "@/lib/utils/cloudinary"; // Assuming your configured Cloudinary instance
import type { ImageProps } from "@/lib/utils/types"; // Assuming your type definition path

export const dynamic = "force-dynamic"; // Ensure fresh data on each request (or use revalidate)

// Basic type for Cloudinary resource - replace with actual SDK type if available
interface CloudinaryResource {
  public_id: string;
  format: string;
  height: string | number; // Allow string or number initially
  width: string | number; // Allow string or number initially
  tags?: string[]; // Added tags property
  // Add other properties if needed
}

// Interface for expected Cloudinary error structure
interface CloudinaryError {
  error?: {
    // Make properties optional as structure might vary
    message: string;
    http_code?: number; // Make optional
  };
}

export async function GET() {
  console.log("[API Route /api/gallery-images] Received GET request.");
  console.log(
    "[API Route] Cloudinary Folder Env:",
    process.env.CLOUDINARY_FOLDER,
  );
  console.log(
    "[API Route] Cloudinary Cloud Name:",
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  );

  if (
    !process.env.CLOUDINARY_FOLDER ||
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  ) {
    console.error("[API Route] Missing required environment variables.");
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing Cloudinary environment variables.",
      },
      { status: 500 },
    );
  }

  try {
    // Fetch results from Cloudinary
    const results = await cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .sort_by("public_id", "desc")
      .max_results(400) // Adjust max_results as needed
      .with_field("tags") // Added to fetch tags
      .execute();

    console.log(
      `[API Route] Fetched ${results?.resources?.length ?? 0} resources from Cloudinary.`,
    );

    // Use explicit type for resources array
    const resources: CloudinaryResource[] = results?.resources || [];

    if (resources.length === 0) {
      console.warn("[API Route] No resources found in Cloudinary folder.");
      return NextResponse.json([]); // Return empty array if no resources
    }

    // Process images (removed blurDataURL generation)
    const imagePropsPromises = resources.map(
      async (
        result: CloudinaryResource,
        i: number,
      ): Promise<ImageProps | null> => {
        // Removed blurImageUrl and blurDataUrl logic

        // Ensure height/width are numbers
        // Use String() to handle potential number input safely before parseInt
        const height = parseInt(String(result.height), 10);
        const width = parseInt(String(result.width), 10);

        if (isNaN(height) || isNaN(width)) {
          console.warn(
            `[API Route] Invalid dimensions for ${result.public_id}: height=${result.height}, width=${result.width}. Skipping image.`,
          );
          return null; // Skip images with invalid dimensions
        }

        // Return object conforming to ImageProps
        // Convert numbers back to string if ImageProps expects strings
        return {
          id: i,
          height: height.toString(), // Convert back to string
          width: width.toString(), // Convert back to string
          public_id: result.public_id,
          format: result.format,
          tags: result.tags || [], // Add tags, defaulting to empty array
        };
      },
    );

    const imagesWithoutBlur: (ImageProps | null)[] =
      await Promise.all(imagePropsPromises);
    // Filter out nulls (due to invalid dimensions)
    const finalImages: ImageProps[] = imagesWithoutBlur.filter(
      (img): img is ImageProps => img !== null,
    );

    // Sort images: tagged images first, then by original recency (id)
    finalImages.sort((a, b) => {
      const aHasTags = a.tags && a.tags.length > 0;
      const bHasTags = b.tags && b.tags.length > 0;

      if (aHasTags && !bHasTags) {
        return -1; // a (tagged) comes before b (untagged)
      }
      if (!aHasTags && bHasTags) {
        return 1; // b (tagged) comes before a (untagged)
      }
      // If both are tagged or both are untagged, maintain original sort order (recency)
      // Lower id means it was earlier in the Cloudinary 'public_id', 'desc' sorted list (more recent)
      return a.id - b.id;
    });

    console.log(
      `[API Route] Processed and sorted ${finalImages.length} images successfully (without blur).`,
    );
    return NextResponse.json(finalImages);
  } catch (error: unknown) {
    console.error(
      "[API Route] Error fetching or processing Cloudinary data:",
      error,
    );

    // Type checking for error structure using the interface
    if (typeof error === "object" && error !== null && "error" in error) {
      // Check if error conforms to CloudinaryError structure before accessing properties
      const potentialError = error as Partial<CloudinaryError>; // Use partial as error structure might vary
      if (potentialError.error?.message) {
        return NextResponse.json(
          { error: `Cloudinary API Error: ${potentialError.error.message}` },
          { status: potentialError.error.http_code || 500 },
        );
      }
    }
    return NextResponse.json(
      { error: "Internal Server Error fetching gallery images." },
      { status: 500 },
    );
  }
}
