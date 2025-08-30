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
        <div className="relative pt-24 md:pt-32 -mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6">
            {t(currentLanguage, "newsPage.title")}
          </h1>
          <div className="text-muted-foreground text-sm mt-1 mb-1 max-w-2xl">
            {t(currentLanguage, "newsPage.description")}
          </div>
        </div>

        {/* Featured News */}
        {featuredPosts.length > 0 && (
          <section className="py-16 md:py-20 -mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Featured Article */}
              <div className="lg:col-span-3">
                <Link href={`/news/${featuredPosts[0].slug.current}`}>
                  <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
                    <div className="relative h-96 md:h-[36rem] overflow-hidden">
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
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-baseline gap-4">
                        <h3 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white group-hover:text-primary transition-colors flex-1">
                          {featuredPosts[0].title}
                        </h3>

                        <div className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors -translate-y-1 group-hover:translate-x-1 transform duration-300 shrink-0">
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>

              {/* Other Featured Articles */}
              {featuredPosts.slice(1, 4).map((post: NewsPost) => (
                <Link key={post._id} href={`/news/${post.slug.current}`}>
                  <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        quality={90}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                          News
                        </span>
                      </div>

                      <h4 className="font-semibold mb-2 text-zinc-900 dark:text-white group-hover:text-primary transition-colors overflow-hidden">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                          {post.title}
                        </span>
                      </h4>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 overflow-hidden">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                          {post.excerpt}
                        </span>
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                        <div className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                          {t(currentLanguage, "newsPage.readMore")}
                        </div>
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
          <section className="py-16 md:py-20 mb-20">
            {/* Header with accent line */}
            <div className="flex items-center mb-12">
              <div className="w-8 h-0.5 bg-primary mr-4"></div>
              <h2 className="text-primary text-lg font-medium tracking-wide">
                {t(currentLanguage, "newsPage.moreNews")}
              </h2>
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {remainingPosts.map((post: NewsPost) => (
                <Link key={post._id} href={`/news/${post.slug.current}`}>
                  <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800 h-full">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <Image
                        src={post.mainImage?.asset?.url || "/placeholder.webp"}
                        alt={post.mainImage?.alt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        quality={90}
                      />
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex-grow flex flex-col">
                        <div className="flex items-center mb-1">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {format(new Date(post.publishedAt), "MMM d, yyyy")}
                          </p>
                        </div>

                        <h3 className="font-semibold text-lg mb-3 leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors min-h-fit">
                          {post.title}
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 overflow-hidden">
                          <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                            {post.excerpt}
                          </span>
                        </p>
                      </div>
                      <div className="mt-auto flex flex-row justify-between items-center">
                        <span className="px-2 py-1 text-xs font-normal rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          News
                        </span>

                        <div className="flex items-center text-primary text-sm font-normal">
                          {t(currentLanguage, "newsPage.readMore")}
                        </div>
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
