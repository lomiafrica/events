import { Suspense } from "react";
import { VerifyClient } from "./verify-client";

interface SearchParamsProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function VerifyTicketPage({
  searchParams,
}: SearchParamsProps) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <VerifyClient ticketId={params.id} />
    </Suspense>
  );
}
