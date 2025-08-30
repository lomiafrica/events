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
    <div className="min-h-screen">
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
            <div className="mb-16">
              <Link href={`/news/${featuredPosts[0].slug.current}`}>
                <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Image Section */}
                    <div className="relative h-80 lg:h-96 overflow-hidden">
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
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/40" />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 text-xs font-medium bg-blue-900 text-blue-100 rounded-sm">
                          Featured
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 lg:p-10 flex flex-col justify-center">
                      <div className="space-y-4">
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                          <span>
                            {format(
                              new Date(featuredPosts[0].publishedAt),
                              "MMMM d, yyyy",
                            )}
                          </span>
                        </div>

                        <h3 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white group-hover:text-primary transition-colors leading-tight">
                          {featuredPosts[0].title}
                        </h3>

                        <p className="text-zinc-600 dark:text-zinc-300 text-base leading-relaxed">
                          {featuredPosts[0].excerpt}
                        </p>

                        <div className="flex justify-end mt-32">
                          <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-4 transition-all duration-300">
                            <span>Read Full Story</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredPosts.slice(1, 4).map((post: NewsPost) => (
                <Link key={post._id} href={`/news/${post.slug.current}`}>
                  <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-lg hover:shadow-xl transition-all duration-500 bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-sm">
                          News
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(post.publishedAt), "MMM d")}
                        </span>
                      </div>

                      <h4 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {post.title}
                      </h4>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-2 text-primary font-medium text-sm">
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
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-0.5 bg-primary"></div>
                <h2 className="text-primary text-xl font-semibold tracking-wide">
                  {t(currentLanguage, "newsPage.moreNews")}
                </h2>
                <div className="w-12 h-0.5 bg-primary"></div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Stay updated with our latest stories and announcements
              </p>
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remainingPosts.map((post: NewsPost) => (
                <Link key={post._id} href={`/news/${post.slug.current}`}>
                  <article className="group cursor-pointer relative overflow-hidden rounded-sm shadow-md hover:shadow-lg transition-all duration-500 bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 h-full flex flex-col">
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow space-y-4">
                      {/* Date and Category */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                        <span className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-sm">
                          News
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-xl leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2 flex-grow">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-3 flex-grow">
                        {post.excerpt}
                      </p>

                      {/* Read More */}
                      <div className="flex items-center gap-2 text-primary font-medium text-sm pt-2 border-t border-zinc-100 dark:border-zinc-700">
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
