import { createClient } from "next-sanity";
import { projectId, dataset, apiVersion } from "@/sanity.config";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production", // Use CDN in production, direct API in development
});

export const config = {
  projectId,
  dataset,
  apiVersion,
};
