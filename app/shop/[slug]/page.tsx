// Placeholder for Single Product Page
import { getProductBySlug } from "@/lib/sanity/queries";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound(); // Trigger 404 if product not found
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
      <p className="text-lg mb-4">Price: {product.price} XOF</p>
      {/* Render product images, description, variants, etc. later */}
      <div className="prose lg:prose-xl mt-6">
        {/* Placeholder for description - needs Portable Text renderer */}
        <p>{JSON.stringify(product.description)}</p>
      </div>
      {/* Add to Cart / Variant selection logic later */}
    </main>
  );
}

// Optional: Generate static paths if needed
// export async function generateStaticParams() {
//   const products = await getAllProducts(); // Assuming getAllProducts fetches slugs
//   return products.map((product: any) => ({ slug: product.slug?.current || product.slug }));
// }
