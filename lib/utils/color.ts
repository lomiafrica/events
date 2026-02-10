/**
 * Color utility functions for normalizing and processing CSS color names
 */

/**
 * Normalizes color names to CSS color values
 * Supports: CSS named colors (black, white), French names (noir, blanc), and special values (mix)
 * @param name - The color name to normalize
 * @returns Normalized color name for CSS use
 */
export function normalizeColorName(name: string): string {
  const normalized = name.trim().toLowerCase();

  // Special case: mix color
  if (normalized === "mix") {
    return "mix";
  }

  // Map common text values to CSS color names for consistency
  const colorMap: Record<string, string> = {
    noir: "black",
    blanc: "white",
    rouge: "red",
    bleu: "blue",
    vert: "green",
    jaune: "yellow",
    gris: "gray",
  };

  // Return mapped color name or original name (CSS will handle valid named colors)
  return colorMap[normalized] || normalized;
}
