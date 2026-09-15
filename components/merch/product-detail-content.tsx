"use client";

import Image from "next/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { Button } from "@/components/ui/button";
import { PlusIcon, MinusIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "./cart/cart-context";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { t } from "@/lib/i18n/translations";
import { SanityProduct } from "./types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useState, useMemo } from "react";
import { normalizeColorName } from "@/lib/utils/color";
import { cn } from "@/lib/actions/utils";
import { openCartExternally } from "./cart/cart-modal";

interface ProductImageCarouselProps {
  images: Array<{ url: string }>;
  productName: string;
}

function ProductImageCarousel({
  images,
  productName,
}: ProductImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <div className="w-full">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative overflow-hidden rounded-sm bg-neutral-950 shadow-2xl aspect-[4/5] max-h-[70vh] w-full">
                <Image
                  src={image.url}
                  alt={
                    typeof productName === "string" ? productName : "Product"
                  }
                  fill
                  className="object-contain"
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 rounded-sm" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm" />
      </Carousel>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={`thumb-${index}`}
              type="button"
              onClick={() => api?.scrollTo(index)}
              className="relative w-full pb-[100%] overflow-hidden rounded-sm border border-border/40 hover:border-primary transition-colors"
            >
              <Image
                src={image.url}
                alt={typeof productName === "string" ? productName : "Product"}
                fill
                className="object-cover"
                quality={80}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductDetailContentProps {
  product: SanityProduct;
}

const capitalizeColorName = (name: string): string => {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const descriptionComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-3 text-sm md:text-base leading-relaxed">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-5 mb-2 text-lg md:text-xl font-semibold text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-4 mb-2 text-base md:text-lg font-semibold text-foreground">
        {children}
      </h3>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-3 list-disc list-inside space-y-0.5 text-sm md:text-base">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-3 list-decimal list-inside space-y-0.5 text-sm md:text-base">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => {
      const href = (value as { href?: string })?.href || "#";
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const image = value as {
        asset?: { url?: string };
        alt?: string;
        caption?: string;
      };
      const url = image.asset?.url;
      if (!url) return null;
      return (
        <figure className="my-6">
          <div className="relative w-full overflow-hidden rounded-sm border border-border/30 bg-muted aspect-[4/3]">
            <Image
              src={url}
              alt={image.alt || image.caption || "Product detail"}
              fill
              className="object-cover"
            />
          </div>
          {image.caption && (
            <figcaption className="mt-2 text-xs text-muted-foreground text-center">
              {image.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
};

function ProductDetail({ product }: ProductDetailContentProps) {
  const { currentLanguage } = useTranslation();
  const { button } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.name || "",
  );
  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.find((s) => s.available)?.name || "",
  );

  const { addItem } = useCart();

  const displayImages = useMemo(() => {
    const allImages = product.images || [];
    const selectedColorObj = product.colors?.find(
      (c) => c.name === selectedColor,
    );
    if (selectedColorObj?.image) {
      const colorImageUrl = selectedColorObj.image;
      const mainImages = allImages
        .map((image) => image.asset?.url || image.url)
        .filter((url): url is string => !!url && url !== colorImageUrl)
        .map((url) => ({ url }));

      return colorImageUrl
        ? [{ url: colorImageUrl }, ...mainImages]
        : mainImages;
    }
    return allImages
      .map((image) => image.asset?.url || image.url)
      .filter((url): url is string => !!url)
      .map((url) => ({ url }));
  }, [selectedColor, product.colors, product.images]);

  const carouselImages = displayImages;
  const mainImage = product.mainImage || carouselImages[0]?.url;

  const hasAvailableSizes = useMemo(() => {
    if (!product.sizes || product.sizes.length === 0) {
      return true;
    }
    return product.sizes.some((size) => size.available);
  }, [product.sizes]);

  const hasValidSizeSelection = useMemo(() => {
    if (!product.sizes || product.sizes.length === 0) {
      return true;
    }
    if (!selectedSize) return false;
    const selectedSizeObj = product.sizes.find((s) => s.name === selectedSize);
    return selectedSizeObj?.available === true;
  }, [product.sizes, selectedSize]);

  const isOutOfStock = useMemo(() => {
    if (product.stock === 0) return true;
    if (product.sizes && product.sizes.length > 0 && !hasAvailableSizes) {
      return true;
    }
    return false;
  }, [product.stock, product.sizes, hasAvailableSizes]);

  const isAddToCartDisabled =
    isOutOfStock || !hasAvailableSizes || !hasValidSizeSelection;

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
  };

  const handleAddToCart = async () => {
    if (product.sizes && product.sizes.length > 0) {
      if (!hasAvailableSizes || !hasValidSizeSelection) {
        return;
      }
    }

    await addItem(product, quantity);
  };

  const handleBuyNow = async () => {
    if (product.sizes && product.sizes.length > 0) {
      if (!hasAvailableSizes || !hasValidSizeSelection) {
        return;
      }
    }

    // Add selected quantity and open cart for checkout
    await addItem(product, quantity);
    openCartExternally();
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-28 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-stretch">
          <motion.div
            className="space-y-4 flex flex-col h-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {carouselImages.length > 0 ? (
              <ProductImageCarousel
                images={carouselImages}
                productName={product.name}
              />
            ) : mainImage ? (
              <div className="relative overflow-hidden rounded-sm bg-neutral-950 shadow-2xl aspect-[4/5] max-h-[70vh] w-full">
                <Image
                  src={mainImage}
                  alt={
                    typeof product.name === "string" ? product.name : "Product"
                  }
                  fill
                  className="object-contain"
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-sm bg-muted flex items-center justify-center shadow-2xl aspect-[4/5] max-h-[70vh] w-full">
                <span className="text-muted-foreground">
                  {t(currentLanguage, "merchPage.productDetail.noImage")}
                </span>
              </div>
            )}
          </motion.div>

          <motion.div
            className="space-y-8 flex flex-col mt-0 md:min-h-[650px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="space-y-4">
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent leading-tight"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {typeof product.name === "string" ? product.name : "Product"}
              </motion.h1>

              <div className="flex justify-start">
                <motion.p
                  className="text-3xl md:text-4xl font-bold text-primary"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {typeof product.price === "number"
                    ? product.price
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                    : "0"}{" "}
                  F CFA
                </motion.p>
              </div>
            </div>

            {product.colors && product.colors.length >= 1 && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex gap-2 mb-3">
                  {product.colors.map((color, index) => {
                    const normalizedColor = normalizeColorName(color.name);
                    const isMix = normalizedColor === "mix";
                    const isWhite =
                      normalizedColor === "white" ||
                      color.name.toLowerCase() === "blanc";

                    return (
                      <button
                        key={`${color.name}-${index}`}
                        onClick={() => handleColorChange(color.name)}
                        disabled={!color.available}
                        className={cn(
                          "relative h-8 w-8 rounded-full border-2 transition-all duration-200 overflow-hidden",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "hover:ring-2 hover:ring-primary/60 hover:ring-offset-2 hover:ring-offset-background",
                          selectedColor === color.name
                            ? "border-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                            : isWhite
                              ? "border-border dark:border-gray-500"
                              : "border-border dark:border-gray-600",
                          !color.available &&
                            "opacity-40 cursor-not-allowed hover:ring-0 focus-visible:ring-0",
                          isMix && "bg-white",
                        )}
                        style={
                          !isMix
                            ? { backgroundColor: normalizedColor }
                            : undefined
                        }
                        aria-label={color.name}
                      >
                        {isMix && (
                          <>
                            <div className="absolute inset-0 bg-white" />
                            <div
                              className="absolute inset-0 bg-black"
                              style={{
                                clipPath:
                                  "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
                              }}
                            />
                          </>
                        )}
                        {!color.available && (
                          <span className="absolute inset-0 flex items-center justify-center z-10">
                            <span className="h-px w-8 rotate-45 bg-gray-500" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {capitalizeColorName(
                      selectedColor || product.colors[0]?.name || "",
                    )}
                  </span>
                </div>
              </motion.div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <p className="text-sm font-medium text-foreground mb-3">
                  {t(currentLanguage, "merchPage.productDetail.size") || "Size"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size, index) => (
                    <button
                      key={`${size.name}-${index}`}
                      onClick={() =>
                        size.available && setSelectedSize(size.name)
                      }
                      disabled={!size.available}
                      className={cn(
                        "relative flex h-10 min-w-[48px] items-center justify-center rounded-sm border px-4 text-sm font-medium transition-colors",
                        selectedSize === size.name
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary",
                        !size.available &&
                          "cursor-not-allowed border-border text-muted-foreground opacity-50",
                      )}
                    >
                      {size.name}
                      {!size.available && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="h-px w-full rotate-45 bg-gray-500" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {product.description && (
              <motion.div
                className="bg-card/30 backdrop-blur-sm rounded-sm p-6 border border-border/20 min-h-[260px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    {t(currentLanguage, "merchPage.productDetail.description")}
                  </h3>
                  {product.stock !== undefined && (
                    <div
                      className={cn(
                        "px-4 py-2 rounded-sm text-sm font-medium",
                        typeof product.stock === "number" &&
                          product.stock > 0 &&
                          !isOutOfStock
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                      )}
                    >
                      {typeof product.stock === "number" &&
                      product.stock > 0 &&
                      !isOutOfStock
                        ? `${product.stock} in stock`
                        : "Out of Stock"}
                    </div>
                  )}
                </div>
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-muted-foreground/70">
                  {typeof product.description === "string" ? (
                    <p>{product.description}</p>
                  ) : Array.isArray(product.description) ? (
                    <PortableText
                      value={product.description}
                      components={descriptionComponents}
                    />
                  ) : (
                    <p>No description available</p>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {!isOutOfStock && (
                <>
                  <div className="bg-card/30 backdrop-blur-sm rounded-sm p-6 border border-border/20">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-foreground">
                        {t(currentLanguage, "merchPage.productDetail.quantity")}
                      </span>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={decrementQuantity}
                          disabled={quantity <= 1}
                          className="h-10 w-10 rounded-sm"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <motion.span
                          key={quantity}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-12 text-center text-lg font-semibold"
                        >
                          {quantity}
                        </motion.span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={incrementQuantity}
                          className="h-10 w-10 rounded-sm"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t(currentLanguage, "merchPage.productDetail.total")}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {(
                            (typeof product.price === "number"
                              ? product.price
                              : 0) * quantity
                          )
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                          F CFA
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      className={`w-full ${button.secondaryBorder} h-14 text-lg font-semibold rounded-sm`}
                      size="lg"
                      onClick={handleAddToCart}
                      disabled={isAddToCartDisabled}
                    >
                      {isOutOfStock
                        ? t(
                            currentLanguage,
                            "merchPage.productDetail.outOfStock",
                          ) || "Out of Stock"
                        : !hasAvailableSizes || !hasValidSizeSelection
                          ? t(
                              currentLanguage,
                              "merchPage.productDetail.noSizeAvailable",
                            ) || "No size available"
                          : t(
                              currentLanguage,
                              "merchPage.productDetail.addToCart",
                            )}
                    </Button>
                    <Button
                      className="w-full h-14 text-lg font-semibold rounded-sm bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                      onClick={handleBuyNow}
                      disabled={isAddToCartDisabled}
                    >
                      {t(currentLanguage, "merchPage.productDetail.buyNow") ||
                        "Buy now"}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  return <ProductDetail product={product} />;
}
