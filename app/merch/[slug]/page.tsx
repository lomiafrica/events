import { Suspense } from "react";
import { getProductBySlug } from "@/lib/sanity/queries";
import { notFound } from "next/navigation";
import LoadingComponent from "@/components/ui/Bouncer";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { ProductDetailContent } from "@/components/merch/product-detail-content";

type Props = {
  params: Promise<{ slug: string }>;
};

async function ProductContent({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound(); // Trigger 404 if product not found
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <ProductDetailContent product={product} />
      </main>
      <Footer />
    </div>
  );
}

export default async function ProductDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

// Optional: Generate static paths if needed
export async function generateStaticParams() {
  const { getAllProducts } = await import("@/lib/sanity/queries");
  const products = await getAllProducts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return products.map((product: any) => ({
    slug:
      typeof product.slug === "string"
        ? product.slug
        : product.slug?.current || "",
  }));
}
