import { createClient } from "next-sanity";
import { projectId, dataset, apiVersion } from "@/sanity.config";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Set to true for production
});

export const config = {
  projectId,
  dataset,
  apiVersion,
};
