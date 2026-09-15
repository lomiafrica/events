import {NextRequest, NextResponse} from "next/server";
import {verifySanityWebhookSignature} from "@/lib/sanity/verify-webhook";
import {getSanityWriteClient} from "@/lib/sanity/write-client";
import {syncSanityDocument} from "@/lib/lomi/sync-catalog";

export const runtime = "nodejs";

function documentIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as {_id?: unknown; id?: unknown};
  if (typeof body._id === "string" && body._id) {
    return body._id;
  }
  if (typeof body.id === "string" && body.id) {
    return body.id;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {error: "SANITY_WEBHOOK_SECRET is not configured"},
      {status: 500},
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({error: "Failed to read body"}, {status: 400});
  }

  const signature =
    request.headers.get("sanity-webhook-signature") ||
    request.headers.get("x-sanity-signature") ||
    "";

  if (!verifySanityWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({error: "Invalid signature"}, {status: 401});
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({error: "Invalid JSON"}, {status: 400});
  }

  const documentId = documentIdFromPayload(payload);
  if (!documentId) {
    return NextResponse.json({received: true, skipped: "no_id"});
  }

  try {
    const client = getSanityWriteClient();
    const result = await syncSanityDocument(client, documentId);
    return NextResponse.json({received: true, ...result});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("lomi. catalog sync failed:", message);
    return NextResponse.json(
      {error: "Catalog sync failed", message},
      {status: 500},
    );
  }
}
