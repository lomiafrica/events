import { Suspense } from "react";
import { VerifyClient } from "@/components/verify/verify-client";
import { cookies } from "next/headers";

const PIN_CACHE_KEY = "staff_verification_pin";
const PIN_CACHE_DURATION = 8 * 60 * 60 * 1000;

interface SearchParamsProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function VerifyTicketPage({
  searchParams,
}: SearchParamsProps) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const pinCookie = cookieStore.get(PIN_CACHE_KEY);
  let initialIsVerified = false;

  if (pinCookie?.value) {
    try {
      const data = JSON.parse(pinCookie.value);
      if (Date.now() - data.timestamp < PIN_CACHE_DURATION) {
        initialIsVerified = true;
      }
    } catch {
      // ignore parse error and keep as false
    }
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-sm h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <VerifyClient
        key={params.id ?? "no-id"}
        ticketId={params.id}
        initialIsVerified={initialIsVerified}
      />
    </Suspense>
  );
}
