import {createClient, type SanityClient} from "next-sanity";
import {apiVersion, dataset, projectId} from "@/sanity.config";

export function getSanityWriteClient(): SanityClient {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!projectId || !dataset) {
    throw new Error("Sanity project id or dataset is not configured.");
  }
  if (!token) {
    throw new Error("SANITY_WRITE_TOKEN is not configured.");
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: apiVersion || "2024-01-01",
    token,
    useCdn: false,
  });
}
