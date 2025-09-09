import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllProducts } from "@/lib/sanity/queries";
import LoadingComponent from "@/components/ui/Bouncer";
import MerchContentClient from "./merch-content-client";

export const metadata: Metadata = {
  title: "Merch | Kamayakoi",
  description:
    "Shop exclusive Kamayakoi merchandise, apparel, and collectibles. Support the movement with our unique designs and products.",
};

async function MerchContent() {
  const products = await getAllProducts();
  return <MerchContentClient products={products || []} />;
}

export default async function MerchPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <MerchContent />
    </Suspense>
  );
}
