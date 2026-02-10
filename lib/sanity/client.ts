import { createClient } from "next-sanity";
import { projectId, dataset, apiVersion } from "@/sanity.config";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production", // Use CDN in production, direct API in development
});

// Client that skips CDN — use for settings that must be fresh (e.g. nav toggles)
export const clientNoCdn = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

export const config = {
  projectId,
  dataset,
  apiVersion,
};
