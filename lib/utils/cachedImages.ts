import cloudinary from "./cloudinary";
import type { ImageProps } from "./types";

// Define interfaces for the search results
interface SearchResource extends ImageProps {
  public_id: string;
  format: string;
  // width and height are already in ImageProps
}

interface CloudinarySearchResults {
  resources: SearchResource[];
  total_count?: number;
  time?: number;
  next_cursor?: string;
}

// Use the defined type and initialize as undefined
let cachedResults: CloudinarySearchResults | undefined;

export default async function getResults(): Promise<
  CloudinarySearchResults | undefined
> {
  if (!cachedResults) {
    const fetchedResults = await cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .sort_by("public_id", "desc")
      .max_results(400)
      .execute();

    cachedResults = fetchedResults;
  }

  return cachedResults;
}
