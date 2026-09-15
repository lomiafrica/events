import {createHmac, timingSafeEqual} from "crypto";

const MAX_AGE_SECONDS = 300;

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function equalHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length || left.length === 0) {
      return false;
    }
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/**
 * Verifies a Sanity webhook signature.
 * Supports the dashboard format `t=<unix>,v1=<hex>` and the sha256=<hex> variant
 * used by `/api/revalidate`.
 */
export function verifySanityWebhookSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!secret || !signatureHeader) {
    return false;
  }

  const shaPrefix = signatureHeader.replace(/^sha256=/i, "");
  if (/^[0-9a-f]+$/i.test(shaPrefix) && !signatureHeader.includes("t=")) {
    return equalHex(hmacHex(secret, body), shaPrefix);
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  ) as {t?: string; v1?: string};

  const timestamp = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(timestamp) || !v1) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > MAX_AGE_SECONDS) {
    return false;
  }

  return equalHex(hmacHex(secret, `${timestamp}.${body}`), v1);
}
