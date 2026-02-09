"use client";

import { motion } from "framer-motion";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { ProductListContent } from "@/components/merch/product-list-content";
import { ProductGrid } from "@/components/merch/product-grid";
import { ProductCardSkeleton } from "@/components/merch/product-card-skeleton";
import { Suspense, useState, useMemo } from "react";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { SanityProduct } from "@/components/merch/types";

interface MerchContentClientProps {
  products: SanityProduct[];
}

export default function MerchContentClient({
  products,
}: MerchContentClientProps) {
  const { currentLanguage } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Handle search query - check product name and description
      const productName = product.name?.toLowerCase() || "";
      const productDescription =
        typeof product.description === "string"
          ? product.description.toLowerCase()
          : "";
      const trimmedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !trimmedSearch ||
        productName.includes(trimmedSearch) ||
        productDescription.includes(trimmedSearch);

      // Handle category filter
      const matchesCategory =
        selectedCategory === "all" ||
        product.categories?.some((cat) => cat.slug === selectedCategory);

      // Handle tag filter
      const matchesTag =
        selectedTag === "all" ||
        product.tags?.some((tag) => tag?.toLowerCase() === selectedTag);

      return matchesSearch && matchesCategory && matchesTag;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedTag]);

  // Get unique categories and tags from products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((product) => {
      product.categories?.forEach((cat) => {
        if (cat.slug && typeof cat.slug === "string") {
          cats.add(cat.slug);
        }
      });
    });
    return Array.from(cats).sort();
  }, [products]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((product) => {
      product.tags?.forEach((tag) => {
        if (tag && typeof tag === "string") {
          tags.add(tag.toLowerCase());
        }
      });
    });
    return Array.from(tags).sort();
  }, [products]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <div className="container mx-auto px-4 py-0 max-w-7xl">
          {/* Hero Section */}
          <div className="relative pt-24 md:pt-32 mb-12">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6">
                {t(currentLanguage, "merchPage.title")}
              </h1>
              <div className="text-muted-foreground text-lg mt-4 mb-8 max-w-3xl mx-auto leading-relaxed">
                {t(currentLanguage, "merchPage.subtitle")}
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="mb-6 text-center">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 flex-wrap">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.trim())}
                    className="pl-10 rounded-sm bg-background h-10 border border-border"
                  />
                </div>

                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full sm:w-48 rounded-sm bg-background h-10 border border-border">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Categories</SelectItem>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-full sm:w-48 rounded-sm bg-background h-10 border border-border">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tags</SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Products Section */}
          {filteredAndSortedProducts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Suspense
                fallback={
                  <ProductGrid>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <ProductCardSkeleton key={index} />
                    ))}
                  </ProductGrid>
                }
              >
                <ProductListContent products={filteredAndSortedProducts} />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-20 bg-muted/30 rounded-sm p-8 mb-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-white">
                {searchQuery ||
                  selectedCategory !== "all" ||
                  selectedTag !== "all"
                  ? "No products found"
                  : t(currentLanguage, "merchPage.comingSoon.title")}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {searchQuery ||
                  selectedCategory !== "all" ||
                  selectedTag !== "all"
                  ? "Try adjusting your filters or search terms."
                  : t(currentLanguage, "merchPage.comingSoon.description")}
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
