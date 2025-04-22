/**
 * This configuration file contains shared Sanity settings
 * that can be used by both the Next.js frontend and the Sanity Studio
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "";
