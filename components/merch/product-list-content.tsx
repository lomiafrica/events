"use client";

import { ProductCard } from "@/components/merch/product-card";
import { Card } from "@/components/ui/card";
import { SanityProduct } from "./types";

interface ProductListContentProps {
  products: SanityProduct[];
}

export function ProductListContent({ products }: ProductListContentProps) {
  return products.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  ) : (
    <Card className="flex mr-4 md:mr-6 flex-1 items-center justify-center rounded-sm">
      <p className="text text-muted-foreground font-medium">
        No products found
      </p>
    </Card>
  );
}
