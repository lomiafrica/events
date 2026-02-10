"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type MerchCarouselProduct = {
  _id: string;
  name: string;
  slug: string;
  mainImage?: string;
  price?: number;
  tags?: string[];
  images?: Array<{
    asset?: {
      url?: string;
    };
  }>;
};

export function MerchCarouselCard({
  product,
}: {
  product: MerchCarouselProduct;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const extraImages =
    product.images?.map((img) => img.asset?.url).filter(Boolean) ?? [];

  const allImages = [
    product.mainImage,
    ...extraImages.filter((url) => url && url !== product.mainImage),
  ].filter(Boolean) as string[];

  const hasImage = allImages.length > 0;
  const primaryImage = allImages[0];
  const secondaryImage = allImages[1];

  const displayImage =
    isHovered && secondaryImage ? secondaryImage : primaryImage;

  return (
    <Link
      href={`/merch/${product.slug}`}
      className="group block h-full rounded-sm border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {hasImage ? (
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-medium line-clamp-2">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {Array.isArray(product.tags) && product.tags.length > 0
            ? product.tags.join(" • ")
            : "\u00A0"}
        </p>
        <p className="text-sm font-semibold text-primary">
          {typeof product.price === "number"
            ? product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
            : "0"}{" "}
          F CFA
        </p>
      </div>
    </Link>
  );
}
