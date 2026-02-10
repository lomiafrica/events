/**
 * Custom Next.js image loader.
 * Sanity CDN URLs are served directly with w/q params so Next.js never fetches
 * them, avoiding TimeoutError on the Image Optimization API.
 * Other domains still go through Next.js image optimization.
 */
type ImageLoaderParams = { src: string; width: number; quality?: number };

export default function sanityImageLoader({
  src,
  width,
  quality,
}: ImageLoaderParams): string {
  const isSanity = src.includes("cdn.sanity.io");
  const q = quality ?? 75;

  if (isSanity) {
    const separator = src.includes("?") ? "&" : "?";
    // Sanity CDN: w, q, fit=max to avoid upscaling. Integer width per Sanity docs.
    return `${src}${separator}w=${Math.round(width)}&q=${q}&fit=max`;
  }

  // Default Next.js image optimization for other domains (e.g. Cloudinary)
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}
