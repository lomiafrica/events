import { Suspense } from "react";
import { PaymentSuccessClient } from "@/components/payment/payment-success-client";

interface SearchParamsProps {
  searchParams: Promise<{
    purchase_id?: string;
    purchase_ids?: string;
    flow?: string;
    event_slug?: string;
  }>;
}

export default async function PaymentSuccessPage({
  searchParams,
}: SearchParamsProps) {
  const params = await searchParams;
  const purchaseId = params.purchase_id || params.purchase_ids;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-sm h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <PaymentSuccessClient
        purchaseId={purchaseId}
        flow={params.flow}
        eventSlug={params.event_slug}
      />
    </Suspense>
  );
}
