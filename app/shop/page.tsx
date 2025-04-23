import { getAllProducts } from "@/lib/sanity/queries";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <h1 className="text-3xl font-bold mb-6">Shop</h1>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(
              (product: {
                _id: string;
                name: string;
                price: number;
                slug: { current: string } | string;
              }) => (
                <div key={product._id} className="border p-4 rounded shadow">
                  {/* Basic product card - enhance later */}
                  <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                  <p>Price: {product.price} F CFA</p>
                  {/* Link to product detail page */}
                  <a
                    href={`/shop/${typeof product.slug === "string" ? product.slug : product.slug?.current}`}
                    className="text-blue-500 hover:underline mt-2 inline-block"
                  >
                    View Details
                  </a>
                </div>
              ),
            )}
          </div>
        ) : (
          <p>No products found.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
