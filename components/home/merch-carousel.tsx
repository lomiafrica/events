import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { getAllProducts } from "@/lib/sanity/queries";
import { MerchCarouselCard } from "./merch-carousel-card";
import { t } from "@/lib/i18n/translations";

type MerchCarouselProduct = {
  _id: string;
  name: string;
  slug: string;
  mainImage?: string;
  price?: number;
  tags?: string[];
  stock?: number;
  images?: Array<{
    asset?: {
      url?: string;
    };
  }>;
};

export async function MerchCarousel() {
  const products = (await getAllProducts()) as MerchCarouselProduct[];

  const availableProducts = (products || []).filter(
    (p: MerchCarouselProduct) =>
      typeof p.stock === "number" ? p.stock > 0 : true,
  );

  if (!availableProducts || availableProducts.length === 0) return null;

  // Limit to max 4 items in the carousel
  const items = availableProducts.slice(0, 4);

  return (
    <section className="pt-6 md:pt-8 pb-12 md:pb-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="h-px w-full bg-border/40 mb-8" />
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("en", "homePage.shopMerch")}
          </h2>
          <Link
            href="/merch"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("en", "homePage.viewAll")}
          </Link>
        </div>

        <Carousel className="w-full">
          <CarouselContent>
            {items.map((product: MerchCarouselProduct) => (
              <CarouselItem
                key={product._id}
                className="basis-1/2 sm:basis-1/3 lg:basis-1/4"
              >
                <MerchCarouselCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
