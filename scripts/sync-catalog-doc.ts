import {createClient} from "next-sanity";
import {syncSanityDocument} from "../lib/lomi/sync-catalog";

const documentId = process.argv[2];
if (!documentId) {
  console.error("Usage: npx tsx scripts/sync-catalog-doc.ts <sanity-document-id>");
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
  process.env.SANITY_WRITE_TOKEN || process.env.SANITY_WEBHOOK_SECRET;

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN");
  process.exit(1);
}

if (!process.env.LOMI_SECRET_KEY) {
  console.error("Missing LOMI_SECRET_KEY");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  token,
  useCdn: false,
});

async function main() {
  const result = await syncSanityDocument(client, documentId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
