"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

import type { NewsPost } from "@/lib/types/news";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

interface NewsContentProps {
  posts: NewsPost[];
}

export default function NewsContent({ posts }: NewsContentProps) {
  const { currentLanguage } = useTranslation();

  // Get featured stories (first 4) and all other stories
  const featuredPosts = posts.slice(0, 4);
  const remainingPosts = posts.slice(4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-0 max-w-7xl">
        {/* Hero Section */}
        <div className="relative pt-24 md:pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6">
              {t(currentLanguage, "newsPage.title")}
            </h1>
            <div className="text-muted-foreground text-lg mt-4 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t(currentLanguage, "newsPage.description")}
            </div>
          </div>
        </div>

        {/* Featured News */}
        {featuredPosts.length > 0 && (
          <section className="pb-20">
            {/* Featured Article */}
            <div className="mb-20">
              <Link href={`/blog/${featuredPosts[0].slug.current}`}>
                <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-2xl hover:shadow-3xl transition-all duration-700 bg-card/95 backdrop-blur-sm border border-border/50 hover:border-primary/20 transform hover:-translate-y-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Image Section */}
                    <div className="relative h-80 lg:h-96 overflow-hidden rounded-l-sm">
                      <Image
                        src={
                          featuredPosts[0].mainImage?.asset?.url ||
                          "/placeholder.webp"
                        }
                        alt={
                          featuredPosts[0].mainImage?.alt ||
                          featuredPosts[0].title
                        }
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        quality={95}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50" />
                      <div className="absolute top-6 left-6">
                        <span className="px-4 py-2 text-xs font-semibold bg-blue-900 text-blue-100 rounded-sm shadow-lg">
                          Featured
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="space-y-6">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span className="font-medium">
                            {format(
                              new Date(featuredPosts[0].publishedAt),
                              "MMMM d, yyyy",
                            )}
                          </span>
                        </div>

                        <h3 className="text-3xl lg:text-4xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {featuredPosts[0].title}
                        </h3>

                        <p className="text-muted-foreground text-lg leading-relaxed line-clamp-3">
                          {featuredPosts[0].excerpt}
                        </p>

                        <div className="flex justify-end pt-8">
                          <div className="flex items-center gap-3 text-primary font-semibold group-hover:gap-4 transition-all duration-300">
                            <span>Read Story</span>
                            <span className="text-xl group-hover:translate-x-2 transition-transform">
                              →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </div>

            {/* Other Featured Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.slice(1, 4).map((post: NewsPost) => (
                <Link key={post._id} href={`/blog/${post.slug.current}`}>
                  <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-lg hover:shadow-xl transition-all duration-500 bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transform hover:-translate-y-1">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-sm">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 text-xs bg-blue-900 text-blue-100 rounded-sm shadow-md">
                          News
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                      </div>

                      <h4 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {post.title}
                      </h4>

                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-2 text-primary font-semibold text-sm pt-2">
                        <span>Read More</span>
                        <span className="group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All News Articles */}
        {remainingPosts.length > 0 && (
          <section className="pb-24">
            {/* Section Header */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-4 mb-6">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-primary"></div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {t(currentLanguage, "newsPage.moreNews")}
                </h2>
                <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-primary"></div>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Stay updated with our latest stories and announcements
              </p>
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remainingPosts.map((post: NewsPost) => (
                <Link key={post._id} href={`/blog/${post.slug.current}`}>
                  <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-md hover:shadow-lg transition-all duration-500 bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/20 h-full flex flex-col transform hover:-translate-y-1">
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-sm">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow space-y-4">
                      {/* Date and Category */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                        <span className="px-3 py-1 text-xs bg-blue-900 text-blue-100 rounded-sm font-medium">
                          News
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-grow">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 flex-grow">
                        {post.excerpt}
                      </p>

                      {/* Read More */}
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm pt-4 border-t border-border/50">
                        <span>Read Article</span>
                        <span className="group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
